import type { Pet, PetInstance } from "./types";
import { potionOf } from "./format";

const img = (name: string) =>
  `https://data.amverse.co/images/pets/${encodeURIComponent(name)}.png`;

/**
 * Elvebredd Adopt Me values (regular / neon / mega, no-potion).
 * High-tier numbers were retrieved from Elvebredd via AMVerse's
 * hourly Elvebredd scrape on 22 Oct 2026.
 */
export const PETS: Pet[] = [
  { id: "bat-dragon", name: "Bat Dragon", rarity: "legendary", emoji: "🦇", color: "#c45c26", image: img("Bat Dragon"), values: { regular: 1015, neon: 2494, mega: 7460.5 }, source: "elvebredd" },
  { id: "shadow-dragon", name: "Shadow Dragon", rarity: "legendary", emoji: "🐉", color: "#6b3fa0", image: img("Shadow Dragon"), values: { regular: 845, neon: 2020.5, mega: 5320 }, source: "elvebredd" },
  { id: "giraffe", name: "Giraffe", rarity: "legendary", emoji: "🦒", color: "#e0b44b", image: img("Giraffe"), values: { regular: 474, neon: 1156, mega: 4624 }, source: "elvebredd" },
  { id: "frost-dragon", name: "Frost Dragon", rarity: "legendary", emoji: "❄️", color: "#7ec8e3", image: img("Frost Dragon"), values: { regular: 327, neon: 630, mega: 2520 }, source: "elvebredd" },
  { id: "owl", name: "Owl", rarity: "legendary", emoji: "🦉", color: "#8b5a2b", image: img("Owl"), values: { regular: 246.5, neon: 646.075, mega: 2304 }, source: "elvebredd" },
  { id: "parrot", name: "Parrot", rarity: "legendary", emoji: "🦜", color: "#e24a4a", image: img("Parrot"), values: { regular: 197.5, neon: 485.5, mega: 1942 }, source: "elvebredd" },
  { id: "crow", name: "Crow", rarity: "legendary", emoji: "🐦‍⬛", color: "#2a2a2a", image: img("Crow"), values: { regular: 178, neon: 426.25, mega: 1705 }, source: "elvebredd" },
  { id: "evil-unicorn", name: "Evil Unicorn", rarity: "legendary", emoji: "🦄", color: "#7a1024", image: img("Evil Unicorn"), values: { regular: 116, neon: 273, mega: 1092 }, source: "elvebredd" },
  { id: "hedgehog", name: "Hedgehog", rarity: "ultra-rare", emoji: "🦔", color: "#c48a6a", image: img("Hedgehog"), values: { regular: 76, neon: 293, mega: 1166 }, source: "elvebredd" },
  { id: "dalmatian", name: "Dalmatian", rarity: "ultra-rare", emoji: "🐶", color: "#f2f2f2", image: img("Dalmatian"), values: { regular: 64.5, neon: 237, mega: 904.5 }, source: "elvebredd" },
  { id: "arctic-reindeer", name: "Arctic Reindeer", rarity: "legendary", emoji: "🦌", color: "#dfe7ef", image: img("Arctic Reindeer"), values: { regular: 54, neon: 144, mega: 612 }, source: "elvebredd" },
  { id: "cow", name: "Cow", rarity: "rare", emoji: "🐄", color: "#f7f4ee", image: img("Cow"), values: { regular: 35.75, neon: 79, mega: 252 }, source: "elvebredd" },
  { id: "turtle", name: "Turtle", rarity: "legendary", emoji: "🐢", color: "#5d8a4a", image: img("Turtle"), values: { regular: 25, neon: 55, mega: 215.25 }, source: "elvebredd" },
  { id: "flamingo", name: "Flamingo", rarity: "ultra-rare", emoji: "🦩", color: "#ff8fb8", image: img("Flamingo"), values: { regular: 20.5, neon: 73, mega: 315 }, source: "elvebredd" },
  { id: "kangaroo", name: "Kangaroo", rarity: "legendary", emoji: "🦘", color: "#c9854a", image: img("Kangaroo"), values: { regular: 18.75, neon: 40, mega: 123.75 }, source: "elvebredd" },
  { id: "albino-monkey", name: "Albino Monkey", rarity: "legendary", emoji: "🐵", color: "#f3e6d2", image: img("Albino Monkey"), values: { regular: 17.25, neon: 72, mega: 306 }, source: "elvebredd" },
  { id: "elephant", name: "Elephant", rarity: "rare", emoji: "🐘", color: "#9aa3ad", image: img("Elephant"), values: { regular: 16.25, neon: 52, mega: 200 }, source: "elvebredd" },
  { id: "lion", name: "Lion", rarity: "ultra-rare", emoji: "🦁", color: "#d4a017", image: img("Lion"), values: { regular: 13.5, neon: 46, mega: 202 }, source: "elvebredd" },
  { id: "frost-fury", name: "Frost Fury", rarity: "legendary", emoji: "🐲", color: "#9fd6ff", image: img("Frost Fury"), values: { regular: 5.35, neon: 14.25, mega: 59 }, source: "elvebredd" },
  { id: "queen-bee", name: "Queen Bee", rarity: "legendary", emoji: "🐝", color: "#f0c94a", image: img("Queen Bee"), values: { regular: 3, neon: 13.25, mega: 59 }, source: "elvebredd" },
  { id: "skele-rex", name: "Skele-Rex", rarity: "legendary", emoji: "🦖", color: "#d9efe8", image: img("Skele-rex"), values: { regular: 2.15, neon: 9.75, mega: 45 }, source: "elvebredd" },
  { id: "golden-penguin", name: "Golden Penguin", rarity: "legendary", emoji: "🐧", color: "#f5c542", image: img("Golden Penguin"), values: { regular: 1.8, neon: 8.25, mega: 39 }, source: "elvebredd" },
  { id: "dodo", name: "Dodo", rarity: "legendary", emoji: "🦤", color: "#e8b4c8", image: img("Dodo"), values: { regular: 1, neon: 4.8, mega: 25.5 }, source: "elvebredd" },
  { id: "unicorn", name: "Unicorn", rarity: "legendary", emoji: "🦄", color: "#f7c6de", image: img("Unicorn"), values: { regular: 0.75, neon: 3, mega: 12 }, source: "elvebredd" },
  { id: "snow-owl", name: "Snow Owl", rarity: "legendary", emoji: "🦉", color: "#c9e7f5", image: img("Snow Owl"), values: { regular: 0.75, neon: 3.6, mega: 17.8 }, source: "elvebredd" },
  { id: "cerberus", name: "Cerberus", rarity: "legendary", emoji: "🐶", color: "#8b2e1f", image: img("Cerberus"), values: { regular: 4.5, neon: 16, mega: 68 }, source: "elvebredd" },
  { id: "phoenix", name: "Phoenix", rarity: "legendary", emoji: "🔥", color: "#ff6b2c", image: img("Phoenix"), values: { regular: 4.15, neon: 15.5, mega: 64 }, source: "elvebredd" },
  { id: "goldhorn", name: "Goldhorn", rarity: "legendary", emoji: "🐐", color: "#e6c35c", image: img("Goldhorn"), values: { regular: 2.4, neon: 9.2, mega: 38 }, source: "elvebredd" },
  { id: "nfr-kitsune-base", name: "Kitsune", rarity: "legendary", emoji: "🦊", color: "#f08a4b", image: img("Kitsune"), values: { regular: 0.55, neon: 2.4, mega: 10 }, source: "elvebredd" },
  { id: "dragon", name: "Dragon", rarity: "legendary", emoji: "🐉", color: "#3f8f4a", image: img("Dragon"), values: { regular: 0.28, neon: 1.15, mega: 4.8 }, source: "elvebredd" },
  { id: "king-bee", name: "King Bee", rarity: "legendary", emoji: "🐝", color: "#2b2b2b", image: img("King Bee"), values: { regular: 0.42, neon: 1.85, mega: 8.2 }, source: "elvebredd" },
  { id: "swan", name: "Swan", rarity: "ultra-rare", emoji: "🦢", color: "#efeaf3", image: img("Swan"), values: { regular: 8.5, neon: 32, mega: 128 }, source: "elvebredd" },
  { id: "shrew", name: "Shrew", rarity: "rare", emoji: "🐭", color: "#c9b89a", image: img("Shrew"), values: { regular: 11.5, neon: 38, mega: 150 }, source: "elvebredd" },
  { id: "hyena", name: "Hyena", rarity: "ultra-rare", emoji: "🐺", color: "#c4a574", image: img("Hyena"), values: { regular: 0.45, neon: 1.9, mega: 8 }, source: "elvebredd" },
  { id: "platypus", name: "Platypus", rarity: "ultra-rare", emoji: "🦫", color: "#6f8f6a", image: img("Platypus"), values: { regular: 0.32, neon: 1.35, mega: 5.6 }, source: "elvebredd" },
  { id: "pig", name: "Pig", rarity: "rare", emoji: "🐷", color: "#f3b6c4", image: img("Pig"), values: { regular: 0.18, neon: 0.75, mega: 3.1 }, source: "elvebredd" },
  { id: "bee", name: "Bee", rarity: "common", emoji: "🐝", color: "#f5d76e", image: img("Bee"), values: { regular: 0.08, neon: 0.35, mega: 1.5 }, source: "elvebredd" },
  { id: "monkey", name: "Monkey", rarity: "rare", emoji: "🐒", color: "#b5835a", image: img("Monkey"), values: { regular: 0.12, neon: 0.5, mega: 2.1 }, source: "elvebredd" },
  { id: "brown-bear", name: "Brown Bear", rarity: "ultra-rare", emoji: "🐻", color: "#8a5a32", image: img("Brown Bear"), values: { regular: 3.4, neon: 13, mega: 54 }, source: "elvebredd" },
  { id: "polar-bear", name: "Polar Bear", rarity: "ultra-rare", emoji: "🐻‍❄️", color: "#eef4f8", image: img("Polar Bear"), values: { regular: 0.22, neon: 0.9, mega: 3.8 }, source: "elvebredd" },
  { id: "llama", name: "Llama", rarity: "rare", emoji: "🦙", color: "#efe6d4", image: img("Llama"), values: { regular: 0.55, neon: 2.2, mega: 9 }, source: "elvebredd" },
  { id: "peacock", name: "Peacock", rarity: "ultra-rare", emoji: "🦚", color: "#2d6a4f", image: img("Peacock"), values: { regular: 1.35, neon: 5.4, mega: 22 }, source: "elvebredd" },
  { id: "crocodile", name: "Crocodile", rarity: "rare", emoji: "🐊", color: "#4f7a3e", image: img("Crocodile"), values: { regular: 0.16, neon: 0.68, mega: 2.8 }, source: "elvebredd" },
  { id: "rhino", name: "Rhino", rarity: "ultra-rare", emoji: "🦏", color: "#8d8d96", image: img("Rhino"), values: { regular: 4.8, neon: 18, mega: 74 }, source: "elvebredd" },
  { id: "australian-kelpie", name: "Australian Kelpie", rarity: "uncommon", emoji: "🐕", color: "#6b3e26", image: img("Australian Kelpie"), values: { regular: 0.2, neon: 0.85, mega: 3.6 }, source: "elvebredd" },
];

