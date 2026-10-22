import { itemsValue } from "@/lib/pets";
import { robloxAvatar } from "@/lib/roblox";
import type { PetInstance, Player } from "@/lib/types";
import type { InventoryItem, User } from "@prisma/client";
import { uid } from "@/lib/format";

export function toPlayer(user: User): Player {
  return {
    id: user.id,
    name: user.name,
    hue: user.hue,
    isBot: user.isBot,
    robloxId: user.robloxId || undefined,
    avatar: robloxAvatar(user.robloxId) || user.avatarUrl || undefined,
  };
}

export function toItem(row: InventoryItem): PetInstance {
  return {
    uid: row.id,
    petId: row.petId,
    fly: row.fly,
    ride: row.ride,
    neon: row.neon,
    mega: row.mega,
  };
}

export function parseItems(json: string): PetInstance[] {
  return JSON.parse(json) as PetInstance[];
}

export function dumpItems(items: PetInstance[]) {
  return JSON.stringify(items);
}

export function newId(prefix: string) {
  return uid(prefix);
}

export function playerColor(user: User) {
  return `hsl(${user.hue} 72% 58%)`;
}

export function itemRowsValue(rows: InventoryItem[]) {
  return itemsValue(rows.map(toItem));
}
