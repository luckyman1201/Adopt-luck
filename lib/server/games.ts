import { db } from "@/lib/db";
import { canJoinValue, flipCoin, pickWeightedWinner, upgradeChance } from "@/lib/game-engine";
import { ensureCatalog } from "@/lib/catalog.server";
import { getCatalog, itemValue, itemsValue, makeItem } from "@/lib/pets";
import { samePlayer } from "@/lib/player";
import { dumpItems, newId, parseItems, playerColor, toItem, toPlayer } from "@/lib/server/helpers";
import { absorbUsers, mergeTwinUsers } from "@/lib/server/users";
import type { CoinFlipGame, CoinSide, JackpotGame, PetInstance, RaceGame, UpgradeRoll } from "@/lib/types";
import type { Game, GameEntry, Prisma, User } from "@prisma/client";

type Tx = Prisma.TransactionClient | typeof db;

type GameWithBits = Game & { entries: (GameEntry & { user: User })[] };

function sameSeat(
  entryUser: Pick<User, "id" | "robloxId" | "name" | "isBot">,
  user: Pick<User, "id" | "robloxId" | "name" | "isBot">,
) {
  return samePlayer(entryUser, user);
}

function seatedEntry(game: GameWithBits, user: Pick<User, "id" | "robloxId" | "name" | "isBot">) {
  return game.entries.find((entry) => sameSeat(entry.user, user));
}

function seatGroups(entries: GameWithBits["entries"]) {
  const groups: GameWithBits["entries"][] = [];
  for (const entry of entries) {
    const found = groups.find((group) => group.some((row) => sameSeat(row.user, entry.user)));
    if (found) found.push(entry);
    else groups.push([entry]);
  }
  return groups;
}

async function repairDuplicateSeats(game: GameWithBits) {
  let changed = false;
  for (const group of seatGroups(game.entries)) {
    if (group.length < 2) continue;
    const users = [...new Map(group.map((entry) => [entry.user.id, entry.user])).values()];
    const keepUser = users.find((user) => user.robloxId) || users[0];
    const twinIds = users.filter((user) => user.id !== keepUser.id).map((user) => user.id);
    if (twinIds.length) {
      await absorbUsers(keepUser.id, twinIds);
      changed = true;
    }
    const keep = group.find((entry) => entry.userId === keepUser.id) || group[0];
    const extras = group.filter((entry) => entry.id !== keep.id);
    const items = group.flatMap((entry) => parseItems(entry.itemsJson));
    await db.gameEntry.update({
      where: { id: keep.id },
      data: { itemsJson: dumpItems(items), userId: keepUser.id },
    });
    if (extras.length) {
      await db.gameEntry.deleteMany({ where: { id: { in: extras.map((entry) => entry.id) } } });
    }
    changed = true;
  }
  return changed;
}

