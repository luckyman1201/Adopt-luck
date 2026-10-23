"use client";

import { getPet, itemValue } from "@/lib/pets";
import { useStore } from "@/lib/store";
import type { Pet } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

const ORANGE = "#FFA834";
const CARD = "#1d1f29";
const LINE = "#242632";

const PRIZE_RANKS: string[][] = [
  ["bat-dragon"],
  ["shadow-dragon"],
  ["giraffe"],
  ["frost-dragon"],
  ["owl"],
  ["parrot", "crow"],
  ["evil-unicorn"],
  ["hedgehog"],
];

function rankColor(rank: number) {
  if (rank === 1) return "#fbc724";
  if (rank === 2) return "#9ca3af";
  if (rank === 3) return "#d97706";
  return "#ffffffbf";
}

function whole(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

function nextWeeklyReset() {
  const end = new Date();
  const add = (7 - end.getUTCDay()) % 7 || 7;
  end.setUTCDate(end.getUTCDate() + add);
  end.setUTCHours(23, 59, 59, 0);
  return end.getTime();
}

function useCountdown(target: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);
  const left = Math.max(0, target - now);
  const sec = Math.floor(left / 1000);
  return {
    d: Math.floor(sec / 86400),
    h: Math.floor((sec % 86400) / 3600),
    m: Math.floor((sec % 3600) / 60),
    s: sec % 60,
  };
}

function GlowGem({ gray, size = 28 }: { gray?: boolean; size?: number }) {
  return (
    <div className="relative flex h-6 w-7 items-center justify-center">
      <div
        className={`absolute z-[3] h-[30px] w-[30px] rounded-full opacity-40 blur-[19px] ${gray ? "bg-[#808080]" : "bg-[#FFA834]"}`}
      />
      <img src="/gem.svg" alt="" width={size} height={size} className={`relative ${gray ? "grayscale" : ""}`} />
    </div>
  );
}

function PrizePets({ pets }: { pets: Pet[] }) {
  return (
    <div className="flex items-center">
      {pets.map((pet, index) => (
        <div
          key={`${pet.id}-${index}`}
          className="relative mr-2 flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white/10 bg-background"
          style={{ marginLeft: index === 0 ? 0 : -12, zIndex: pets.length - index }}
        >
          <img src={pet.image} alt="" className="absolute left-1/2 top-1/2 h-[60px] w-[60px] -translate-x-1/2 -translate-y-1/2 blur-[10px]" />
          <img src={pet.image} alt={pet.name} className="relative h-[60px] w-[60px] object-contain p-1" />
        </div>
      ))}
    </div>
  );
}

function TimerBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="relative flex h-16 w-16 flex-col items-center justify-center rounded-md border border-gray-700 bg-gradient-to-b from-gray-700 to-gray-800">
      <span className="text-2xl font-bold text-white">{String(value).padStart(2, "0")}</span>
      <span className="text-sm text-gray-400">{label}</span>
    </div>
  );
}

function prizesFor(rank: number) {
  const ids = PRIZE_RANKS[rank - 1] || [];
  const pets = ids.map((id) => getPet(id)).filter((pet): pet is Pet => Boolean(pet));
  const value = pets.reduce((sum, pet) => sum + itemValue({ uid: pet.id, petId: pet.id, fly: true, ride: true, neon: false, mega: false }), 0);
  return { pets, value };
}

