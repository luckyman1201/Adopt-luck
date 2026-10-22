import { db } from "@/lib/db";
import { canJoinValue, flipCoin, pickWeightedWinner, upgradeChance } from "@/lib/game-engine";
import { ensureCatalog } from "@/lib/catalog.server";
import { getCatalog, itemValue, itemsValue, makeItem } from "@/lib/pets";
import { dumpItems, newId, parseItems, playerColor, toItem, toPlayer } from "@/lib/server/helpers";
import type { CoinFlipGame, CoinSide, JackpotGame, PetInstance, RaceGame } from "@/lib/types";
import type { Game, GameEntry, User } from "@prisma/client";

type GameWithBits = Game & { entries: (GameEntry & { user: User })[] };

async function lockItems(userId: string, ids: string[]) {
  await ensureCatalog();
  const rows = await db.inventoryItem.findMany({ where: { id: { in: ids }, userId, locked: false } });
  if (rows.length !== ids.length) throw new Error("Some pets are missing or already in a game");
  await db.inventoryItem.updateMany({ where: { id: { in: ids } }, data: { locked: true } });
  return rows;
}

export function mapCoin(game: GameWithBits): CoinFlipGame {
  const creator = game.entries[0];
  const joiner = game.entries[1];
  return {
    id: game.id,
    createdAt: game.createdAt.getTime(),
    creator: toPlayer(creator.user),
    creatorSide: (creator.side as CoinSide) || "heads",
    creatorItems: parseItems(creator.itemsJson),
    joiner: joiner ? toPlayer(joiner.user) : undefined,
    joinerItems: joiner ? parseItems(joiner.itemsJson) : undefined,
    status: game.status as CoinFlipGame["status"],
    result: (game.result as CoinSide) || undefined,
    winnerId: game.winnerId || undefined,
  };
}

export function mapPot(game: GameWithBits): JackpotGame {
  return {
    id: game.id,
    createdAt: game.createdAt.getTime(),
    status: game.status as JackpotGame["status"],
    winnerId: game.winnerId || undefined,
    entries: game.entries.map((entry) => ({
      player: toPlayer(entry.user),
      items: parseItems(entry.itemsJson),
      color: entry.color || playerColor(entry.user),
    })),
  };
}

export function mapRace(game: GameWithBits): RaceGame {
  return {
    id: game.id,
    createdAt: game.createdAt.getTime(),
    status: game.status as RaceGame["status"],
    winnerId: game.winnerId || undefined,
    entries: game.entries.map((entry) => ({
      player: toPlayer(entry.user),
      items: parseItems(entry.itemsJson),
      color: entry.color || playerColor(entry.user),
    })),
  };
}

async function loadGame(id: string) {
  const game = await db.game.findUnique({
    where: { id },
    include: { entries: { include: { user: true }, orderBy: { createdAt: "asc" } } },
  });
  if (!game) throw new Error("Game not found");
  return game;
}

export async function settleStaleGames() {
  const cutoff = new Date(Date.now() - 8000);
  const stale = await db.game.findMany({
    where: { status: { in: ["flipping", "spinning", "racing"] }, updatedAt: { lt: cutoff } },
    select: { id: true, mode: true },
  });
  for (const game of stale) {
    try {
      if (game.mode === "coinflip") await finishCoin(game.id);
      else await finishPot(game.id);
    } catch {
      // leave the row for the next pass
    }
  }
}

