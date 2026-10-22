import type { PetInstance, Potion } from "./types";

export function formatValue(value: number) {
  if (!Number.isFinite(value)) return "0";
  if (value >= 1000) return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
  if (value >= 100) return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
  if (value >= 10) return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function potionOf(item: PetInstance): Potion {
  if (item.fly && item.ride) return "fr";
  if (item.fly) return "f";
  if (item.ride) return "r";
  return "np";
}

export function potionLabel(item: PetInstance) {
  const tags: string[] = [];
  if (item.mega) tags.push("Mega");
  else if (item.neon) tags.push("Neon");
  if (item.fly && item.ride) tags.push("FR");
  else if (item.fly) tags.push("F");
  else if (item.ride) tags.push("R");
  else tags.push("NP");
  return tags.join(" ");
}

export function shortName(name: string, max = 16) {
  return name.length > max ? `${name.slice(0, max - 1)}…` : name;
}

export function relativeTime(ts: number) {
  const diff = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
