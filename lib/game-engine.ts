import type { CoinSide, JackpotEntry, PetInstance, Player } from "./types";
import { itemsValue } from "./pets";

export const JOIN_TOLERANCE = 0.12;
export const UPGRADE_HOUSE = 0.92;
export const MIN_JACKPOT_PLAYERS = 2;
export const MIN_RACE_PLAYERS = 2;
export const MAX_JACKPOT_PLAYERS = 8;
export const MAX_RACE_PLAYERS = 6;

export function joinRange(value: number) {
  return {
    min: value * (1 - JOIN_TOLERANCE),
    max: value * (1 + JOIN_TOLERANCE),
  };
}

export function canJoinValue(host: number, guest: number) {
  const { min, max } = joinRange(host);
  return guest >= min && guest <= max;
}

export function flipCoin(): CoinSide {
  return Math.random() < 0.5 ? "heads" : "tails";
}

export function pickWeightedWinner(entries: JackpotEntry[]) {
  const total = entries.reduce((sum, entry) => sum + itemsValue(entry.items), 0);
  let ticket = Math.random() * total;
  for (const entry of entries) {
    ticket -= itemsValue(entry.items);
    if (ticket <= 0) return { winner: entry, total };
  }
  return { winner: entries[entries.length - 1], total };
}

export function upgradeChance(stake: number, target: number) {
  if (target <= 0) return 0;
  return Math.max(0.5, Math.min(90, (stake / target) * 100 * UPGRADE_HOUSE));
}

export function playerColor(player: Player) {
  return `hsl(${player.hue} 72% 58%)`;
}

export function cloneItems(items: PetInstance[]): PetInstance[] {
  return items.map((item) => ({ ...item, uid: `${item.uid}_c${Math.random().toString(36).slice(2, 6)}` }));
}
