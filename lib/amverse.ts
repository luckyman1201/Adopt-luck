import "server-only";
import https from "node:https";
import type { Pet, PetValues, Rarity } from "@/lib/types";

const BASE = "https://amverse.co";
const PAGE = 50;
const PET_CATEGORIES = ["High tier", "Mid tier", "Randoms", "Exotic", "2019", "Classy", "Preppy", "Default legs"];

const BROWSER = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/json",
  Referer: "https://amverse.co/values",
  Origin: "https://amverse.co",
};

type Elve = {
  rvalue?: number;
  nvalue?: number;
  mvalue?: number;
  rvalueRide?: number;
  rvalueFly?: number;
  rvalueFlyRide?: number;
  nvalueRide?: number;
  nvalueFly?: number;
  nvalueFlyRide?: number;
  mvalueRide?: number;
  mvalueFly?: number;
  mvalueFlyRide?: number;
  scrapedAt?: string;
};

type AmversePet = {
  petId: number;
  name: string;
  rarity?: string;
  category?: string;
  imageUrl?: string;
  elve?: Elve;
};

type PetsPage = {
  pets: AmversePet[];
  total: number;
  hasMore: boolean;
};

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function rarityOf(value?: string): Rarity {
  const raw = (value || "").toLowerCase().replace(/\s+/g, "-");
  if (raw === "legendary" || raw === "ultra-rare" || raw === "rare" || raw === "uncommon" || raw === "common") {
    return raw;
  }
  return "common";
}

function colorFromName(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return `hsl(${hash % 360} 38% 46%)`;
}

function mapPet(row: AmversePet): Pet | null {
  const elve = row.elve;
  if (!elve?.rvalue && !elve?.nvalue) return null;
  const values: PetValues = {
    regular: elve.rvalue ?? 0,
    neon: elve.nvalue ?? (elve.rvalue ?? 0) * 4,
    mega: elve.mvalue ?? (elve.nvalue ?? elve.rvalue ?? 0) * 4,
    regularRide: elve.rvalueRide,
    regularFly: elve.rvalueFly,
    regularFr: elve.rvalueFlyRide,
    neonRide: elve.nvalueRide,
    neonFly: elve.nvalueFly,
    neonFr: elve.nvalueFlyRide,
    megaRide: elve.mvalueRide,
    megaFly: elve.mvalueFly,
    megaFr: elve.mvalueFlyRide,
  };
  return {
    id: slugify(row.name),
    name: row.name,
    rarity: rarityOf(row.rarity),
    emoji: "🐾",
    color: colorFromName(row.name),
    image: row.imageUrl || `https://data.amverse.co/images/pets/${encodeURIComponent(row.name)}.png`,
    values,
    source: "elvebredd",
  };
}

function requestJson<T>(url: string, headers: Record<string, string>) {
  return new Promise<T>((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk as Buffer));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        const status = res.statusCode || 0;
        if (status === 403) {
          reject(new Error("token"));
          return;
        }
        if (status >= 400) {
          reject(new Error(`AMVerse ${status}: ${body.slice(0, 120)}`));
          return;
        }
        try {
          resolve(JSON.parse(body) as T);
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(25000, () => {
      req.destroy();
      reject(new Error("AMVerse request timed out"));
    });
  });
}

async function challengeToken() {
  const data = await requestJson<{ token?: string }>(`${BASE}/api/challenge`, BROWSER);
  if (!data.token) throw new Error("AMVerse challenge returned no token");
  return data.token;
}

async function fetchPage(token: string, category: string, offset: number): Promise<PetsPage> {
  const url = new URL(`${BASE}/api/pets`);
  url.searchParams.set("hasValues", "true");
  url.searchParams.set("source", "both");
  url.searchParams.set("limit", String(PAGE));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("category", category);
  url.searchParams.set("sort", "rvalue");
  url.searchParams.set("sortDir", "desc");
  return requestJson<PetsPage>(url.toString(), { ...BROWSER, "X-AMV-Token": token });
}

export async function fetchAmverseCatalog() {
  let token = await challengeToken();
  const mapped = new Map<string, Pet>();
  let scrapedAt = "";

  for (const category of PET_CATEGORIES) {
    let offset = 0;
    let hasMore = true;
    while (hasMore) {
      let page: PetsPage;
      try {
        page = await fetchPage(token, category, offset);
      } catch (error) {
        if (error instanceof Error && error.message === "token") {
          token = await challengeToken();
          page = await fetchPage(token, category, offset);
        } else {
          throw error;
        }
      }
      for (const row of page.pets) {
        const pet = mapPet(row);
        if (!pet) continue;
        if (!scrapedAt && row.elve?.scrapedAt) scrapedAt = row.elve.scrapedAt;
        if (!mapped.has(pet.id) || (mapped.get(pet.id)?.values.regular ?? 0) < pet.values.regular) {
          mapped.set(pet.id, pet);
        }
      }
      offset += page.pets.length;
      hasMore = page.hasMore && page.pets.length > 0;
    }
  }

  const pets = [...mapped.values()].sort((a, b) => b.values.regular - a.values.regular);
  if (!pets.length) throw new Error("AMVerse returned no pets");
  return { pets, scrapedAt };
}
