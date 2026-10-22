"use client";

import { formatValue, potionLabel } from "@/lib/format";
import { getPet, itemValue } from "@/lib/pets";
import type { Pet, PetInstance, Player } from "@/lib/types";
import { useEffect, useState } from "react";

export function ValueGem({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${className}`}>
      <img src="/gem.svg" alt="" className="gem-spin h-4 w-4" />
      {formatValue(value)}
    </span>
  );
}

export function PetAvatar({
  item,
  pet,
  size = 56,
}: {
  item?: PetInstance;
  pet?: Pet;
  size?: number;
}) {
  const resolved = pet ?? (item ? getPet(item.petId) : undefined);
  const [failed, setFailed] = useState(false);
  if (!resolved) {
    return (
      <div className="grid place-items-center rounded-2xl bg-white/5 text-xl" style={{ width: size, height: size }}>
        🐾
      </div>
    );
  }
  const glow = item?.mega ? "pet-glow-mega" : item?.neon ? "pet-glow-neon" : "";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${glow}`}
      style={{ width: size, height: size, background: `${resolved.color}22` }}
    >
      {!failed ? (
        <img
          src={resolved.image}
          alt={resolved.name}
          className="h-full w-full object-contain p-1.5"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-2xl">{resolved.emoji}</div>
      )}
    </div>
  );
}

function Badges({ item }: { item: PetInstance }) {
  const tags = potionLabel(item).split(" ");
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
            tag === "Mega" ? "bg-primary/25 text-gold" : tag === "Neon" ? "bg-sky/20 text-sky" : "bg-white/8 text-white/55"
          }`}
        >
          {tag}
        </span>
      ))}
    </div>
  );
}

export function PetTile({
  item,
  selected,
  onClick,
  compact,
}: {
  item: PetInstance;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}) {
  const pet = getPet(item.petId);
  const label = pet?.name || item.petId.replace(/-/g, " ");
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pet-tile group w-full rounded-xl border p-2 text-left ${
        selected ? "is-selected border-primary bg-primary/15" : "border-white/10 bg-input"
      }`}
    >
      <div className={`grid place-items-center rounded-lg bg-black/20 ${compact ? "h-14" : "h-[84px]"}`}>
        <PetAvatar item={item} size={compact ? 48 : 72} />
      </div>
      <div className="mt-2 truncate text-[13px] font-semibold capitalize">{label}</div>
      <div className="mt-1">
        <Badges item={item} />
      </div>
      <ValueGem value={itemValue(item)} className="mt-2 text-sm text-gold" />
    </button>
  );
}

export function PetStack({ items, max = 6, size = 40 }: { items: PetInstance[]; max?: number; size?: number }) {
  const shown = items.slice(0, max);
  return (
    <div className="flex flex-wrap gap-1 md:gap-1.5">
      {shown.map((item) => (
        <PetAvatar key={item.uid} item={item} size={size} />
      ))}
      {items.length > max && (
        <div
          className="grid place-items-center rounded-xl border border-white/10 bg-input text-[10px] font-semibold md:text-xs"
          style={{ width: size, height: size }}
        >
          +{items.length - max}
        </div>
      )}
    </div>
  );
}

export function PlayerChip({
  name,
  hue,
  player,
  compact,
}: {
  name?: string;
  hue?: number;
  player?: Player;
  compact?: boolean;
}) {
  const display = player?.name || name || "?";
  const color = player?.hue ?? hue ?? 18;
  const [avatarFailed, setAvatarFailed] = useState(false);
  const avatarSrc = player?.robloxId
    ? `/api/avatar/${player.robloxId}`
    : player?.avatar?.startsWith("http") || player?.avatar?.startsWith("/api/avatar/")
      ? player.avatar
      : undefined;
  useEffect(() => {
    setAvatarFailed(false);
  }, [avatarSrc]);
  const avatar = !avatarFailed ? avatarSrc : undefined;
  const profile = player?.robloxId ? `https://www.roblox.com/users/${player.robloxId}/profile` : undefined;
  const face = avatar ? (
    <img
      key={avatar}
      src={avatar}
      alt=""
      width={32}
      height={32}
      referrerPolicy="no-referrer"
      className={`${compact ? "h-7 w-7" : "h-8 w-8"} shrink-0 rounded-full object-cover`}
      onError={() => setAvatarFailed(true)}
    />
  ) : (
    <div
      className={`grid ${compact ? "h-7 w-7" : "h-8 w-8"} shrink-0 place-items-center rounded-full text-xs font-bold text-black`}
      style={{ background: `hsl(${color} 80% 68%)` }}
    >
      {display.slice(0, 1).toUpperCase()}
    </div>
  );

  const body = (
    <>
      {face}
      {!compact && (
        <span className="max-w-[5.5rem] truncate text-xs font-semibold text-[#f4f7ff] sm:max-w-[9rem] sm:text-sm xl:max-w-[12rem]">
          {display}
        </span>
      )}
    </>
  );

  if (profile) {
    return (
      <a href={profile} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2 hover:text-gold">
        {body}
      </a>
    );
  }

  return <div className="flex min-w-0 items-center gap-2">{body}</div>;
}
