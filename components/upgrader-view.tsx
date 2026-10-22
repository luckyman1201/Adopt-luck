"use client";

import { InventoryPicker, UpgradeTargetModal } from "@/components/modals";
import { PetTile, ValueGem } from "@/components/pet-tile";
import { StatsRow } from "@/components/site-shell";
import { upgradeChance } from "@/lib/game-engine";
import { itemsValue } from "@/lib/pets";
import { useStore } from "@/lib/store";
import type { PetInstance } from "@/lib/types";
import { useMemo, useState } from "react";

export function UpgraderView() {
  const { rollUpgrade, requireUser, upgrades, openModal } = useStore();
  const [stake, setStake] = useState<PetInstance[]>([]);
  const [target, setTarget] = useState<PetInstance | null>(null);
  const [picking, setPicking] = useState(false);
  const [spin, setSpin] = useState(0);
  const [busy, setBusy] = useState(false);

  const stakeValue = itemsValue(stake);
  const targetValue = target ? itemsValue([target]) : 0;
  const chance = useMemo(() => (target ? upgradeChance(stakeValue, targetValue) : 0), [stakeValue, target, targetValue]);

  async function play() {
    if (!requireUser() || !target || !stake.length) return;
    setBusy(true);
    const result = await rollUpgrade(stake, target);
    setSpin(result.roll * 1.8 + 720);
    window.setTimeout(() => {
      setBusy(false);
      setStake([]);
      setTarget(null);
    }, 2400);
  }

  return (
    <div>
      <StatsRow />
      <div className="mb-3 mt-4 flex justify-end">
        <button onClick={() => openModal("history")} className="btn btn-muted">
          History
        </button>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="game-card fade-up fade-up-1 rounded-2xl border border-white/10 bg-card/80 p-4">
          <h2 className="font-display text-xl font-extrabold">Your pets</h2>
          <p className="mb-3 text-xs text-white/45">Stake Elvebredd-valued pets to roll for a bigger one.</p>
          <InventoryPicker
            selected={stake}
            onToggle={(item) =>
              setStake((prev) => (prev.some((row) => row.uid === item.uid) ? prev.filter((row) => row.uid !== item.uid) : [...prev, item]))
            }
          />
        </div>
        <div className="game-card ug-panel fade-up fade-up-2 rounded-2xl border border-white/10 p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-xl font-extrabold">Target</h2>
            <button onClick={() => setPicking(true)} className="btn btn-primary h-9 shrink-0">
              Choose
            </button>
          </div>
          <div className="mt-4 grid place-items-center">
            <div className="ug-stage">
              <svg viewBox="0 0 220 128" className="h-full w-full">
                <defs>
                  <linearGradient id="ug-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3d6eff" />
                    <stop offset="100%" stopColor="#2fd37a" />
                  </linearGradient>
                  <filter id="ug-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <path
                  d="M18 110 A92 92 0 0 1 202 110"
                  fill="none"
                  stroke="#243154"
                  strokeWidth="16"
                  strokeLinecap="round"
                />
                {chance > 0 && (
                  <path
                    d="M18 110 A92 92 0 0 1 202 110"
                    fill="none"
                    stroke="url(#ug-grad)"
                    strokeWidth="16"
                    strokeLinecap="round"
                    strokeDasharray={`${(chance / 100) * 289} 289`}
                    filter="url(#ug-glow)"
                  />
                )}
              </svg>
              {(chance > 0 || busy) && (
                <div
                  className="ug-needle"
                  style={{ transform: `translateX(-50%) rotate(${-90 + (busy ? spin % 180 : chance)}deg)` }}
                />
              )}
              <div className="absolute inset-x-0 bottom-0 text-center">
                <div className="text-2xl font-extrabold">{chance.toFixed(2)}%</div>
                <div className="text-xs text-white/45">chance</div>
              </div>
            </div>
            {target ? <PetTile item={target} /> : <div className="text-sm text-white/40">Pick a pet to upgrade into</div>}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              Stake <ValueGem value={stakeValue} className="text-gold" />
            </span>
            <span>
              Target <ValueGem value={targetValue} className="text-gold" />
            </span>
          </div>
          <button
            onClick={play}
            disabled={!stake.length || !target || busy}
            className="btn btn-primary mt-4 h-11 w-full"
          >
            Roll upgrade
          </button>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {upgrades.slice(0, 5).map((roll) => (
          <div key={roll.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-card px-4 py-3 text-sm">
            <span>{roll.won ? "Hit" : "Miss"} · {roll.chance.toFixed(2)}%</span>
            <span className={roll.won ? "text-secondary" : "text-rose"}>{roll.roll.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <UpgradeTargetModal open={picking} onClose={() => setPicking(false)} onPick={(item) => { setTarget(item); setPicking(false); }} />
    </div>
  );
}
