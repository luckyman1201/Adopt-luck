export function robloxAvatar(robloxId?: string | null) {
  if (!robloxId) return undefined;
  return `/api/avatar/${robloxId}`;
}

export function robloxProfile(robloxId?: string | null) {
  if (!robloxId) return undefined;
  return `https://www.roblox.com/users/${robloxId}/profile`;
}
