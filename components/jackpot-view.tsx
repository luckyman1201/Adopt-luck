"use client";

import { JoinPickerController } from "@/components/modals";
import { PetAvatar, PlayerChip, ValueGem } from "@/components/pet-tile";
import { getPet, itemValue, itemsValue } from "@/lib/pets";
import { samePlayer, seatedIn } from "@/lib/player";
import { useStore } from "@/lib/store";
import type { JackpotGame, Player } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";

const ORANGE = "#FFA834";
const SLICE_COLORS = ["#FF5C5C", "#F4F4F4", "#2EE56A", "#7B61FF", "#3D6EFF", "#22D3EE", "#C084FC", "#F4C15D"];
const CX = 250;
const CY = 250;
const R = 250;

function sliceColor(index: number) {
  return SLICE_COLORS[index % SLICE_COLORS.length];
}

function avatarSrc(player?: Player) {
  if (!player) return;
  if (player.robloxId) return `/api/avatar/${player.robloxId}`;
  if (player.avatar?.startsWith("http") || player.avatar?.startsWith("/api/avatar/")) return player.avatar;
}

function polar(angle: number, r = R) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function piePath(start: number, end: number) {
  const span = Math.min(Math.max(end - start, 0.01), 359.99);
  const a = polar(start);
  const b = polar(end);
  const large = span > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${a.x} ${a.y} A ${R} ${R} 0 ${large} 1 ${b.x} ${b.y} Z`;
}

function Wheel({ game }: { game?: JackpotGame }) {
  const entries = game?.entries ?? [];
  const slices = useMemo(() => {
    const total = entries.reduce((sum, entry) => sum + itemsValue(entry.items), 0) || 1;
    let cursor = 0;
    return entries.map((entry, index) => {
      const part = itemsValue(entry.items) / total;
      const start = cursor * 360;
      cursor += part;
      return {
        id: entry.player.id,
        color: sliceColor(index),
        start,
        end: cursor * 360,
        mid: (start + cursor * 360) / 2,
      };
    });
  }, [entries]);

  const winner = slices.find((slice) => slice.id === game?.winnerId);
  const target = winner ? 360 * 5 + (360 - winner.mid) : 0;
  const [deg, setDeg] = useState(0);
  const [animate, setAnimate] = useState(false);
  const seen = useRef(game?.id);
  const pot = entries.reduce((sum, entry) => sum + itemsValue(entry.items), 0);
  const empty = slices.length === 0;
  const one = slices.length === 1;

  useEffect(() => {
    if (seen.current !== game?.id) {
      seen.current = game?.id;
      setAnimate(false);
      setDeg(0);
    }
    if (game?.status === "spinning") {
      requestAnimationFrame(() => {
        setAnimate(true);
        setDeg(target);
      });
    } else if (game?.status === "done") {
      setDeg(target);
      setAnimate(false);
    } else {
      setAnimate(false);
      setDeg(0);
    }
  }, [game?.id, game?.status, target]);

  const spinStyle = {
    transform: `rotate(${deg}deg)`,
    transitionDuration: animate ? "4.2s" : "0s",
    transitionTimingFunction: "cubic-bezier(0.33, 1, 0.68, 1)",
  } as const;

  return (
    <div className="jp-chroma-wheel pointer-events-none relative shrink-0">
      <div className="absolute inset-0 overflow-hidden rounded-full opacity-20 blur-2xl" style={spinStyle}>
        <div className="h-full w-full rounded-full" style={{ background: empty ? ORANGE : one ? slices[0].color : undefined }}>
          {slices.length > 1 && (
            <svg viewBox="0 0 500 500" className="h-full w-full">
              {slices.map((slice) => (
                <path key={`glow-${slice.id}-${slice.start}`} d={piePath(slice.start, slice.end)} fill={slice.color} />
              ))}
            </svg>
          )}
        </div>
      </div>

      <div className="relative h-full w-full overflow-hidden rounded-full">
        <div className="absolute inset-0" style={spinStyle}>
          {empty || one ? (
            <svg viewBox="0 0 500 500" className="h-full w-full">
              <circle cx={CX} cy={CY} r={R} fill={empty ? ORANGE : slices[0].color} />
            </svg>
          ) : (
            <svg viewBox="0 0 500 500" className="h-full w-full">
              {slices.map((slice) => (
                <path key={`${slice.id}-${slice.start}`} d={piePath(slice.start, slice.end)} fill={slice.color} />
              ))}
            </svg>
          )}
          {entries.map((entry, index) => {
            const slice = slices[index];
            if (!slice) return null;
            const pos = polar(slice.mid, 198);
            const src = avatarSrc(entry.player);
            return (
              <div
                key={`face-${entry.player.id}-${index}`}
                className="absolute z-20 h-9 w-9 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-[#1a1f2e]"
                style={{ left: `${(pos.x / 500) * 100}%`, top: `${(pos.y / 500) * 100}%` }}
              >
                {src ? (
                  <img src={src} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-xs font-bold" style={{ background: slice.color }}>
                    {entry.player.name.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="absolute left-1/2 top-1/2 z-10 flex h-[57.6%] w-[57.6%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-3 rounded-full bg-background">
          <div
            className="absolute -top-5 left-1/2 z-30 h-5 w-10 -translate-x-1/2 bg-background"
            style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
          />
          <div className="flex items-center gap-2">
            <img alt="value gem" width={42} height={42} className="-mt-[5px] h-[42px] w-[42px]" src="/gem.svg" />
            <span className="text-4xl font-semibold text-[#FFA834]">{pot.toFixed(1)}</span>
          </div>
          <span className="text-lg font-medium opacity-70">
            {entries.length} | {game?.status === "spinning" ? "…" : game?.status === "done" ? "done" : "open"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function JackpotView() {
  const { jackpots, joinJackpot, spinJackpot, cancelGame, user, requireUser, openModal } = useStore();
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
  const inLive = Boolean(live && seatedIn(live.entries, user));
  const isCreator = Boolean(live && user && samePlayer(live.entries[0]?.player, user));
  const canJoin = Boolean(live && live.status === "open" && !inLive);
  const canCreate = !live || live.status === "done";
  const canSpin = Boolean(live && live.status === "open" && live.entries.length >= 2);

  async function spin(gameId: string) {
    if (busy) return;
    setFocusId(gameId);
    setBusy(true);
    await spinJackpot(gameId);
    setBusy(false);
  }

  function onJoin() {
    if (!requireUser()) return;
    if (canCreate) {
      openModal("create", "jackpot");
      return;
    }
    if (live && canJoin) setJoinId(live.id);
  }

  return (
    <div className="p-4 pb-32">
      <div className="flex w-full justify-center">
        <div className="inline-flex h-10 items-center rounded-md bg-input p-1">
          <button type="button" className="rounded-sm bg-secondary/40 px-3 py-1.5 text-sm font-medium shadow-sm">
            ADOPT ME
          </button>
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center justify-around gap-10 lg:mt-12 lg:flex-row lg:items-center">
        <Wheel game={live} />

        <div className="w-full max-w-md shrink-0">
          <button
            type="button"
            onClick={onJoin}
            disabled={Boolean(live && live.status !== "open" && live.status !== "done") || (inLive && !canCreate)}
            className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[#FFA834] px-8 text-sm font-semibold uppercase text-[#1a1204] hover:bg-[#ffbe67] disabled:pointer-events-none disabled:opacity-50"
          >
            Join
          </button>
          <div className="mt-4 flex min-h-96 w-full flex-col gap-8 overflow-y-auto rounded-lg border-2 border-[#35373D] bg-transparent p-6 lg:max-h-[442px]">
            {live?.entries.map((entry, index) => (
              <div key={`${entry.player.id}-${index}`} className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: sliceColor(index) }} />
                    <PlayerChip player={entry.player} />
                  </div>
                  <ValueGem value={itemsValue(entry.items)} className="shrink-0 text-[#FFA834]" />
                </div>
                <div className="flex flex-col gap-2">
                  {entry.items.map((item) => (
                    <div key={item.uid} className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <PetAvatar item={item} size={32} />
                        <span className="truncate text-sm text-white/80">{getPet(item.petId)?.name || item.petId}</span>
                      </div>
                      <ValueGem value={itemValue(item)} className="shrink-0 text-[#FFA834]" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {live?.status === "done" && live.winnerId && (
              <div className="text-center font-semibold text-[#FFA834]">
                {live.entries.find((entry) => entry.player.id === live.winnerId)?.player.name} won
              </div>
            )}
            {(canSpin || (live?.status === "open" && inLive)) && (
              <div className="mt-auto flex gap-2">
                {live?.status === "open" && isCreator && (
                  <button type="button" onClick={() => cancelGame(live.id)} className="btn btn-cancel flex-1">
                    Cancel
                  </button>
                )}
                {live?.status === "open" && inLive && !isCreator && (
                  <button type="button" onClick={() => cancelGame(live.id)} className="btn btn-cancel flex-1">
                    Leave
                  </button>
                )}
                {canSpin && (
                  <button type="button" onClick={() => live && spin(live.id)} disabled={busy} className="btn btn-primary flex-1">
                    {busy ? "Spinning…" : "Spin"}
                  </button>
                )}
              </div>
            )}
          </div>
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
