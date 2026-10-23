import { setSessionCookie } from "@/lib/auth";
import {
  clearChallenge,
  getChallenge,
  accountHasLoginCode,
  lookupRobloxUser,
  makeLoginCode,
  saveChallenge,
} from "@/lib/roblox.server";
import { withDbRetry } from "@/lib/db";
import { toPlayer } from "@/lib/server/helpers";
import { fail, ok, readJson } from "@/lib/server/http";
import { apiError, apiLog, dbEnvInfo, errorInfo } from "@/lib/server/log";
import { ensureRobloxUser } from "@/lib/server/users";

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
  apiLog("login", "start", { username, verify: Boolean(body.verify), terms: Boolean(body.terms), db: dbEnvInfo() });
  if (!body.terms) return fail("Accept the terms to continue");
  if (username.length < 3) return fail("Enter your Roblox username");

  let account;
  try {
    account = await lookupRobloxUser(username);
    apiLog("login", "roblox-lookup", { robloxId: account.id, username: account.username });
  } catch (error) {
    apiError("login", "roblox-lookup", error, { username });
    return fail(error instanceof Error ? error.message : "That Roblox username was not found");
  }

  const pending = await getChallenge(account.id);
  apiLog("login", "challenge", { robloxId: account.id, hasPending: Boolean(pending), verify: Boolean(body.verify) });
  if (!body.verify) {
    apiLog("login", "issue-code");
    return issueCode(account, pending?.code);
  }

  if (!pending) {
    apiLog("login", "missing-challenge-reissue");
    return issueCode(account);
  }

  let live;
  try {
    live = await lookupRobloxUser(account.username);
    if (!(await accountHasLoginCode(live, pending.code))) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      live = await lookupRobloxUser(account.username);
    }
    apiLog("login", "profile-read", { robloxId: live.id, username: live.username });
  } catch (error) {
    apiError("login", "profile-read", error, { username: account.username });
    return fail(error instanceof Error ? error.message : "Could not read that Roblox profile");
  }

  if (!(await accountHasLoginCode(live, pending.code))) {
    apiLog("login", "code-not-on-profile", { robloxId: live.id });
    return fail("The login code was not found in your Roblox About / Bio. Paste it there, save, then click Login again.");
  }

  try {
    apiLog("login", "db-user-upsert", { robloxId: live.id, name: live.username });
    const user = await withDbRetry(() =>
      ensureRobloxUser({
        id: live.id,
        username: live.username,
        avatar: live.avatar,
      }),
    );
    await clearChallenge(live.id);
    await setSessionCookie(user.id);
    apiLog("login", "done", { userId: user.id, robloxId: live.id });
    return ok({ step: "done", user: toPlayer(user) });
  } catch (error) {
    apiError("login", "db-persist", error, { robloxId: live.id });
    const info = errorInfo(error);
    if (info.code === "P1001" || /can't reach database/i.test(info.message)) {
      return fail("The database is waking up. Wait a few seconds and click Login again.");
    }
    return fail("Could not save your login. Try again.");
  }
}
