import "server-only";
import https from "node:https";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
};

function requestJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        headers: { ...HEADERS, Accept: "application/json" },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk as Buffer));
        res.on("end", () => {
          const status = res.statusCode || 0;
          if (status >= 400) {
            reject(new Error(`Roblox ${status}`));
            return;
          }
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as T);
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
    req.end();
  });
}

function requestBuffer(url: string, redirects = 0): Promise<{ body: Buffer; type: string }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        headers: { ...HEADERS, Accept: "image/png,image/jpeg,image/webp,image/*" },
      },
      (res) => {
        const location = res.headers.location;
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && location && redirects < 4) {
          const next = location.startsWith("http") ? location : `${parsed.protocol}//${parsed.hostname}${location}`;
          res.resume();
          resolve(requestBuffer(next, redirects + 1));
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk as Buffer));
        res.on("end", () => {
          if ((res.statusCode || 0) >= 400) {
            reject(new Error(`Roblox ${res.statusCode}`));
            return;
          }
          resolve({
            body: Buffer.concat(chunks),
            type: String(res.headers["content-type"] || "image/png").split(";")[0],
          });
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

export async function fetchHeadshot(robloxId: string) {
  if (!/^\d+$/.test(robloxId)) return "";
  const endpoints = [
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxId}&size=150x150&format=Png&isCircular=true`,
    `https://thumbnails.roblox.com/v1/users/avatar-bust?userIds=${robloxId}&size=150x150&format=Png&isCircular=true`,
    `https://thumbnails.roblox.com/v1/users/avatar?userIds=${robloxId}&size=150x150&format=Png&isCircular=true`,
  ];
  for (const endpoint of endpoints) {
    try {
      const thumbs = await requestJson<{ data?: Array<{ imageUrl?: string; state?: string }> }>(endpoint);
      const row = thumbs.data?.[0];
      if (row?.imageUrl && row.state !== "Error") return row.imageUrl;
    } catch {
      // try the next thumbnail type
    }
  }
  return `https://www.roblox.com/headshot-thumbnail/image?userId=${robloxId}&width=150&height=150&format=png`;
}

const imageCache = new Map<string, { body: Buffer; type: string; at: number }>();
const IMAGE_TTL = 60 * 60 * 1000;

export async function fetchHeadshotImage(robloxId: string) {
  const cached = imageCache.get(robloxId);
  if (cached && Date.now() - cached.at < IMAGE_TTL) return cached;
  const url = await fetchHeadshot(robloxId);
  if (!url) return null;
  try {
    const image = await requestBuffer(url);
    const next = { ...image, at: Date.now() };
    imageCache.set(robloxId, next);
    return next;
  } catch {
    return cached || null;
  }
}
