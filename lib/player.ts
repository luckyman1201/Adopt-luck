export type SeatIdentity = {
  id: string;
  name: string;
  isBot?: boolean;
  robloxId?: string | null;
};

export function samePlayer(a?: SeatIdentity | null, b?: SeatIdentity | null) {
  if (!a || !b) return false;
  if (a.id === b.id) return true;
  if (a.robloxId && b.robloxId && String(a.robloxId) === String(b.robloxId)) return true;
  if (!a.isBot && !b.isBot && a.name.trim().toLowerCase() === b.name.trim().toLowerCase()) return true;
  return false;
}

export function seatedIn<T extends { player: SeatIdentity }>(entries: T[], user?: SeatIdentity | null) {
  return Boolean(user && entries.some((entry) => samePlayer(entry.player, user)));
}
