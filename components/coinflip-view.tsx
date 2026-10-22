"use client";

import { InventoryPicker, Overlay } from "@/components/modals";
import { PetTile, PetStack, PlayerChip, ValueGem } from "@/components/pet-tile";
import { StatsRow } from "@/components/site-shell";
import { formatValue } from "@/lib/format";
import { canJoinValue, joinRange } from "@/lib/game-engine";
import { getPet, itemValue, itemsValue, VALUES_SOURCE, VALUES_UPDATED } from "@/lib/pets";
import { useStore } from "@/lib/store";
import type { CoinFlipGame, CoinSide, PetInstance, Player } from "@/lib/types";
import { useMemo, useRef, useState, type ReactNode } from "react";

export const COIN_ART: Record<CoinSide, string> = {
  heads: "/coin-heads.png?v=2",
  tails: "/coin-tails.png?v=2",
};

export function CoinToken({ side, className }: { side: CoinSide; className?: string }) {
  return (
    <img
      src={COIN_ART[side]}
      alt={side === "heads" ? "Heads" : "Tails"}
      className={className}
      draggable={false}
    />
  );
}

export function Coin({
  flipping,
  result,
  face,
  settled,
  size = "md",
}: {
  flipping?: boolean;
  result?: CoinSide;
  face: CoinSide;
  settled?: boolean;
  size?: "sm" | "md" | "row";
}) {
  const shown = settled && result ? result : flipping ? result || face : face;
  const flight = flipping ? "is-toss" : settled ? "is-landed" : "is-idle";
  const spin = flipping
    ? result === "tails"
      ? "spin-tails"
      : result === "heads"
        ? "spin-heads"
        : "spin-heads"
    : shown === "tails"
      ? "rest-tails"
      : "rest-heads";

  const rim = Array.from({ length: 16 }, (_, index) => -7 + index * (14 / 15));

  return (
    <div className={`coin-arena ${size === "sm" ? "coin-arena-sm" : ""} ${size === "row" ? "coin-arena-row" : ""}`}>
      <div className={`coin-shadow ${flight}`} />
      <div className={`coin-toss ${flight}`}>
        <div className="coin-3d">
          <div className={`coin-puck ${spin}`}>
            {rim.map((z) => (
              <div key={z} className="coin-rim" style={{ transform: `translateZ(${z}px)` }}>
                <CoinToken side="heads" />
              </div>
            ))}
            <div className="coin-face coin-heads">
              <CoinToken side="heads" />
            </div>
            <div className="coin-face coin-tails">
              <CoinToken side="tails" />
            </div>
          </div>
        </div>
      </div>
      {settled && result && size !== "row" && (
        <div className="coin-result">{result === "heads" ? "Heads" : "Tails"} wins</div>
      )}
    </div>
  );
}

function SidePick({ side, onChange }: { side: CoinSide; onChange: (side: CoinSide) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
      <button type="button" className={`side-pick ${side === "heads" ? "is-on" : ""}`} onClick={() => onChange("heads")}>
        <span className="side-pick-coin">
          <CoinToken side="heads" />
        </span>
        <span>Heads</span>
      </button>
      <button type="button" className={`side-pick ${side === "tails" ? "is-on" : ""}`} onClick={() => onChange("tails")}>
        <span className="side-pick-coin">
          <CoinToken side="tails" />
        </span>
        <span>Tails</span>
      </button>
    </div>
  );
}

