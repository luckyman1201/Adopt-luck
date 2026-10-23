"use client";

import { JoinPickerController } from "@/components/modals";
import { PetAvatar, PlayerChip, ValueGem } from "@/components/pet-tile";
import { Toolbar } from "@/components/site-shell";
import { getPet, itemsValue } from "@/lib/pets";
import { samePlayer, seatedIn } from "@/lib/player";
import { useStore } from "@/lib/store";
import { useState } from "react";

export function RaceView() {
  const { races, joinRace, startRace, cancelGame, user, requireUser } = useStore();
  const [joinId, setJoinId] = useState<string | null>(null);
  const live = races[0];
  const inLive = seatedIn(live?.entries ?? [], user);
  const isCreator = Boolean(live && samePlayer(live.entries[0]?.player, user));

  return (
    <div>
      <Toolbar createMode="race" />
      <div className="fade-up rounded-xl border border-white/10 bg-card/80 p-4">
        {!live && <div className="py-16 text-center text-white/40">Create a race to open the track.</div>}
        {live && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-semibold uppercase text-white/50">{live.status}</div>
              <ValueGem value={live.entries.reduce((sum, entry) => sum + itemsValue(entry.items), 0)} className="text-gold" />
            </div>
            <div className="space-y-3">
              {live.entries.map((entry, index) => {
                const lead = entry.items[0];
                const pet = lead ? getPet(lead.petId) : undefined;
                const finished = live.status === "done";
                const won = live.winnerId === entry.player.id;
                const left = live.status === "racing" || finished ? (won || (!finished && index === 0) ? 88 : 62 + (index % 3) * 8) : 4;
                return (
                  <div key={entry.player.id} className="race-lane relative h-16 overflow-hidden rounded-xl border border-white/10">
                    <div className="racer absolute top-2 flex max-w-[70%] items-center gap-2" style={{ left: `${left}%`, transitionDelay: `${index * 80}ms` }}>
                      {lead && <PetAvatar item={lead} size={36} />}
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold md:text-sm">{entry.player.name}</div>
                        <div className="truncate text-[10px] uppercase text-white/50">{pet?.name}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {live.status === "open" && isCreator && (
                <button onClick={() => cancelGame(live.id)} className="btn btn-cancel">
                  Cancel race
                </button>
              )}
              {live.status === "open" && inLive && !isCreator && (
                <button onClick={() => cancelGame(live.id)} className="btn btn-cancel">
                  Leave
                </button>
              )}
              {live.status === "open" && !inLive && (
                <button
                  onClick={() => {
                    if (!requireUser()) return;
                    setJoinId(live.id);
                  }}
                  className="btn btn-muted"
                >
                  Join race
                </button>
              )}
              {live.status === "open" && live.entries.length >= 2 && (
                <button onClick={() => startRace(live.id)} className="btn btn-primary">
                  Start
                </button>
              )}
            </div>
          </>
        )}
      </div>
      <div className="mt-3 space-y-2">
        {races.slice(1).map((game) => (
          <div key={game.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-card/70 px-3 py-3 md:px-4">
            <div className="flex min-w-0 items-center gap-1 overflow-hidden">
              {game.entries.map((entry) => (
                <PlayerChip key={entry.player.id} player={entry.player} compact />
              ))}
            </div>
            {game.status === "open" && samePlayer(game.entries[0]?.player, user) && (
              <button onClick={() => cancelGame(game.id)} className="btn btn-cancel h-9">
                Cancel
              </button>
            )}
            {game.status === "open" && !samePlayer(game.entries[0]?.player, user) && !seatedIn(game.entries, user) && (
              <button
                onClick={() => {
                  if (!requireUser()) return;
                  setJoinId(game.id);
                }}
                className="btn btn-primary h-9"
              >
                Join
              </button>
            )}
          </div>
        ))}
      </div>
      <JoinPickerController
        open={Boolean(joinId)}
        onClose={() => setJoinId(null)}
        title="Join Race"
        onConfirm={(items) => {
          if (joinId) joinRace(joinId, items);
          setJoinId(null);
        }}
      />
    </div>
  );
}
