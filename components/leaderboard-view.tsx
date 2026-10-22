"use client";

import { PlayerChip, ValueGem } from "@/components/pet-tile";
import { formatValue } from "@/lib/format";
import { useStore } from "@/lib/store";
import { useMemo, useState } from "react";

const PERIODS = ["Daily", "Weekly", "All time"] as const;

export function LeaderboardView() {
  const { stats, user } = useStore();
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("All time");
  const rows = useMemo(() => {
    const list = Object.values(stats).sort((a, b) => b.profit - a.profit);
    if (period === "Daily") return list.map((row) => ({ ...row, profit: row.profit * 0.18, wagered: row.wagered * 0.16 }));
    if (period === "Weekly") return list.map((row) => ({ ...row, profit: row.profit * 0.46, wagered: row.wagered * 0.44 }));
    return list;
  }, [period, stats]);
  const top = rows.slice(0, 3);
  const rest = rows.slice(3, 20);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold md:text-3xl">Leaderboard</h1>
          <p className="text-sm text-white/50">AdoptLuck ranks · profit in Elvebredd value</p>
        </div>
        <div className="grid w-full grid-cols-3 rounded-lg bg-input p-1 sm:w-auto">
          {PERIODS.map((item) => (
            <button
              key={item}
              onClick={() => setPeriod(item)}
              className={`period-btn h-9 rounded-md px-2 text-xs font-semibold sm:px-3 sm:text-sm ${period === item ? "bg-primary text-primary-ink" : "text-white/60"}`}
            >
              <span className="sm:hidden">{item === "All time" ? "All" : item}</span>
              <span className="hidden sm:inline">{item}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="stagger mb-6 grid gap-3 md:grid-cols-3">
        {top.map((row, index) => (
          <div
            key={row.player.id}
            className={`game-card rounded-2xl border border-white/10 bg-card p-5 ${index === 0 ? "md:-translate-y-2 ring-1 ring-gold/40" : ""}`}
          >
            <div className="text-xs font-semibold uppercase text-white/40">#{index + 1}</div>
            <div className="mt-2">
              <PlayerChip player={row.player} />
            </div>
            <div className="mt-4 text-2xl font-extrabold text-gold">
              <ValueGem value={row.profit} />
            </div>
            <div className="mt-1 text-xs text-white/45">{row.wins} wins · {formatValue(row.wagered)} wagered</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-card/80">
        <div className="hidden grid-cols-[48px_1fr_1fr_1fr_80px] bg-input/80 px-4 py-3 text-xs font-semibold uppercase text-white/45 sm:grid">
          <div>#</div>
          <div>Player</div>
          <div>Wagered</div>
          <div>Profit</div>
          <div>Wins</div>
        </div>
        {rest.map((row, index) => (
          <div
            key={row.player.id}
            className={`lb-row items-center px-3 py-3 text-sm sm:grid sm:grid-cols-[48px_1fr_1fr_1fr_80px] sm:px-4 ${
              row.player.id === user?.id ? "bg-primary/10" : "border-t border-white/5"
            }`}
          >
            <div className="flex items-center justify-between gap-3 sm:contents">
              <div className="flex min-w-0 items-center gap-3">
                <div className="w-6 text-white/40">{index + 4}</div>
                <PlayerChip player={row.player} />
              </div>
              <div className="text-right sm:contents">
                <ValueGem value={row.wagered} className="hidden text-white/80 sm:inline-flex" />
                <span className={row.profit >= 0 ? "text-secondary" : "text-rose"}>{formatValue(row.profit)}</span>
                <div className="hidden sm:block">{row.wins}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
