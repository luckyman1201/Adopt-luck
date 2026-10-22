import "server-only";
import { fetchAmverseCatalog } from "@/lib/amverse";
import { catalogUpdated, getCatalog, PETS, setCatalog, VALUES_UPDATED } from "@/lib/pets";
import type { Pet } from "@/lib/types";

let inflight: Promise<Pet[]> | null = null;
let loadedAt = 0;
const TTL = 30 * 60 * 1000;

export async function ensureCatalog() {
  const current = getCatalog();
  if (current.length > PETS.length && Date.now() - loadedAt < TTL) return current;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const live = await fetchAmverseCatalog();
      setCatalog(live.pets, live.scrapedAt || new Date().toISOString());
      loadedAt = Date.now();
    } catch (error) {
      console.error("[catalog]", error);
      if (!getCatalog().length) setCatalog(PETS, VALUES_UPDATED);
    }
    return getCatalog();
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export function catalogMeta() {
  return { updated: catalogUpdated(), count: getCatalog().length };
}