function PetPanel({
  title,
  items,
  selected,
  onToggle,
  empty,
}: {
  title: string;
  items: PetInstance[];
  selected?: PetInstance[];
  onToggle?: (item: PetInstance) => void;
  empty?: string;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"high" | "low">("high");
  const selectedIds = new Set((selected ?? []).map((item) => item.uid));
  const rows = useMemo(() => {
    const filtered = items.filter((item) => (getPet(item.petId)?.name || item.petId).toLowerCase().includes(query.toLowerCase()));
    return filtered.sort((a, b) => (sort === "high" ? itemValue(b) - itemValue(a) : itemValue(a) - itemValue(b)));
  }, [items, query, sort]);

  return (
    <div className="cf-panel">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for..."
          className="h-10 min-w-0 flex-1 rounded-lg bg-input px-3 text-sm outline-none ring-1 ring-white/10"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as "high" | "low")}
          className="h-10 shrink-0 rounded-lg bg-input px-2 text-sm outline-none ring-1 ring-white/10"
        >
          <option value="high">High → Low</option>
          <option value="low">Low → High</option>
        </select>
        <div className="grid h-10 place-items-center rounded-lg bg-primary/15 px-3 text-xs font-bold text-primary">
          ADOPT ME
        </div>
      </div>
      {rows.length ? (
        <div className="scroll-thin grid max-h-[320px] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
          {rows.map((item) => (
            <PetTile
              key={item.uid}
              item={item}
              compact
              selected={selectedIds.has(item.uid)}
              onClick={onToggle ? () => onToggle(item) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="grid min-h-[180px] place-items-center rounded-xl border border-dashed border-white/10 px-4 text-center text-sm text-white/40">
          {empty || `No ${title.toLowerCase()} yet.`}
        </div>
      )}
    </div>
  );
}

function TableSeat({
  player,
  side,
  items,
  value,
  won,
  mirror,
  action,
}: {
  player?: CoinFlipGame["creator"];
  side: CoinSide;
  items: PetInstance[];
  value: number;
  won?: boolean;
  mirror?: boolean;
  action?: ReactNode;
}) {
  if (!player) {
    return <div className={`flex items-center ${mirror ? "justify-end" : ""}`}>{action}</div>;
  }

  const meta = (
    <div className={`flex min-w-0 flex-col gap-1 ${mirror ? "items-end text-right" : ""}`}>
      <PlayerChip player={player} />
      <div className={`flex items-center gap-1.5 ${mirror ? "flex-row-reverse" : ""}`}>
        <CoinToken side={side} className="h-5 w-5 rounded-full" />
        <span className="hidden text-[10px] font-bold uppercase tracking-[0.14em] text-white/40 sm:inline">
          {side === "heads" ? "Heads" : "Tails"}
        </span>
        <ValueGem value={value} className="text-sm text-gold" />
      </div>
    </div>
  );

  return (
    <div className={`flex min-w-0 items-center gap-2.5 sm:gap-3 ${mirror ? "flex-row-reverse" : ""} ${won === false ? "opacity-40" : ""}`}>
      <PetStack items={items} max={3} size={40} />
      {meta}
    </div>
  );
}

function winnerOf(game: CoinFlipGame) {
  if (game.status !== "done" || !game.result) return undefined;
  return game.result === game.creatorSide ? game.creator : game.joiner;
}

function CoinRow({
  game,
  own,
  highlight,
  onOpen,
}: {
  game: CoinFlipGame;
  own?: boolean;
  highlight?: boolean;
  onOpen: () => void;
}) {
  const hostValue = itemsValue(game.creatorItems);
  const joinValue = game.joinerItems ? itemsValue(game.joinerItems) : 0;
  const flipping = game.status === "flipping";
  const settled = game.status === "done";
  const oppSide = game.creatorSide === "heads" ? "tails" : "heads";
  const shown = (settled && game.result) || game.creatorSide;
  const winner = winnerOf(game);
  const hostWon = settled ? winner?.id === game.creator.id : undefined;
  const oppWon = settled && game.joiner ? winner?.id === game.joiner.id : undefined;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className={`grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)] items-center gap-2 rounded-xl border px-3 py-2.5 text-left sm:grid-cols-[minmax(0,1fr)_5.5rem_minmax(0,1fr)] sm:gap-4 sm:px-4 ${
        flipping
          ? "border-accent/50 bg-card"
          : settled
            ? "border-gold/25 bg-card"
            : highlight
              ? "border-primary/60 bg-card ring-2 ring-primary/30"
              : "border-white/10 bg-card hover:border-white/25"
      }`}
    >
      <TableSeat
        player={game.creator}
        side={game.creatorSide}
        items={game.creatorItems}
        value={hostValue}
        won={hostWon}
      />
      <div className="flex flex-col items-center justify-center">
        {flipping ? (
          <div className="relative z-10 overflow-visible">
            <Coin flipping result={game.result} face={game.creatorSide} size="row" />
          </div>
        ) : (
          <CoinToken side={shown} className="h-12 w-12 rounded-full object-contain sm:h-14 sm:w-14" />
        )}
        <div
          className={`mt-0.5 max-w-[7rem] truncate text-center text-[10px] font-extrabold uppercase tracking-[0.12em] ${
            settled ? "text-gold" : flipping ? "text-sky" : "text-white/35"
          }`}
        >
          {winner ? `${winner.name} won` : flipping ? "Flip" : "vs"}
        </div>
      </div>
      <TableSeat
        player={game.joiner}
        side={oppSide}
        items={game.joinerItems ?? []}
        value={joinValue}
        won={oppWon}
        mirror
        action={
          <span className="btn btn-primary h-9 px-4 text-xs sm:h-10 sm:px-5 sm:text-sm">
            {game.status === "open" ? (own ? "View" : "Join") : "View"}
          </span>
        }
      />
    </div>
  );
}

function Portrait({ player, side, empty }: { player?: Player; side: CoinSide; empty?: string }) {
  const [failed, setFailed] = useState(false);
  const src = player?.robloxId
    ? `/api/avatar/${player.robloxId}`
    : player?.avatar?.startsWith("http") || player?.avatar?.startsWith("/api/avatar/")
      ? player.avatar
      : undefined;
  const name = player?.name || empty || "Waiting";

  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      {src && !failed ? (
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          className="h-20 w-20 rounded-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="grid h-20 w-20 place-items-center rounded-full text-2xl font-bold text-black"
          style={{ background: player ? `hsl(${player.hue} 80% 68%)` : "#243056" }}
        >
          {player ? name.slice(0, 1).toUpperCase() : "?"}
        </div>
      )}
      <div className="max-w-[10rem] truncate text-sm font-semibold">{name}</div>
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
        <CoinToken side={side} className="h-5 w-5 rounded-full" />
        {side === "heads" ? "Heads" : "Tails"}
      </div>
    </div>
  );
}

function CoinMatchModal({
  game,
  onClose,
}: {
  game: CoinFlipGame;
  onClose: () => void;
}) {
  const { user, inventory, joinCoin, callOpponent, requireUser } = useStore();
  const [stake, setStake] = useState<PetInstance[]>([]);
  const [busy, setBusy] = useState(false);
  const hostValue = itemsValue(game.creatorItems);
  const joinValue = game.joinerItems ? itemsValue(game.joinerItems) : 0;
  const oppSide = game.creatorSide === "heads" ? "tails" : "heads";
  const flipping = game.status === "flipping";
  const settled = game.status === "done";
  const shown = (settled && game.result) || game.creatorSide;
  const winner = winnerOf(game);
  const own = game.creator.id === user?.id;
  const canJoin = game.status === "open" && !own && !game.joiner;
  const canCallBot = game.status === "open" && own && !game.joiner;
  const stakeValue = itemsValue(stake);
  const range = joinRange(hostValue);
  const stakeOk = canJoinValue(hostValue, stakeValue);

  async function startJoin() {
    if (!requireUser() || !stake.length || !stakeOk || busy) return;
    setBusy(true);
    await joinCoin(game.id, stake);
    setStake([]);
    setBusy(false);
  }

  async function startBot() {
    if (!requireUser() || busy) return;
    setBusy(true);
    await callOpponent(game.id);
    setBusy(false);
  }

  return (
    <Overlay onClose={onClose}>
      <div className="p-5 md:p-6">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">CoinFlip</div>
            <div className="mt-1 font-mono text-xs text-white/35">#{game.id}</div>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-lg text-white/70" aria-label="Close">
            ×
          </button>
        </div>

        {winner && (
          <div className="mb-5 rounded-xl border border-gold/40 bg-gold/10 px-4 py-3 text-center">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-gold">Winner</div>
            <div className="mt-1 flex justify-center">
              <PlayerChip player={winner} />
            </div>
            <div className="mt-1 text-sm text-white/70">
              {(game.result === "heads" ? "Heads" : "Tails")} landed · {winner.name} takes the pets
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 items-center gap-2">
          <div className="flex justify-center">
            <Portrait player={game.creator} side={game.creatorSide} />
          </div>
          <div className="coin-match flex flex-col items-center justify-center">
            {flipping ? (
              <Coin flipping result={game.result} face={game.creatorSide} settled={false} size="row" />
            ) : (
              <CoinToken side={shown} className="h-24 w-24 rounded-full object-contain" />
            )}
            <div className={`mt-2 text-xs font-extrabold uppercase tracking-[0.16em] ${settled ? "text-gold" : flipping ? "text-sky" : "text-white/35"}`}>
              {winner ? "Landed" : flipping ? "Flipping" : "vs"}
            </div>
          </div>
          <div className="flex justify-center">
            <Portrait player={game.joiner} side={oppSide} empty="Waiting for opponent" />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-input/70 px-3 py-3">
            <div className="flex items-center justify-between text-xs text-white/45">
              <span>50%</span>
              <ValueGem value={hostValue} className="text-gold" />
            </div>
            <div className="mt-3">
              <PetStack items={game.creatorItems} max={6} size={48} />
            </div>
          </div>
          <div className="rounded-xl bg-input/70 px-3 py-3">
            <div className="flex items-center justify-between text-xs text-white/45">
              <span>50%</span>
              <ValueGem value={game.joiner ? joinValue : hostValue} className="text-gold" />
            </div>
            <div className="mt-3">
              {game.joinerItems?.length ? (
                <PetStack items={game.joinerItems} max={6} size={48} />
              ) : (
                <div className="text-sm text-white/35">No opponent yet</div>
              )}
            </div>
          </div>
        </div>

        {canJoin && (
          <div className="mt-5">
            <p className="mb-3 text-sm text-white/55">
              Select pets between {formatValue(range.min)} and {formatValue(range.max)}, then start the flip.
            </p>
            <InventoryPicker
              nested
              selected={stake}
              targetValue={hostValue}
              onToggle={(item) =>
                setStake((prev) => (prev.some((row) => row.uid === item.uid) ? prev.filter((row) => row.uid !== item.uid) : [...prev, item]))
              }
            />
            <button onClick={startJoin} disabled={!stake.length || !stakeOk || busy} className="btn btn-primary mt-4 h-11 w-full">
              {busy ? "Starting…" : "Join and flip"}
            </button>
          </div>
        )}

        {canCallBot && (
          <div className="mt-5 flex flex-col items-center gap-3">
            <p className="text-center text-sm text-white/55">
              Wait for a player, or play solo against a bot. The flip starts only after you confirm.
            </p>
            <button onClick={startBot} disabled={busy} className="btn btn-primary h-11 min-w-48 px-8">
              {busy ? "Starting…" : "Play vs bot"}
            </button>
          </div>
        )}

        {game.status === "open" && own && (
          <p className="mt-3 text-center text-xs text-white/35">Your table is live. Anyone can open this window and join.</p>
        )}
        {flipping && <p className="mt-5 text-center text-sm text-white/50">Coin is in the air…</p>}
      </div>
    </Overlay>
  );
}

export function CoinFlipView() {
  const { coins, inventory, user, createCoin, requireUser, openModal } = useStore();
  const [selected, setSelected] = useState<PetInstance[]>([]);
  const [side, setSide] = useState<CoinSide>("heads");
  const [viewId, setViewId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedValue = itemsValue(selected);
  const viewing = coins.find((item) => item.id === viewId);
  const mine = coins.find((item) => item.creator.id === user?.id && item.status === "open");
  const preview = coins.find((item) => item.id === highlightId) || mine || coins.find((item) => item.status === "open");
  const opponentItems = preview?.creatorItems ?? [];
  const opponentValue = itemsValue(opponentItems);
  const tables = useMemo(() => {
    const rank = (status: CoinFlipGame["status"]) => (status === "open" ? 0 : status === "flipping" ? 1 : 2);
    return [...coins].sort((a, b) => rank(a.status) - rank(b.status) || b.createdAt - a.createdAt);
  }, [coins]);

  function toggle(item: PetInstance) {
    setSelected((prev) => (prev.some((row) => row.uid === item.uid) ? prev.filter((row) => row.uid !== item.uid) : [...prev, item]));
  }

  function openTable(game: CoinFlipGame) {
    if (!requireUser()) return;
    setHighlightId(game.id);
    setViewId(game.id);
  }

  async function submit() {
    if (!requireUser() || !selected.length || busy) return;
    setBusy(true);
    const created = await createCoin(selected, side);
    setSelected([]);
    if (created) {
      setHighlightId(created.id);
      window.setTimeout(() => setHighlightId((id) => (id === created.id ? null : id)), 8000);
      window.requestAnimationFrame(() => {
        listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    setBusy(false);
  }

  return (
    <div className="flex w-full flex-col">
      <StatsRow />
      <div className="mb-3 mt-3 flex items-center justify-between gap-3 md:mt-4">
        <a href={VALUES_SOURCE} target="_blank" rel="noreferrer" className="truncate text-[11px] font-semibold text-white/40 hover:text-gold md:text-xs">
          Elvebredd · {VALUES_UPDATED}
        </a>
        <button onClick={() => openModal("history")} className="btn btn-muted h-9 px-3 text-xs md:h-10 md:px-4 md:text-sm">
          History
        </button>
      </div>

      <div className="cf-board fade-up">
        <div className="cf-totals">
          <div>
            <div className="cf-kicker">Selected total</div>
            <ValueGem value={selectedValue} className="mt-1 text-lg text-gold" />
          </div>
          <div className="flex flex-col items-center gap-2 md:gap-3">
            <SidePick side={side} onChange={setSide} />
            <button onClick={submit} disabled={!selected.length || busy} className="btn btn-primary h-11 w-full min-w-0 px-6 sm:w-auto sm:min-w-40 sm:px-8">
              {busy ? "Creating…" : "Create"}
            </button>
          </div>
          <div className="md:text-right">
            <div className="cf-kicker">Opponent total</div>
            {preview ? (
              <ValueGem value={opponentValue} className="mt-1 text-lg text-gold" />
            ) : (
              <div className="mt-1 text-lg font-semibold text-white/35">0</div>
            )}
          </div>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <PetPanel
            title="Select item"
            items={user ? inventory : []}
            selected={selected}
            onToggle={toggle}
            empty={user ? "Nursery is empty. Deposit pets through the trade bot." : "Login to load your nursery."}
          />
          <PetPanel
            title="Select item"
            items={opponentItems}
            empty={preview ? "This table has no pets." : "Create a table, or click a lobby below to inspect it."}
          />
        </div>
      </div>

      <div ref={listRef} className="mt-4 flex flex-col gap-2">
        <div className="flex items-center justify-between px-0.5">
          <div className="text-sm font-semibold">Live tables</div>
          <div className="text-xs font-semibold text-white/40">{tables.length} games</div>
        </div>
        {tables.map((item) => (
          <CoinRow
            key={item.id}
            game={item}
            own={item.creator.id === user?.id}
            highlight={item.id === highlightId}
            onOpen={() => openTable(item)}
          />
        ))}
        {!coins.length && (
          <div className="rounded-2xl border border-white/10 bg-card/50 py-16 text-center text-white/40">No open tables.</div>
        )}
      </div>
      {viewing && <CoinMatchModal game={viewing} onClose={() => setViewId(null)} />}
    </div>
  );
}
