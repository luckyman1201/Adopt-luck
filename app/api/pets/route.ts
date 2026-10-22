import { ensureCatalog } from "@/lib/catalog.server";
import { catalogUpdated, getCatalog, VALUES_SOURCE } from "@/lib/pets";
import { ok } from "@/lib/server/http";

export async function GET() {
  try {
    await ensureCatalog();
  } catch {
    // fallback catalog is already in memory
  }
  const pets = getCatalog();
  return ok({
    source: "elvebredd",
    attribution: VALUES_SOURCE,
    updated: catalogUpdated(),
    live: pets.length > 45,
    count: pets.length,
    pets,
  });
}