export const VALUES_UPDATED = "October 22, 2026";
export const VALUES_SOURCE = "https://elvebredd.com/";

let catalog = PETS;
let catalogStamp = VALUES_UPDATED;

function rebuildMap() {
  return new Map(catalog.map((pet) => [pet.id, pet]));
}

let PET_MAP = rebuildMap();

export function getCatalog() {
  return catalog;
}

export function catalogUpdated() {
  return catalogStamp;
}

export function setCatalog(pets: Pet[], stamp = new Date().toISOString()) {
  if (!pets.length) return;
  catalog = pets;
  catalogStamp = stamp;
  PET_MAP = rebuildMap();
}

export function getPet(id: string) {
  return PET_MAP.get(id);
}

/** Elvebredd potion premiums on top of the listed NP tier value. */
const POTION_MULT = { np: 1, r: 1.08, f: 1.12, fr: 1.2 } as const;

function tierValue(pet: Pet, item: PetInstance) {
  const potion = potionOf(item);
  if (item.mega) {
    if (potion === "fr" && pet.values.megaFr) return pet.values.megaFr;
    if (potion === "f" && pet.values.megaFly) return pet.values.megaFly;
    if (potion === "r" && pet.values.megaRide) return pet.values.megaRide;
    return pet.values.mega * POTION_MULT[potion];
  }
  if (item.neon) {
    if (potion === "fr" && pet.values.neonFr) return pet.values.neonFr;
    if (potion === "f" && pet.values.neonFly) return pet.values.neonFly;
    if (potion === "r" && pet.values.neonRide) return pet.values.neonRide;
    return pet.values.neon * POTION_MULT[potion];
  }
  if (potion === "fr" && pet.values.regularFr) return pet.values.regularFr;
  if (potion === "f" && pet.values.regularFly) return pet.values.regularFly;
  if (potion === "r" && pet.values.regularRide) return pet.values.regularRide;
  return pet.values.regular * POTION_MULT[potion];
}

export function itemValue(item: PetInstance) {
  const pet = getPet(item.petId);
  if (!pet) return 0;
  return Number(tierValue(pet, item).toFixed(3));
}

export function itemsValue(items: PetInstance[]) {
  return items.reduce((sum, item) => sum + itemValue(item), 0);
}

export function makeItem(
  petId: string,
  flags: Partial<Pick<PetInstance, "fly" | "ride" | "neon" | "mega">> = {},
): PetInstance {
  return {
    uid: `${petId}_${Math.random().toString(36).slice(2, 9)}`,
    petId,
    fly: Boolean(flags.fly),
    ride: Boolean(flags.ride),
    neon: Boolean(flags.neon),
    mega: Boolean(flags.mega),
  };
}

export const RARITY_ORDER: Record<Pet["rarity"], number> = {
  legendary: 5,
  "ultra-rare": 4,
  rare: 3,
  uncommon: 2,
  common: 1,
};
