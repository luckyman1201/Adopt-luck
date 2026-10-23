"use client";

import { PetAvatar, ValueGem } from "@/components/pet-tile";
import { formatValue } from "@/lib/format";
import { upgradeChance } from "@/lib/game-engine";
import { getPet, itemValue, itemsValue } from "@/lib/pets";
import { useStore } from "@/lib/store";
import type { PetInstance, UpgradeRoll } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";

const ORANGE = "#FFA834";
const WING = "#171921";

function FaceStack({ items, align = "left" }: { items: PetInstance[]; align?: "left" | "right" }) {
  const shown = items.slice(0, 5);
  const fillers = Math.max(0, 5 - shown.length);
  const faces = align === "right" ? [...shown] : [...Array(fillers).fill(null), ...shown];
  if (align === "right") faces.push(...Array(fillers).fill(null));
  return (
    <div className={`flex items-center ${align === "right" ? "flex-row-reverse" : ""} -space-x-4`}>
      {faces.map((item, index) =>
        item ? (
          <div
            key={`${item.uid}-${index}`}
            className="grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-white/10 bg-background"
            style={{ zIndex: 10 + index }}
          >
            <PetAvatar item={item} size={32} />
          </div>
        ) : (
          <div
            key={`empty-${index}`}
            className="h-10 w-10 rounded-full border border-white/10 bg-background"
            style={{ zIndex: index }}
          />
        ),
      )}
    </div>
  );
}