async function lockItems(userId: string, ids: string[], tx: Tx = db) {
  await ensureCatalog();
  const unique = [...new Set(ids)];
  if (!unique.length) throw new Error("Select pets");
  if (unique.length !== ids.length) throw new Error("The same pet cannot be used twice");
  const updated = await tx.inventoryItem.updateMany({
    where: { id: { in: unique }, userId, locked: false },
    data: { locked: true },
  });
  if (updated.count !== unique.length) throw new Error("Some pets are missing or already in a game");
  return tx.inventoryItem.findMany({ where: { id: { in: unique }, userId } });
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

function uniqueEntries(game: GameWithBits) {
  return seatGroups(game.entries).map((group) => {
    const keep = { ...group[0], itemsJson: dumpItems(group.flatMap((entry) => parseItems(entry.itemsJson))) };
    return keep;
  });
}

export function mapPot(game: GameWithBits): JackpotGame {
  return {
    id: game.id,
    createdAt: game.createdAt.getTime(),
    status: game.status as JackpotGame["status"],
    winnerId: game.winnerId || undefined,
    entries: uniqueEntries(game).map((entry) => ({
      player: toPlayer(entry.user),
      items: parseItems(entry.itemsJson),
      color: entry.color || playerColor(entry.user),
    })),
  };
}

function parseUpgradeTarget(side: string | null): PetInstance | null {
  if (!side) return null;
  try {
    const parsed = JSON.parse(side) as PetInstance | PetInstance[];
    const target = Array.isArray(parsed) ? parsed[0] : parsed;
    return target?.petId ? target : null;
  } catch {
    return null;
  }
}

export function mapUpgrade(game: GameWithBits): UpgradeRoll | null {
  const entry = game.entries[0];
  if (!entry) return null;
  const target = parseUpgradeTarget(entry.side);
  if (!target) return null;
  return {
    id: game.id,
    at: game.createdAt.getTime(),
    player: toPlayer(entry.user),
    stakeItems: parseItems(entry.itemsJson),
    target,
    chance: 0,
    roll: 0,
    won: game.result === "win",
  };
}

export async function listLiveUpgrades() {
  const games = await db.game.findMany({
    where: { mode: "upgrade", result: "win" },
    include: { entries: { include: { user: true }, orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 16,
  });
  return games.map(mapUpgrade).filter((row): row is UpgradeRoll => Boolean(row));
}

export function mapRace(game: GameWithBits): RaceGame {
  return {
    id: game.id,
    createdAt: game.createdAt.getTime(),
    status: game.status as RaceGame["status"],
    winnerId: game.winnerId || undefined,
    entries: uniqueEntries(game).map((entry) => ({
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
  const merged = await mergeTwinUsers(game.entries.map((entry) => entry.user));
  const latest = merged
    ? await db.game.findUnique({
        where: { id },
        include: { entries: { include: { user: true }, orderBy: { createdAt: "asc" } } },
      })
    : game;
  if (!latest) throw new Error("Game not found");
  if (await repairDuplicateSeats(latest)) {
    return loadGame(id);
  }
  return latest;
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
    where: { mode: { in: ["coinflip", "jackpot", "race"] } },
    include: { entries: { include: { user: true }, orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  const merged = await mergeTwinUsers(games.flatMap((game) => game.entries.map((entry) => entry.user)));
  for (const game of games) {
    if (merged) {
      const latest = await db.game.findUnique({
        where: { id: game.id },
        include: { entries: { include: { user: true }, orderBy: { createdAt: "asc" } } },
      });
      if (latest) Object.assign(game, latest);
    }
    if (await repairDuplicateSeats(game)) {
      const fresh = await db.game.findUnique({
        where: { id: game.id },
        include: { entries: { include: { user: true }, orderBy: { createdAt: "asc" } } },
      });
      if (fresh) Object.assign(game, fresh);
    }
  }
  return {
    coins: games.filter((game) => game.mode === "coinflip").map(mapCoin),
    jackpots: games.filter((game) => game.mode === "jackpot").map(mapPot),
    races: games.filter((game) => game.mode === "race").map(mapRace),
  };
}

export async function createCoin(userId: string, itemIds: string[], side: CoinSide) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const game = await db.$transaction(async (tx) => {
    const rows = await lockItems(userId, itemIds, tx);
    return tx.game.create({
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
  });
  game.entries[0].user = user;
  return mapCoin(game);
}

export async function joinCoin(userId: string, gameId: string, itemIds: string[]) {
  await loadGame(gameId);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  await db.$transaction(async (tx) => {
    const game = await tx.game.findUnique({
      where: { id: gameId },
      include: { entries: { include: { user: true }, orderBy: { createdAt: "asc" } } },
    });
    if (!game || game.mode !== "coinflip" || game.status !== "open") throw new Error("This CoinFlip is not open");
    if (seatedEntry(game, user)) throw new Error("You are already in this game");
    const hostItems = parseItems(game.entries[0].itemsJson);
    const rows = await lockItems(userId, itemIds, tx);
    const guestItems = rows.map(toItem);
    if (!canJoinValue(itemsValue(hostItems), itemsValue(guestItems))) {
      throw new Error("Value must be within 12% of the host");
    }
    const result = flipCoin();
    const host = game.entries[0];
    const hostSide = (host.side as CoinSide) || "heads";
    const winnerId = result === hostSide ? host.userId : userId;
    await tx.gameEntry.create({
      data: { id: newId("ge"), gameId, userId, itemsJson: dumpItems(guestItems) },
    });
    await tx.game.update({ where: { id: gameId }, data: { status: "flipping", result, winnerId } });
  });
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

async function assertFreeForLobby(user: User, mode: "jackpot" | "race", tx: Tx = db) {
  const open = await tx.game.findMany({
    where: { mode, status: "open" },
    include: { entries: { include: { user: true } } },
  });
  if (open.some((game) => seatedEntry(game, user))) {
    throw new Error(mode === "jackpot" ? "You are already in this jackpot" : "You are already in this race");
  }
}

export async function createPot(userId: string, itemIds: string[], mode: "jackpot" | "race") {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const game = await db.$transaction(async (tx) => {
    await assertFreeForLobby(user, mode, tx);
    const rows = await lockItems(userId, itemIds, tx);
    return tx.game.create({
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
  });
  return mode === "jackpot" ? mapPot(game) : mapRace(game);
}

export async function joinPot(userId: string, gameId: string, itemIds: string[]) {
  await loadGame(gameId);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const mode = await db.$transaction(async (tx) => {
    const game = await tx.game.findUnique({
      where: { id: gameId },
      include: { entries: { include: { user: true }, orderBy: { createdAt: "asc" } } },
    });
    if (!game) throw new Error("Game not found");
    if (game.status !== "open") throw new Error("This lobby is not open");
    if (seatedEntry(game, user)) throw new Error("You are already in this lobby");
    await assertFreeForLobby(user, game.mode === "race" ? "race" : "jackpot", tx);
    const max = game.mode === "race" ? 6 : 8;
    if (game.entries.length >= max) throw new Error("Lobby is full");
    const rows = await lockItems(userId, itemIds, tx);
    await tx.gameEntry.create({
      data: {
        id: newId("ge"),
        gameId,
        userId,
        itemsJson: dumpItems(rows.map(toItem)),
        color: playerColor(user),
      },
    });
    return game.mode;
  });
  return mode === "jackpot" ? mapPot(await loadGame(gameId)) : mapRace(await loadGame(gameId));
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
  const gameId = newId("up");
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
        id: gameId,
        mode: "upgrade",
        status: "done",
        result: won ? "win" : "lose",
        winnerId: won ? userId : null,
        entries: {
          create: { id: newId("ge"), userId, itemsJson: dumpItems(stakeItems), side: JSON.stringify(target) },
        },
      },
    });
  });
  const created = await db.game.findUnique({
    where: { id: gameId },
    include: { entries: { include: { user: true }, orderBy: { createdAt: "asc" } } },
  });
  const upgrade = created ? mapUpgrade(created) : null;
  return { chance, roll, won, upgrade: upgrade ? { ...upgrade, chance, roll, won } : null };
}

export async function cancelGame(userId: string, gameId: string) {
  const game = await loadGame(gameId);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  if (game.status !== "open") throw new Error("This game can no longer be cancelled");
  const creator = game.entries[0];
  const isCreator = Boolean(creator && sameSeat(creator.user, user));
  const mine = seatedEntry(game, user) || game.entries.find((entry) => entry.userId === userId);
  if (!mine) throw new Error("You are not in this game");

  if (game.mode === "coinflip") {
    if (!isCreator) throw new Error("Only the creator can cancel this table");
    if (game.entries.length > 1) throw new Error("Someone already joined");
    const ids = parseItems(mine.itemsJson).map((item) => item.uid);
    await db.$transaction([
      db.inventoryItem.updateMany({ where: { id: { in: ids } }, data: { locked: false } }),
      db.game.delete({ where: { id: gameId } }),
    ]);
    return { ok: true, mode: game.mode };
  }

  if (isCreator) {
    const ids = game.entries.flatMap((entry) => parseItems(entry.itemsJson).map((item) => item.uid));
    await db.$transaction([
      db.inventoryItem.updateMany({ where: { id: { in: ids } }, data: { locked: false } }),
      db.game.delete({ where: { id: gameId } }),
    ]);
    return { ok: true, mode: game.mode };
  }

  const mineAll = game.entries.filter((entry) => sameSeat(entry.user, user));
  const ids = mineAll.flatMap((entry) => parseItems(entry.itemsJson).map((item) => item.uid));
  await db.$transaction([
    db.inventoryItem.updateMany({ where: { id: { in: ids } }, data: { locked: false } }),
    db.gameEntry.deleteMany({ where: { id: { in: mineAll.map((entry) => entry.id) } } }),
  ]);
  return { ok: true, mode: game.mode };
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
  const users = await db.user.findMany({ orderBy: { profit: "desc" }, take: 60 });
  const rows: typeof users = [];
  for (const user of users) {
    const existing = rows.find((row) => samePlayer(row, user));
    if (existing) {
      existing.wagered += user.wagered;
      existing.profit += user.profit;
      existing.wins += user.wins;
      existing.games += user.games;
      continue;
    }
    rows.push({ ...user });
  }
  return Object.fromEntries(
    rows.slice(0, 30).map((user) => [
      user.id,
      { player: toPlayer(user), wagered: user.wagered, profit: user.profit, wins: user.wins, games: user.games },
    ]),
  );
}
