import { setSessionCookie } from "@/lib/auth";
import { db } from "@/lib/db";
import { makeItem } from "@/lib/pets";
import {
  clearChallenge,
  getChallenge,
  hueFromRobloxId,
  accountHasLoginCode,
  lookupRobloxUser,
  makeLoginCode,
  saveChallenge,
} from "@/lib/roblox.server";
import { newId, toPlayer } from "@/lib/server/helpers";
import { fail, ok, readJson } from "@/lib/server/http";

const STARTER = [
  ["turtle", { fly: true, ride: true }],
  ["flamingo", { ride: true }],
  ["kangaroo", { fly: true }],
  ["unicorn", {}],
  ["dragon", {}],
  ["bee", {}],
] as const;

async function grantStarter(userId: string) {
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

async function issueCode(account: { id: string; username: string; displayName: string; profileUrl: string }, reuse?: string) {
  const code = reuse || makeLoginCode();
  await saveChallenge(account.id, account.username, code);
  return ok({
    step: "code",
    username: account.username,
    displayName: account.displayName,
    robloxId: account.id,
    code,
    profileUrl: account.profileUrl,
  });
}

export async function POST(request: Request) {
  const body = await readJson<{ username?: string; name?: string; terms?: boolean; verify?: boolean }>(request);
  const username = (body.username || body.name || "").trim();
  if (!body.terms) return fail("Accept the terms to continue");
  if (username.length < 3) return fail("Enter your Roblox username");

  let account;
  try {
    account = await lookupRobloxUser(username);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "That Roblox username was not found");
  }

  const pending = await getChallenge(account.id);
  if (!body.verify) {
    return issueCode(account, pending?.code);
  }

  if (!pending) {
    return issueCode(account);
  }

  let live;
  try {
    live = await lookupRobloxUser(account.username);
    if (!(await accountHasLoginCode(live, pending.code))) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      live = await lookupRobloxUser(account.username);
    }
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not read that Roblox profile");
  }

  if (!(await accountHasLoginCode(live, pending.code))) {
    return fail("The login code was not found in your Roblox About / Bio. Paste it there, save, then click Login again.");
  }

  const staff = (process.env.ROBLOX_STAFF_IDS || "").split(",").map((item) => item.trim()).filter(Boolean);
  const hue = hueFromRobloxId(live.id);
  try {
    let user = await db.user.findUnique({ where: { robloxId: live.id } });
    if (!user) {
      user = await db.user.create({
        data: {
          id: newId("user"),
          robloxId: live.id,
          name: live.username,
          avatarUrl: live.avatar || null,
          hue,
          isStaff: staff.includes(live.id),
        },
      });
    } else {
      user = await db.user.update({
        where: { id: user.id },
        data: {
          name: live.username,
          avatarUrl: live.avatar || user.avatarUrl,
          isStaff: staff.includes(live.id),
        },
      });
    }

    await clearChallenge(live.id);
    await grantStarter(user.id);
    await setSessionCookie(user.id);
    return ok({ step: "done", user: toPlayer(user) });
  } catch (error) {
    console.error("login persist failed", error);
    return fail("Could not save your login. Check the production database connection.");
  }
}