function LiveWinCard({ roll }: { roll: UpgradeRoll }) {
  const stake = itemsValue(roll.stakeItems);
  const prize = itemsValue([roll.target]);
  const profit = Math.max(0, prize - stake);
  const multi = stake > 0 ? prize / stake : 0;
  const avatar = roll.player.robloxId ? `/api/avatar/${roll.player.robloxId}` : roll.player.avatar;
  return (
    <div className="flex w-[22rem] shrink-0 flex-col gap-2 rounded-md border border-white/10 bg-card p-4">
      <div className="flex justify-between gap-2 font-semibold text-[#FFA834]">
        <div className="flex items-center gap-1 text-xs">
          <img src="/gem.svg" alt="" width={16} height={16} className="h-4 w-4" />
          <span>{formatValue(stake)}</span>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-[#FFA834]/20 px-2 py-1 text-sm">
          <span>+</span>
          <img src="/gem.svg" alt="" width={16} height={16} className="h-4 w-4" />
          <span>{formatValue(profit)}</span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <img src="/gem.svg" alt="" width={16} height={16} className="h-4 w-4" />
          <span>{formatValue(prize)}</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <FaceStack items={roll.stakeItems} />
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/80" aria-hidden>
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
        <FaceStack items={[roll.target]} align="right" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {avatar ? (
            <img src={avatar} alt="" width={16} height={16} className="h-4 w-4 rounded-full object-cover" />
          ) : (
            <span className="grid h-4 w-4 place-items-center rounded-full bg-white/10 text-[9px]">{roll.player.name.slice(0, 1)}</span>
          )}
          <span className="truncate text-sm font-semibold">{roll.player.name}</span>
        </div>
        <div>
          <span className="font-semibold text-[#FFA834]">{multi.toFixed(2)}</span>
          <span>x</span>
        </div>
      </div>
    </div>
  );
}

function Wing({ side }: { side: "left" | "right" }) {
  const d =
    side === "left"
      ? "M0.291 20.321C0.291 8.773 10.044-0.376 21.569 0.362L625.169 39V327L21.537 364.674C10.024 365.393 0.291 356.249 0.291 344.713V20.321Z"
      : "M625.709 20.321C625.709 8.773 615.956-0.376 604.431 0.362L0.831 39V327L604.463 364.674C615.976 365.393 625.709 356.249 625.709 344.713V20.321Z";
  return (
    <svg viewBox="0 0 626 365" className="aspect-[1.7] h-auto w-[43%]" fill={WING} aria-hidden>
      <path d={d} />
    </svg>
  );
}

function ChanceWheel({ chance, compact }: { chance: number; compact?: boolean }) {
  const sweep = Math.max(0, Math.min(359.99, chance * 3.6));
  const ring = `conic-gradient(${ORANGE} 0deg ${sweep}deg, transparent ${sweep}deg 360deg)`;
  return (
    <div className={`relative z-20 aspect-square ${compact ? "w-[58%]" : "w-[24.75%]"}`}>
      <span
        className="pointer-events-none absolute left-1/2 z-50 h-0 w-0"
        style={{
          top: 0,
          borderStyle: "solid",
          borderLeftWidth: 8,
          borderRightWidth: 8,
          borderTopWidth: 16,
          borderBottomWidth: 0,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: ORANGE,
          transform: "translate(-50%, calc(-100% + 2px))",
        }}
      />
      <div className="absolute inset-0 rounded-full opacity-20 blur-2xl" style={{ background: ring }} />
      <div className="absolute inset-0 rounded-full" style={{ background: ring }} />
      <div className="absolute inset-[5px] grid place-items-center overflow-hidden rounded-full bg-background">
        <img src="/logo.svg" alt="" className="pointer-events-none absolute inset-[20%] aspect-square w-[60%] opacity-5" />
        <div className="relative z-10 px-3 text-center">
          <div className={`block font-semibold ${compact ? "text-3xl" : "text-5xl lg:text-6xl"}`}>{chance.toFixed(2)}%</div>
          <div className={`font-medium text-white/80 ${compact ? "text-xs" : "text-sm"}`}>
            {compact ? "Chance" : "Chance of receiving selected items"}
          </div>
        </div>
      </div>
    </div>
  );
}

function SortMenu({
  value,
  onChange,
}: {
  value: "high" | "low";
  onChange: (value: "high" | "low") => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const label = value === "high" ? "High - Low" : "Low - High";

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={root} className="relative w-full md:w-[180px]">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-12 w-full items-center justify-between rounded-lg border-2 border-white/25 bg-[#1c2540] px-3 text-sm font-semibold text-white/80 outline-none"
      >
        <span>{label}</span>
        <svg viewBox="0 0 24 24" className="h-4 w-4 opacity-50" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-white/15 bg-[#1c2540] py-1 shadow-xl">
          {(
            [
              ["high", "High - Low"],
              ["low", "Low - High"],
            ] as const
          ).map(([key, text]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                onChange(key);
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm font-semibold ${
                value === key ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              {text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectToolbar({
  query,
  onQuery,
  sort,
  onSort,
}: {
  query: string;
  onQuery: (value: string) => void;
  sort: "high" | "low";
  onSort: (value: "high" | "low") => void;
}) {
  return (
    <div className="flex flex-col items-start gap-2 md:flex-row md:items-end">
      <div className="grid w-full items-center gap-2 md:max-w-sm">
        <label className="text-sm font-medium opacity-80">Select Item</label>
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search for an item.."
          className="h-12 w-full rounded-lg border-2 border-white/25 bg-transparent px-3 text-sm font-semibold text-white/80 placeholder:text-white/50 outline-none focus-visible:border-white/60"
        />
      </div>
      <div className="flex w-full flex-row gap-2">
        <SortMenu value={sort} onChange={onSort} />
        <div className="grid h-12 w-full place-items-center rounded-lg border-2 border-white/25 text-sm font-semibold text-white/50 md:w-[180px]">
          ADOPT ME
        </div>
      </div>
    </div>
  );
}

function StockTile({
  item,
  selected,
  onClick,
}: {
  item: PetInstance;
  selected?: boolean;
  onClick: () => void;
}) {
  const pet = getPet(item.petId);
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative h-fit overflow-hidden rounded-lg border transition ${
        selected ? "border-[#FFA834]" : "border-transparent hover:border-white/20"
      }`}
    >
      <div className="flex h-full w-full flex-col items-center gap-3 bg-[#141a2b] px-3 pb-3 pt-6">
        <PetAvatar item={item} size={88} />
        <div className="flex w-full items-center justify-between gap-2 font-semibold">
          <div className="max-w-[96px] truncate text-left text-sm">{pet?.name || item.petId}</div>
          <ValueGem value={itemValue(item)} className="text-sm text-[#FFA834]" />
        </div>
      </div>
    </button>
  );
}

export function UpgraderView() {
  const { rollUpgrade, requireUser, upgrades, inventory, catalog, openModal } = useStore();
  const [stake, setStake] = useState<PetInstance[]>([]);
  const [target, setTarget] = useState<PetInstance | null>(null);
  const [busy, setBusy] = useState(false);
  const [invQuery, setInvQuery] = useState("");
  const [stockQuery, setStockQuery] = useState("");
  const [invSort, setInvSort] = useState<"high" | "low">("high");
  const [stockSort, setStockSort] = useState<"high" | "low">("high");

  const stakeValue = itemsValue(stake);
  const targetValue = target ? itemsValue([target]) : 0;
  const chance = useMemo(() => (target ? upgradeChance(stakeValue, targetValue) : 0), [stakeValue, target, targetValue]);
  const multiplier = stakeValue > 0 && targetValue > 0 ? targetValue / stakeValue : 0;
  const wins = upgrades.filter((roll) => roll.won).slice(0, 12);

  const inventoryRows = useMemo(() => {
    const rows = inventory.filter((item) => (getPet(item.petId)?.name || item.petId).toLowerCase().includes(invQuery.toLowerCase()));
    return rows.sort((a, b) => (invSort === "high" ? itemValue(b) - itemValue(a) : itemValue(a) - itemValue(b)));
  }, [inventory, invQuery, invSort]);

  const stockRows = useMemo(() => {
    const rows = catalog
      .filter((pet) => pet.name.toLowerCase().includes(stockQuery.toLowerCase()))
      .map(
        (pet): PetInstance => ({
          uid: `target_${pet.id}`,
          petId: pet.id,
          fly: true,
          ride: true,
          neon: false,
          mega: false,
        }),
      );
    return rows.sort((a, b) => (stockSort === "high" ? itemValue(b) - itemValue(a) : itemValue(a) - itemValue(b)));
  }, [catalog, stockQuery, stockSort]);

  async function play() {
    if (!requireUser() || !target || !stake.length || busy) return;
    setBusy(true);
    await rollUpgrade(stake, target);
    setStake([]);
    setTarget(null);
    setBusy(false);
  }

  function deposit() {
    if (!requireUser()) return;
    openModal("history");
  }

  return (
    <div className="flex w-full flex-col">
      <div className="overflow-hidden rounded-md border border-white/10 bg-card p-4">
        <div className="mb-3 flex items-center gap-2 font-semibold text-white/80">
          <span className="relative grid h-4 w-4 place-items-center">
            <span className="absolute h-3 w-3 animate-pulse rounded-full bg-[#e85b6c]/50" />
            <svg viewBox="0 0 24 24" className="relative h-3.5 w-3.5 fill-current" aria-hidden>
              <path d="M12 3a1 1 0 0 1 1 1v2.06A7.002 7.002 0 0 1 19 13v1h1a1 1 0 1 1 0 2h-2v-3a5 5 0 0 0-10 0v3H6a1 1 0 1 1 0-2h1v-1a7.002 7.002 0 0 1 6-6.94V4a1 1 0 0 1 1-1zm-6.5 16h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1 0-1zM8 20.5h8a.5.5 0 0 1 0 1H8a.5.5 0 0 1 0-1z" />
            </svg>
          </span>
          LIVE WINS
        </div>
        <div className="flex min-h-[9.5rem] gap-2 overflow-x-auto pb-1">
          {wins.map((roll) => (
            <LiveWinCard key={roll.id} roll={roll} />
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-md border border-white/10 bg-nav p-6">
        <div className="mb-4 hidden md:block">
          <div className="relative w-full">
            <div className="flex w-full justify-between opacity-0" aria-hidden>
              <Wing side="left" />
              <Wing side="right" />
            </div>
            <div className="pointer-events-none absolute inset-0 flex w-full justify-between opacity-70 blur-md">
              <Wing side="left" />
              <Wing side="right" />
            </div>
            <div className="pointer-events-none absolute inset-0 z-10 flex w-full justify-between">
              <Wing side="left" />
              <Wing side="right" />
            </div>
            <div className="absolute inset-0 z-20 grid place-items-center">
              <ChanceWheel chance={chance} />
            </div>
          </div>
        </div>

        <div className="mb-4 grid place-items-center md:hidden">
          <ChanceWheel chance={chance} compact />
        </div>

        <div className="mb-4 text-center">
          <span>Multiplier: </span>
          <span className="font-semibold text-[#FFA834]">{multiplier.toFixed(2)}</span>x
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Selected Total</div>
            <ValueGem value={stakeValue} className="text-[#FFA834]" />
          </div>
          <button
            type="button"
            onClick={play}
            disabled={!stake.length || !target || busy}
            className="inline-flex h-12 w-60 shrink-0 items-center justify-center rounded-md bg-[#FFA834] text-lg font-semibold text-[#1a1204] hover:bg-[#ffbe67] disabled:pointer-events-none disabled:opacity-50"
          >
            {busy ? "Rolling…" : "Upgrade"}
          </button>
          <div className="flex flex-col items-end">
            <div className="text-lg font-semibold">Desired Total</div>
            <ValueGem value={targetValue} className="text-[#FFA834]" />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 rounded-md border border-white/10 bg-card p-4 lg:flex-row">
        <div className="w-full lg:w-[50%]">
          <SelectToolbar query={invQuery} onQuery={setInvQuery} sort={invSort} onSort={setInvSort} />
          <div className="scroll-thin mt-4 max-h-[400px] overflow-auto">
            {inventoryRows.length ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {inventoryRows.map((item) => (
                  <StockTile
                    key={item.uid}
                    item={item}
                    selected={stake.some((row) => row.uid === item.uid)}
                    onClick={() =>
                      setStake((prev) =>
                        prev.some((row) => row.uid === item.uid) ? prev.filter((row) => row.uid !== item.uid) : [...prev, item],
                      )
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="flex h-[280px] flex-col items-center justify-center">
                <span className="text-3xl font-medium">No Items!</span>
                <p className="mt-2 font-medium opacity-80">Your inventory seems to be empty...</p>
                <button
                  type="button"
                  onClick={deposit}
                  className="mt-6 inline-flex h-11 items-center rounded-md bg-[#FFA834] px-8 text-sm font-semibold text-[#1a1204]"
                >
                  Deposit Items
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="hidden w-px bg-white/10 lg:block" />
        <div className="w-full lg:w-[50%]">
          <SelectToolbar query={stockQuery} onQuery={setStockQuery} sort={stockSort} onSort={setStockSort} />
          <div className="scroll-thin mt-4 max-h-[400px] overflow-auto">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {stockRows.map((item) => (
                <StockTile
                  key={item.uid}
                  item={item}
                  selected={target?.petId === item.petId}
                  onClick={() => setTarget((prev) => (prev?.petId === item.petId ? null : item))}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
