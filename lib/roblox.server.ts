import "server-only";
import https from "node:https";
import { db } from "@/lib/db";
import { fetchHeadshot } from "@/lib/roblox-avatar.server";

export { fetchHeadshot };

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/json",
};

function requestJson<T>(url: string, method: "GET" | "POST" = "GET", body?: unknown): Promise<T> {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        path: `${parsed.pathname}${parsed.search}`,
        method,
        headers: {
          ...HEADERS,
          ...(payload
            ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) }
            : {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk as Buffer));
        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const status = res.statusCode || 0;
          if (status >= 400) {
            reject(new Error(`Roblox ${status}`));
            return;
          }
          try {
            resolve(JSON.parse(text) as T);
          } catch (error) {
            reject(error);
          }
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error("Roblox request timed out"));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

export type RobloxAccount = {
  id: string;
  username: string;
  displayName: string;
  description: string;
  avatar: string;
  profileUrl: string;
};

export async function lookupRobloxUser(username: string): Promise<RobloxAccount> {
  const clean = username.trim();
  if (clean.length < 3) throw new Error("Enter a Roblox username");
  const found = await requestJson<{ data?: Array<{ id: number; name: string; requestedUsername?: string }> }>(
    "https://users.roblox.com/v1/usernames/users",
    "POST",
    { usernames: [clean], excludeBannedUsers: true },
  );
  const row = found.data?.[0];
  if (!row?.id) throw new Error("That Roblox username was not found");
  const profile = await requestJson<{
    id: number;
    name: string;
    displayName?: string;
    description?: string;
  }>(`https://users.roblox.com/v1/users/${row.id}`);
  const avatar = await fetchHeadshot(String(row.id));
  return {
    id: String(row.id),
    username: profile.name || row.name,
    displayName: profile.displayName || profile.name || row.name,
    description: profile.description || "",
    avatar,
    profileUrl: `https://www.roblox.com/users/${row.id}/profile`,
  };
}

export function makeLoginCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < 6; i += 1) token += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `AdoptLuck-${token}`;
}

function decodeEntities(text: string) {
  return text
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, value) => String.fromCharCode(Number(value)));
}

function requestText(url: string, redirects = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        headers: {
          "User-Agent": HEADERS["User-Agent"],
          Accept: "text/html,application/xhtml+xml",
        },
      },
      (res) => {
        const location = res.headers.location;
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && location && redirects < 3) {
          const next = location.startsWith("http") ? location : `${parsed.protocol}//${parsed.hostname}${location}`;
          res.resume();
          resolve(requestText(next, redirects + 1));
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk as Buffer));
        res.on("end", () => {
          if ((res.statusCode || 0) >= 400) {
            reject(new Error(`Roblox ${res.statusCode}`));
            return;
          }
          resolve(Buffer.concat(chunks).toString("utf8"));
        });
      },
    );
    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error("Roblox request timed out"));
    });
    req.end();
  });
}

function metaContent(html: string, key: string) {
  const named = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]+content=["']([^"']*)["']`, "i"));
  const reversed = html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${key}["']`, "i"));
  return decodeEntities(named?.[1] || reversed?.[1] || "");
}

export async function readPublicAbout(robloxId: string) {
  try {
    const html = await requestText(`https://www.roblox.com/users/${robloxId}/profile`);
    const fromMeta = [metaContent(html, "description"), metaContent(html, "og:description")].join(" ");
    const fromAbout = html.match(/profile-about-content-text[^>]*>([\s\S]*?)<\//i)?.[1] || "";
    const fromJson =
      html.match(/"about"\s*:\s*"((?:\\.|[^"\\])*)"/i)?.[1] ||
      html.match(/"description"\s*:\s*"((?:\\.|[^"\\])*)"/i)?.[1] ||
      "";
    return decodeEntities(`${fromMeta} ${fromAbout} ${fromJson}`.replace(/<[^>]+>/g, " ").replace(/\\n/g, " "));
  } catch {
    return "";
  }
}

export function profileHasCode(source: { description?: string } | string, code: string) {
  const text = typeof source === "string" ? source : source.description || "";
  return text.replace(/\s+/g, " ").toLowerCase().includes(code.toLowerCase());
}

export async function accountHasLoginCode(account: RobloxAccount, code: string) {
  if (profileHasCode(account, code)) return true;
  const about = await readPublicAbout(account.id);
  return profileHasCode(about, code);
}

export function hueFromRobloxId(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}

type Challenge = { robloxId: string; username: string; code: string; expiresAt: number };

const challenges = new Map<string, Challenge>();
const TTL = 15 * 60 * 1000;

export async function saveChallenge(robloxId: string, username: string, code: string) {
  const expiresAt = Date.now() + TTL;
  challenges.set(robloxId, { robloxId, username, code, expiresAt });
  try {
    await db.loginChallenge.upsert({
      where: { id: `ch_${robloxId}` },
      create: {
        id: `ch_${robloxId}`,
        robloxId,
        username,
        code,
        expiresAt: new Date(expiresAt),
      },
      update: { username, code, expiresAt: new Date(expiresAt) },
    });
  } catch {
    // keep the in-memory copy if the table is unavailable
  }
}

export async function getChallenge(robloxId: string) {
  const mem = challenges.get(robloxId);
  if (mem && mem.expiresAt >= Date.now()) return mem;
  if (mem) challenges.delete(robloxId);
  try {
    const row = await db.loginChallenge.findFirst({
      where: { robloxId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!row) return null;
    const mapped = {
      robloxId: row.robloxId,
      username: row.username,
      code: row.code,
      expiresAt: row.expiresAt.getTime(),
    };
    challenges.set(robloxId, mapped);
    return mapped;
  } catch {
    return null;
  }
}

export async function clearChallenge(robloxId: string) {
  challenges.delete(robloxId);
  try {
    await db.loginChallenge.deleteMany({ where: { robloxId } });
  } catch {
    // ignore
  }
}
