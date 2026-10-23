import { db } from "@/lib/db";
import { makeItem } from "@/lib/pets";
import { samePlayer } from "@/lib/player";
import { hueFromRobloxId } from "@/lib/roblox.server";
import { dumpItems, newId, parseItems } from "@/lib/server/helpers";
import type { User } from "@prisma/client";

const STARTER = [
  ["turtle", { fly: true, ride: true }],
  ["flamingo", { ride: true }],
  ["kangaroo", { fly: true }],
  ["unicorn", {}],
  ["dragon", {}],
  ["bee", {}],
] as const;

export async function grantStarter(userId: string) {
  if (process.env.GRANT_STARTER_PETS !== "true") return;
  const owned = await db.inventoryItem.count({ where: { userId } });
  if (owned > 0) return;
  await db.inventoryItem.createMany({
    data: STARTER.map(([petId, flags]) => {
      const item = makeItem(petId, flags);
      return {
        id: item.uid,
        userId,
        petId: item.petId,
        fly: item.fly,
        ride: item.ride,
        neon: item.neon,
        mega: item.mega,
      };
    }),
  });
}

export async function absorbUsers(keepId: string, twinIds: string[]) {
  const extras = [...new Set(twinIds.filter((id) => id && id !== keepId))];
  if (!extras.length) return;

  await db.$transaction(async (tx) => {
    const keep = await tx.user.findUnique({ where: { id: keepId } });
    if (!keep || keep.isBot) return;

    for (const twinId of extras) {
      const twin = await tx.user.findUnique({ where: { id: twinId } });
      if (!twin || twin.isBot) continue;
      if (twin.robloxId && keep.robloxId && twin.robloxId !== keep.robloxId) continue;

      await tx.inventoryItem.updateMany({ where: { userId: twinId }, data: { userId: keepId } });

      const entries = await tx.gameEntry.findMany({ where: { userId: twinId } });
      for (const entry of entries) {
        const existing = await tx.gameEntry.findFirst({
          where: { gameId: entry.gameId, userId: keepId },
        });
        if (existing) {
          const items = [...parseItems(existing.itemsJson), ...parseItems(entry.itemsJson)];
          await tx.gameEntry.update({
            where: { id: existing.id },
            data: { itemsJson: dumpItems(items) },
          });
          await tx.gameEntry.delete({ where: { id: entry.id } });
        } else {
          await tx.gameEntry.update({ where: { id: entry.id }, data: { userId: keepId } });
        }
      }

      await tx.chatMessage.updateMany({ where: { userId: twinId }, data: { userId: keepId } });
      await tx.historyItem.updateMany({ where: { userId: twinId }, data: { userId: keepId } });
      await tx.transaction.updateMany({ where: { userId: twinId }, data: { userId: keepId } });
      await tx.game.updateMany({ where: { winnerId: twinId }, data: { winnerId: keepId } });

      if (!keep.robloxId && twin.robloxId) {
        await tx.user.update({ where: { id: twinId }, data: { robloxId: null } });
        await tx.user.update({
          where: { id: keepId },
          data: {
            robloxId: twin.robloxId,
            avatarUrl: keep.avatarUrl || twin.avatarUrl,
          },
        });
        keep.robloxId = twin.robloxId;
        keep.avatarUrl = keep.avatarUrl || twin.avatarUrl;
      }

      await tx.user.update({
        where: { id: keepId },
        data: {
          wagered: { increment: twin.wagered },
          profit: { increment: twin.profit },
          wins: { increment: twin.wins },
          games: { increment: twin.games },
          avatarUrl: keep.avatarUrl || twin.avatarUrl,
        },
      });
      await tx.user.delete({ where: { id: twinId } });
    }
  });
}

export async function mergeNameTwins(user: User) {
  if (user.isBot) return user;
  const others = await db.user.findMany({
    where: { id: { not: user.id }, isBot: false },
  });
  const twins = others.filter((other) => samePlayer(user, other));
  if (twins.length) await absorbUsers(user.id, twins.map((twin) => twin.id));
  return (await db.user.findUnique({ where: { id: user.id } })) || user;
}

export async function mergeTwinUsers(users: User[]) {
  const seen = new Set<string>();
  let changed = false;
  for (const user of users) {
    if (seen.has(user.id) || user.isBot) continue;
    const twins = users.filter((other) => other.id !== user.id && samePlayer(user, other));
    if (!twins.length) continue;
    const group = [user, ...twins];
    for (const item of group) seen.add(item.id);
    const keep = group.find((item) => item.robloxId) || group[0];
    await absorbUsers(
      keep.id,
      group.filter((item) => item.id !== keep.id).map((item) => item.id),
    );
    changed = true;
  }
  return changed;
}

export async function ensureRobloxUser(account: {
  id: string;
  username: string;
  avatar?: string | null;
}) {
  const staff = (process.env.ROBLOX_STAFF_IDS || process.env.STAFF_ROBLOX_IDS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const hue = hueFromRobloxId(account.id);
  const username = account.username.trim().toLowerCase();
  const [byRoblox, nameless] = await Promise.all([
    db.user.findUnique({ where: { robloxId: account.id } }),
    db.user.findMany({ where: { isBot: false, robloxId: null }, orderBy: { createdAt: "asc" } }),
  ]);
  const matches = [
    ...(byRoblox ? [byRoblox] : []),
    ...nameless.filter((row) => row.name.trim().toLowerCase() === username && row.id !== byRoblox?.id),
  ];

  let user = byRoblox || matches[0];
  if (user) {
    user = await db.user.update({
      where: { id: user.id },
      data: {
        robloxId: account.id,
        name: account.username,
        avatarUrl: account.avatar || user.avatarUrl,
        hue: user.robloxId ? user.hue : hue,
        isStaff: staff.includes(account.id),
      },
    });
  } else {
    try {
      user = await db.user.create({
        data: {
          id: newId("user"),
          robloxId: account.id,
          name: account.username,
          avatarUrl: account.avatar || null,
          hue,
          isStaff: staff.includes(account.id),
        },
      });
    } catch {
      const existing = await db.user.findUnique({ where: { robloxId: account.id } });
      if (!existing) throw new Error("Could not save your login");
      user = existing;
    }
  }

  const extras = matches.filter((row) => row.id !== user.id).map((row) => row.id);
  if (extras.length) {
    try {
      await absorbUsers(user.id, extras);
    } catch (error) {
      console.error("[users] absorb-twins FAILED", error);
    }
  }
  try {
    await grantStarter(user.id);
  } catch (error) {
    console.error("[users] grant-starter FAILED", error);
  }
  return db.user.findUniqueOrThrow({ where: { id: user.id } });
}