export function LeaderboardView() {
  const { stats } = useStore();
  const countdown = useCountdown(nextWeeklyReset());
  const rows = useMemo(
    () => Object.values(stats).sort((a, b) => b.wagered - a.wagered || b.profit - a.profit).slice(0, 20),
    [stats],
  );
  const pool = PRIZE_RANKS.reduce((sum, _, index) => sum + prizesFor(index + 1).value, 0);

  return (
    <div className="mx-auto w-full max-w-7xl">
      <div className="w-full rounded-lg border border-amber-500 bg-amber-500/10 p-4">
        <div className="text-lg font-semibold text-amber-500">Notice</div>
        <p className="font-medium text-amber-100">
          To ensure fair play, all winning accounts will be reviewed before rewards are distributed.
        </p>
      </div>

      <div
        className="relative mt-5 h-auto w-full rounded-xl border border-solid px-8 py-6 sm:h-40"
        style={{ background: CARD, borderColor: LINE }}
      >
        <div className="flex w-full flex-col items-center gap-1 sm:absolute sm:left-8 sm:top-6 sm:w-auto sm:items-start">
          <div className="flex flex-row items-center gap-3">
            <GlowGem />
            <div className="text-3xl font-semibold leading-none" style={{ color: ORANGE }}>
              {whole(pool)}
            </div>
          </div>
          <div className="text-2xl font-semibold leading-none text-white/75">PRIZE POOL</div>
        </div>
        <div className="mt-4 flex w-full items-center justify-center gap-2.5 sm:absolute sm:inset-y-0 sm:right-8 sm:mt-0 sm:w-auto">
          <TimerBox value={countdown.d} label="D" />
          <TimerBox value={countdown.h} label="H" />
          <TimerBox value={countdown.m} label="M" />
          <TimerBox value={countdown.s} label="S" />
        </div>
      </div>

      <div className="mt-12 w-full">
        <div
          className="flex w-full items-center justify-between rounded-md border border-solid px-8 py-3"
          style={{ background: CARD, borderColor: LINE }}
        >
          <div className="inline-flex items-center gap-5">
            <div className="min-w-8 text-center text-sm font-bold text-white">#</div>
            <div className="text-sm font-bold text-white">Username</div>
          </div>
          <div className="text-sm font-bold text-white">Wagered</div>
          <div className="text-sm font-bold text-white">Prize</div>
        </div>

        {rows.map((row, index) => {
          const rank = index + 1;
          const prize = prizesFor(rank);
          const avatar = row.player.robloxId ? `/api/avatar/${row.player.robloxId}` : row.player.avatar;
          return (
            <div
              key={row.player.id}
              className="mt-3 flex w-full items-center justify-between rounded-md border border-solid px-4 py-3 sm:px-8"
              style={{ background: CARD, borderColor: LINE }}
            >
              <div className="flex w-1/3 min-w-0 items-center gap-3 sm:gap-5">
                <div className="min-w-8 text-center text-base font-bold" style={{ color: rankColor(rank) }}>
                  #{rank}
                </div>
                <div className="inline-flex min-w-0 items-center gap-2">
                  {avatar ? (
                    <img src={avatar} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover sm:h-14 sm:w-14" />
                  ) : (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-bold sm:h-14 sm:w-14">
                      {row.player.name.slice(0, 1)}
                    </span>
                  )}
                  <div className="truncate text-sm font-semibold text-white">{row.player.name}</div>
                </div>
              </div>
              <div className="flex w-[40%] items-center justify-center gap-1.5">
                <GlowGem gray />
                <div className="whitespace-nowrap text-xl font-normal text-white/75">{whole(row.wagered)}</div>
              </div>
              <div className="ml-4 flex flex-1 items-center justify-end">
                {prize.pets.length ? (
                  <>
                    <div className="hidden sm:block">
                      <PrizePets pets={prize.pets} />
                    </div>
                    <div className="inline-flex items-center gap-1.5">
                      <GlowGem />
                      <div className="whitespace-nowrap text-xl font-semibold" style={{ color: ORANGE }}>
                        {whole(prize.value)}
                      </div>
                    </div>
                  </>
                ) : (
                  <span className="text-white/30">—</span>
                )}
              </div>
            </div>
          );
        })}

        {!rows.length && (
          <div
            className="mt-3 rounded-md border border-solid px-8 py-10 text-center text-white/40"
            style={{ background: CARD, borderColor: LINE }}
          >
            Wager on games to appear on this week’s board.
          </div>
        )}
      </div>
    </div>
  );
}