export async function listGames() {
  await settleStaleGames();
  const games = await db.game.findMany({
    include: { entries: { include: { user: true }, orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  return {
    coins: games.filter((game) => game.mode === "coinflip").map(mapCoin),
    jackpots: games.filter((game) => game.mode === "jackpot").map(mapPot),
    races: games.filter((game) => game.mode === "race").map(mapRace),
  };
}

export async function createCoin(userId: string, itemIds: string[], side: CoinSide) {
  const rows = await lockItems(userId, itemIds);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const game = await db.game.create({
    data: {
      id: newId("cf"),
      mode: "coinflip",
      status: "open",
      entries: {
        create: {
          id: newId("ge"),
          userId,
          itemsJson: dumpItems(rows.map(toItem)),
          side,
        },
      },
    },
    include: { entries: { include: { user: true } } },
  });
  game.entries[0].user = user;
  return mapCoin(game);
}

export async function joinCoin(userId: string, gameId: string, itemIds: string[]) {
  const game = await loadGame(gameId);
  if (game.mode !== "coinflip" || game.status !== "open") throw new Error("This CoinFlip is not open");
  if (game.entries.some((entry) => entry.userId === userId)) throw new Error("You are already in this game");
  const hostItems = parseItems(game.entries[0].itemsJson);
  const rows = await lockItems(userId, itemIds);
  const guestItems = rows.map(toItem);
  if (!canJoinValue(itemsValue(hostItems), itemsValue(guestItems))) {
    await db.inventoryItem.updateMany({ where: { id: { in: itemIds } }, data: { locked: false } });
    throw new Error("Value must be within 12% of the host");
  }
  const result = flipCoin();
  const host = game.entries[0];
  const hostSide = (host.side as CoinSide) || "heads";
  const winnerId = result === hostSide ? host.userId : userId;
  await db.$transaction([
    db.gameEntry.create({
      data: { id: newId("ge"), gameId, userId, itemsJson: dumpItems(guestItems) },
    }),
    db.game.update({ where: { id: gameId }, data: { status: "flipping", result, winnerId } }),
  ]);
  return mapCoin(await loadGame(gameId));
}

function pickMatchingStake(target: number): PetInstance {
  const flags = [
    {},
    { ride: true },
    { fly: true },
    { fly: true, ride: true },
  ] as const;
  let best = makeItem("dragon");
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const pet of getCatalog()) {
    for (const flag of flags) {
      const item = makeItem(pet.id, flag);
      const diff = Math.abs(itemValue(item) - target);
      if (diff < bestDiff) {
        best = item;
        bestDiff = diff;
      }
    }
  }
  return best;
}

export async function botJoinCoin(gameId: string) {
  await ensureCatalog();
  const game = await loadGame(gameId);
  if (game.mode !== "coinflip" || game.status !== "open") throw new Error("This CoinFlip is not open");
  const host = game.entries[0];
  const bot = await db.user.findFirst({
    where: { isBot: true, id: { not: host.userId } },
    orderBy: { name: "asc" },
  });
  if (!bot) throw new Error("No opponent is available");
  const target = itemsValue(parseItems(host.itemsJson));
  const stake = pickMatchingStake(target);
  if (!canJoinValue(target, itemValue(stake))) {
    throw new Error("Could not match this table's value");
  }
  await db.inventoryItem.create({
    data: {
      id: stake.uid,
      userId: bot.id,
      petId: stake.petId,
      fly: stake.fly,
      ride: stake.ride,
      neon: stake.neon,
      mega: stake.mega,
      locked: false,
    },
  });
  try {
    return await joinCoin(bot.id, gameId, [stake.uid]);
  } catch (error) {
    await db.inventoryItem.deleteMany({ where: { id: stake.uid } });
    throw error;
  }
}

export async function finishCoin(gameId: string) {
  const game = await loadGame(gameId);
  if (game.mode !== "coinflip") throw new Error("Not a CoinFlip");
  if (game.status === "done") return mapCoin(game);
  if (game.status !== "flipping" || game.entries.length < 2) throw new Error("This CoinFlip is not ready to settle");
  const host = game.entries[0];
  const guest = game.entries[1];
  const result = (game.result as CoinSide) || flipCoin();
  const winnerId = game.winnerId || (result === (host.side as CoinSide) ? host.userId : guest.userId);
  const hostItems = parseItems(host.itemsJson);
  const guestItems = parseItems(guest.itemsJson);
  const potItems = [...hostItems, ...guestItems];
  const pot = itemsValue(potItems);
  const hostWon = winnerId === host.userId;
  const hostStake = itemsValue(hostItems);
  const guestStake = itemsValue(guestItems);
  await db.$transaction(async (tx) => {
    await tx.game.update({ where: { id: gameId }, data: { status: "done", result, winnerId } });
    await tx.inventoryItem.deleteMany({ where: { id: { in: potItems.map((item) => item.uid) } } });
    await tx.inventoryItem.createMany({
      data: potItems.map((item) => ({
        id: newId("inv"),
        userId: winnerId,
        petId: item.petId,
        fly: item.fly,
        ride: item.ride,
        neon: item.neon,
        mega: item.mega,
      })),
    });
    await tx.user.update({
      where: { id: host.userId },
      data: {
        wagered: { increment: hostStake },
        profit: { increment: hostWon ? guestStake : -hostStake },
        wins: { increment: hostWon ? 1 : 0 },
        games: { increment: 1 },
      },
    });
    await tx.user.update({
      where: { id: guest.userId },
      data: {
        wagered: { increment: guestStake },
        profit: { increment: hostWon ? -guestStake : hostStake },
        wins: { increment: hostWon ? 0 : 1 },
        games: { increment: 1 },
      },
    });
    await tx.historyItem.create({
      data: {
        id: newId("hx"),
        userId: host.userId,
        mode: "coinflip",
        title: `CoinFlip ${result.toUpperCase()}`,
        value: pot,
        won: hostWon,
        detail: hostWon ? "Won the flip" : "Lost the flip",
      },
    });
    await tx.historyItem.create({
      data: {
        id: newId("hx"),
        userId: guest.userId,
        mode: "coinflip",
        title: `CoinFlip ${result.toUpperCase()}`,
        value: pot,
        won: !hostWon,
        detail: hostWon ? "Lost the flip" : "Won the flip",
      },
    });
  });
  return mapCoin(await loadGame(gameId));
}

export async function createPot(userId: string, itemIds: string[], mode: "jackpot" | "race") {
  const rows = await lockItems(userId, itemIds);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const game = await db.game.create({
    data: {
      id: newId(mode === "jackpot" ? "jp" : "rc"),
      mode,
      status: "open",
      entries: {
        create: {
          id: newId("ge"),
          userId,
          itemsJson: dumpItems(rows.map(toItem)),
          color: playerColor(user),
        },
      },
    },
    include: { entries: { include: { user: true } } },
  });
  return mode === "jackpot" ? mapPot(game) : mapRace(game);
}

export async function joinPot(userId: string, gameId: string, itemIds: string[]) {
  const game = await loadGame(gameId);
  if (game.status !== "open") throw new Error("This lobby is not open");
  if (game.entries.some((entry) => entry.userId === userId)) throw new Error("You are already in this lobby");
  const max = game.mode === "race" ? 6 : 8;
  if (game.entries.length >= max) throw new Error("Lobby is full");
  const rows = await lockItems(userId, itemIds);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  await db.gameEntry.create({
    data: {
      id: newId("ge"),
      gameId,
      userId,
      itemsJson: dumpItems(rows.map(toItem)),
      color: playerColor(user),
    },
  });
  return game.mode === "jackpot" ? mapPot(await loadGame(gameId)) : mapRace(await loadGame(gameId));
}

export async function resolvePot(gameId: string, nextStatus: "spinning" | "racing") {
  const game = await loadGame(gameId);
  if (game.status !== "open") throw new Error("Lobby is not open");
  if (game.entries.length < 2) throw new Error("Need at least two players");
  const entries = game.entries.map((entry) => ({
    player: toPlayer(entry.user),
    items: parseItems(entry.itemsJson),
    color: entry.color || playerColor(entry.user),
  }));
  const { winner } = pickWeightedWinner(entries);
  await db.game.update({ where: { id: gameId }, data: { status: nextStatus, winnerId: winner.player.id } });
  return game.mode === "jackpot" ? mapPot(await loadGame(gameId)) : mapRace(await loadGame(gameId));
}

export async function finishPot(gameId: string) {
  const game = await loadGame(gameId);
  if (game.status === "done") return game.mode === "jackpot" ? mapPot(game) : mapRace(game);
  if (game.status !== "spinning" && game.status !== "racing") throw new Error("This lobby is not ready to settle");
  if (game.entries.length < 2) throw new Error("Need at least two players");
  const entries = game.entries.map((entry) => ({
    player: toPlayer(entry.user),
    items: parseItems(entry.itemsJson),
    color: entry.color || playerColor(entry.user),
  }));
  const winner =
    entries.find((entry) => entry.player.id === game.winnerId) || pickWeightedWinner(entries).winner;
  const potItems = entries.flatMap((entry) => entry.items);
  const pot = itemsValue(potItems);
  await db.$transaction(async (tx) => {
    await tx.game.update({ where: { id: gameId }, data: { status: "done", winnerId: winner.player.id } });
    await tx.inventoryItem.deleteMany({ where: { id: { in: potItems.map((item) => item.uid) } } });
    await tx.inventoryItem.createMany({
      data: potItems.map((item) => ({
        id: newId("inv"),
        userId: winner.player.id,
        petId: item.petId,
        fly: item.fly,
        ride: item.ride,
        neon: item.neon,
        mega: item.mega,
      })),
    });
    for (const entry of entries) {
      const stake = itemsValue(entry.items);
      const won = entry.player.id === winner.player.id;
      await tx.user.update({
        where: { id: entry.player.id },
        data: {
          wagered: { increment: stake },
          profit: { increment: won ? pot - stake : -stake },
          wins: { increment: won ? 1 : 0 },
          games: { increment: 1 },
        },
      });
      await tx.historyItem.create({
        data: {
          id: newId("hx"),
          userId: entry.player.id,
          mode: game.mode,
          title: game.mode === "jackpot" ? "Jackpot" : "Race",
          value: pot,
          won,
          detail: won ? "Won the pot" : `${winner.player.name} won`,
        },
      });
    }
  });
  return game.mode === "jackpot" ? mapPot(await loadGame(gameId)) : mapRace(await loadGame(gameId));
}

export async function rollUpgrade(userId: string, itemIds: string[], target: PetInstance) {
  const rows = await lockItems(userId, itemIds);
  const stakeItems = rows.map(toItem);
  const stake = itemsValue(stakeItems);
  const targetValue = itemsValue([target]);
  const chance = upgradeChance(stake, targetValue);
  const roll = Number((Math.random() * 100).toFixed(2));
  const won = roll <= chance;
  await db.$transaction(async (tx) => {
    await tx.inventoryItem.deleteMany({ where: { id: { in: itemIds } } });
    if (won) {
      await tx.inventoryItem.create({
        data: {
          id: newId("inv"),
          userId,
          petId: target.petId,
          fly: target.fly,
          ride: target.ride,
          neon: target.neon,
          mega: target.mega,
        },
      });
    }
    await tx.user.update({
      where: { id: userId },
      data: {
        wagered: { increment: stake },
        profit: { increment: won ? targetValue - stake : -stake },
        wins: { increment: won ? 1 : 0 },
        games: { increment: 1 },
      },
    });
    await tx.historyItem.create({
      data: {
        id: newId("hx"),
        userId,
        mode: "upgrader",
        title: "Upgrader",
        value: won ? targetValue : stake,
        won,
        detail: won ? "Upgrade hit" : `Rolled ${roll} / ${chance.toFixed(2)}`,
      },
    });
    await tx.game.create({
      data: {
        id: newId("up"),
        mode: "upgrade",
        status: "done",
        result: won ? "win" : "lose",
        winnerId: won ? userId : null,
        entries: {
          create: { id: newId("ge"), userId, itemsJson: dumpItems(stakeItems) },
        },
      },
    });
  });
  return { chance, roll, won };
}

export async function listHistory(userId: string) {
  const rows = await db.historyItem.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 40 });
  return rows.map((row) => ({
    id: row.id,
    at: row.createdAt.getTime(),
    mode: row.mode as "coinflip" | "jackpot" | "upgrader" | "race",
    title: row.title,
    value: row.value,
    won: row.won,
    detail: row.detail,
  }));
}

export async function listChat() {
  const rows = await db.chatMessage.findMany({
    include: { user: true },
    orderBy: { createdAt: "asc" },
    take: 80,
  });
  return rows.map((row) => ({
    id: row.id,
    at: row.createdAt.getTime(),
    player: toPlayer(row.user),
    text: row.text,
  }));
}

export async function sendChat(userId: string, text: string) {
  const clean = text.trim().slice(0, 160);
  if (!clean) throw new Error("Message is empty");
  await db.chatMessage.create({ data: { id: newId("msg"), userId, text: clean } });
  return listChat();
}

export async function leaderboard() {
  const users = await db.user.findMany({ orderBy: { profit: "desc" }, take: 30 });
  return Object.fromEntries(
    users.map((user) => [
      user.id,
      { player: toPlayer(user), wagered: user.wagered, profit: user.profit, wins: user.wins, games: user.games },
    ]),
  );
}
