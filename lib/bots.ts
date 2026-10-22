import type { Player } from "./types";

const NAMES = [
  "LunaTrade",
  "NeonFoxx",
  "ShadowKing",
  "Frostie",
  "AdoptAce",
  "PinkHouse",
  "MegaOwl",
  "CandyPet",
  "WflWizard",
  "PetNinja",
  "SunnyBarn",
  "CoralCove",
  "LuckyPaw",
  "HoneyHive",
  "StarNursery",
];

export const BOTS: Player[] = NAMES.map((name, i) => ({
  id: `bot_${i + 1}`,
  name,
  hue: (i * 47 + 18) % 360,
  isBot: true,
}));

export function randomBot(exclude: string[] = []) {
  const pool = BOTS.filter((bot) => !exclude.includes(bot.id));
  return pool[Math.floor(Math.random() * pool.length)] ?? BOTS[0];
}

export const CHAT_LINES = [
  "gl on that frost",
  "anyone taking mid adds?",
  "nfr turtle looking clean",
  "bat is cooked today",
  "values from elvebredd hit different",
  "w owner on that giraffe",
  "jackpot looking spicy",
  "race me for a cow",
  "upgrader cooked me last night",
  "need a join on 25",
  "shadow still climbing?",
  "good luck everyone",
  "that neon owl is insane",
  "adopt me only tonight",
];
