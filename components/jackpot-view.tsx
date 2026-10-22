"use client";

import { JoinPickerController } from "@/components/modals";
import { PetStack, PlayerChip, ValueGem } from "@/components/pet-tile";
import { StatsRow, Toolbar } from "@/components/site-shell";
import { formatValue } from "@/lib/format";
import { itemsValue } from "@/lib/pets";
import { useStore } from "@/lib/store";
import type { JackpotGame } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";

const BRAND_WHEEL = "conic-gradient(from 210deg, #1c2a52, #3d6eff 28%, #2fd37a 52%, #3d6eff 78%, #1c2a52)";

function Wheel({ game }: { game: JackpotGame }) {
  const slices = useMemo(() => {
    const total = game.entries.reduce((sum, entry) => sum + itemsValue(entry.items), 0) || 1;
    let cursor = 0;
    return game.entries.map((entry) => {
      const value = itemsValue(entry.items);
      const part = value / total;
      const start = cursor * 360;
      cursor += part;
      const end = cursor * 360;
      return {
        id: entry.player.id,
        color: entry.color || `hsl(${entry.player.hue} 72% 58%)`,
        value,
        pct: part * 100,
        start,
        end,
        mid: (start + end) / 2,
      };
    });
  }, [game.entries]);

  const wheelBg = useMemo(() => {
    if (slices.length < 2) return BRAND_WHEEL;
    return `conic-gradient(${slices.map((slice) => `${slice.color} ${slice.start}deg ${slice.end}deg`).join(",")})`;
  }, [slices]);

  const winner = slices.find((slice) => slice.id === game.winnerId);
  const target = winner ? 360 * 5 + (360 - winner.mid) : 0;
  const [deg, setDeg] = useState(0);
  const [animate, setAnimate] = useState(false);
  const seen = useRef(game.id);

  useEffect(() => {
    if (seen.current !== game.id) {
      seen.current = game.id;
      setAnimate(false);
      setDeg(0);
    }
    if (game.status === "spinning") {
      requestAnimationFrame(() => {
        setAnimate(true);
        setDeg(target);
      });
    } else if (game.status === "done") {
      setDeg(target);
      setAnimate(false);
    } else {
      setAnimate(false);
      setDeg(0);
    }
  }, [game.id, game.status, target]);

  const pot = game.entries.reduce((sum, entry) => sum + itemsValue(entry.items), 0);

  return (
    <div className="jp-stage">
      <div className="jp-glow" aria-hidden />
      <div
        className={`jp-disc ${game.status === "open" ? "jackpot-wheel" : ""} ${animate ? "jp-spinning" : ""}`}
        style={{ background: wheelBg, transform: `rotate(${deg}deg)` }}
      >
        <div className="jp-ticks" aria-hidden />
      </div>
      <div className="jp-pointer" aria-hidden />
      <div className="jp-hub">
        <div className="text-center">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Pot</div>
          <ValueGem value={pot} className="text-lg text-gold" />
        </div>
      </div>
    </div>
  );
}

export function JackpotView() {
  const { jackpots, joinJackpot, spinJackpot, user, requireUser } = useStore();
  const [joinId, setJoinId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ready = jackpots.filter((game) => game.status === "open" && game.entries.length >= 2);
  const live =
    jackpots.find((game) => game.status === "spinning") ||
    jackpots.find((game) => game.id === focusId) ||
    ready[0] ||
    jackpots.find((game) => game.status === "open") ||
    jackpots[0];
  const canSpin = Boolean(live && live.status === "open" && live.entries.length >= 2);

  async function spin(gameId: string) {
    if (busy) return;
    setFocusId(gameId);
    setBusy(true);
    await spinJackpot(gameId);
    setBusy(false);
  }

  return (
    <div>
      <StatsRow />
      <Toolbar createMode="jackpot" />
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="game-card jp-panel fade-up rounded-2xl border border-white/10 p-3 md:p-5">
          {live ? <Wheel game={live} /> : <div className="py-16 text-center text-white/40">Create a jackpot to start the wheel.</div>}
          {live && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {live.entries.map((entry) => (
                <div key={entry.player.id} className="flex max-w-full items-center gap-1.5 rounded-full bg-input px-2.5 py-1 text-xs">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: entry.color }} />
                  <span className="max-w-[5.5rem] truncate">{entry.player.name}</span>
                  <ValueGem value={itemsValue(entry.items)} className="shrink-0 text-gold" />
                  <span className="shrink-0 text-white/45">
                    {((itemsValue(entry.items) / (itemsValue(live.entries.flatMap((row) => row.items)) || 1)) * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          )}
          {canSpin && (
            <div className="mt-4 flex justify-center">
              <button onClick={() => live && spin(live.id)} disabled={busy} className="btn btn-primary h-11 px-8">
                {busy ? "Spinning…" : "Spin"}
              </button>
            </div>
          )}
          {live?.status === "open" && live.entries.length < 2 && (
            <p className="mt-4 text-center text-sm text-white/50">Need two players in this pot to spin. Join one of the ready lobbies on the right.</p>
          )}
          {live?.status === "spinning" && <div className="mt-4 text-center text-sm text-white/50">Wheel is spinning…</div>}
          {live?.status === "done" && live.winnerId && (
            <div className="mt-4 text-center font-semibold text-gold">
              {live.entries.find((entry) => entry.player.id === live.winnerId)?.player.name} won
            </div>
          )}
        </div>
        <div className="space-y-3">
          {jackpots.map((game) => {
            const pot = game.entries.reduce((sum, entry) => sum + itemsValue(entry.items), 0);
            const spinReady = game.status === "open" && game.entries.length >= 2;
            return (
              <div
                key={game.id}
                className={`rounded-xl border p-3 ${
                  live?.id === game.id ? "border-primary/50 bg-card" : "border-white/10 bg-card/70"
                }`}
              >
                <button type="button" className="mb-3 flex w-full items-center justify-between text-left" onClick={() => setFocusId(game.id)}>
                  <div className="text-sm font-semibold uppercase text-white/50">{game.status}</div>
                  <ValueGem value={pot} className="text-gold" />
                </button>
                <div className="space-y-3">
                  {game.entries.map((entry) => {
                    const chance = (itemsValue(entry.items) / (pot || 1)) * 100;
                    return (
                      <div key={entry.player.id} className="rounded-xl bg-input/60 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <PlayerChip player={entry.player} />
                          <span className="shrink-0 text-[11px] font-semibold text-white/50 md:text-xs">
                            {formatValue(itemsValue(entry.items))} · {chance.toFixed(1)}%
                          </span>
                        </div>
                        <div className="mt-2">
                          <PetStack items={entry.items} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex gap-2">
                  {game.status === "open" && !game.entries.some((entry) => entry.player.id === user?.id) && (
                    <button
                      onClick={() => {
                        if (!requireUser()) return;
                        setJoinId(game.id);
                      }}
                      className="btn btn-muted flex-1"
                    >
                      Join pot
                    </button>
                  )}
                  {spinReady && (
                    <button onClick={() => spin(game.id)} disabled={busy} className="btn btn-primary flex-1">
                      Spin
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <JoinPickerController
        open={Boolean(joinId)}
        onClose={() => setJoinId(null)}
        title="Join Jackpot"
        onConfirm={(items) => {
          if (joinId) joinJackpot(joinId, items);
          setJoinId(null);
        }}
      />
    </div>
  );
}
