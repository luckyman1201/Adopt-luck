"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { itemsValue, PETS, setCatalog, VALUES_UPDATED } from "@/lib/pets";
import type {
  ChatMessage,
  CoinFlipGame,
  CoinSide,
  HistoryItem,
  JackpotGame,
  LeaderStat,
  Pet,
  PetInstance,
  Player,
  RaceGame,
  UpgradeRoll,
} from "@/lib/types";

export { VALUES_UPDATED };

type Modal = "login" | "create" | "history" | "upgrade-pick" | null;
type CreateMode = "coinflip" | "jackpot" | "race";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const raw = await res.text();
  let data: T & { error?: string };
  try {
    data = JSON.parse(raw) as T & { error?: string };
  } catch {
    throw new Error(res.ok ? "Bad server response" : "Could not reach the server");
  }
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

type Store = {
  splash: boolean;
  user: Player | null;
  catalog: Pet[];
  robloxEnabled: boolean;
  inventory: PetInstance[];
  coins: CoinFlipGame[];
  jackpots: JackpotGame[];
  races: RaceGame[];
  upgrades: UpgradeRoll[];
  history: HistoryItem[];
  chat: ChatMessage[];
  stats: Record<string, LeaderStat>;
  modal: Modal;
  createMode: CreateMode;
  toast: string | null;
  login: (
    username: string,
    options?: { verify?: boolean },
  ) => Promise<{ step?: string; code?: string; profileUrl?: string; username?: string } | void>;
  logout: () => Promise<void>;
  openModal: (modal: Modal, createMode?: CreateMode) => void;
  closeModal: () => void;
  sendChat: (text: string) => Promise<void>;
  createCoin: (items: PetInstance[], side: CoinSide) => Promise<CoinFlipGame | undefined>;
  joinCoin: (gameId: string, items: PetInstance[]) => Promise<void>;
  callOpponent: (gameId: string) => Promise<void>;
  createJackpot: (items: PetInstance[]) => Promise<void>;
  joinJackpot: (gameId: string, items: PetInstance[]) => Promise<void>;
  spinJackpot: (gameId: string) => Promise<void>;
  createRace: (items: PetInstance[]) => Promise<void>;
  joinRace: (gameId: string, items: PetInstance[]) => Promise<void>;
  startRace: (gameId: string) => Promise<void>;
  rollUpgrade: (stake: PetInstance[], target: PetInstance) => Promise<{ chance: number; roll: number; won: boolean }>;
  requireUser: () => boolean;
  totals: { items: number; value: number; active: number };
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [splash, setSplash] = useState(false);
  const [user, setUser] = useState<Player | null>(null);
  const [catalog, setLocalCatalog] = useState<Pet[]>(PETS);
  const [robloxEnabled, setRobloxEnabled] = useState(false);
  const [inventory, setInventory] = useState<PetInstance[]>([]);
  const [coins, setCoins] = useState<CoinFlipGame[]>([]);
  const [jackpots, setJackpots] = useState<JackpotGame[]>([]);
  const [races, setRaces] = useState<RaceGame[]>([]);
  const [upgrades, setUpgrades] = useState<UpgradeRoll[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [stats, setStats] = useState<Record<string, LeaderStat>>({});
  const [modal, setModal] = useState<Modal>(null);
  const [createMode, setCreateMode] = useState<CreateMode>("coinflip");
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await api<{
      user: Player | null;
      inventory: PetInstance[];
      history: HistoryItem[];
      chat: ChatMessage[];
      stats: Record<string, LeaderStat>;
      coins: CoinFlipGame[];
      jackpots: JackpotGame[];
      races: RaceGame[];
      robloxEnabled?: boolean;
    }>("/api/state");
    setRobloxEnabled(Boolean(data.robloxEnabled));
    setUser(data.user);
    setInventory(data.inventory);
    setHistory(data.history);
    setChat(data.chat);
    setStats(data.stats);
    setCoins(data.coins);
    setJackpots(data.jackpots);
    setRaces(data.races);
  }, []);

  useEffect(() => {
    api<{ pets: Pet[]; updated?: string }>("/api/pets")
      .then((data) => {
        if (data.pets?.length) {
          setCatalog(data.pets, data.updated);
          setLocalCatalog(data.pets);
        }
      })
      .catch(() => undefined);
    refresh().catch(() => setToast("Could not reach the server"));
    const poll = window.setInterval(() => {
      refresh().catch(() => undefined);
    }, 4000);
    return () => {
      window.clearInterval(poll);
    };
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const run = useCallback(
    async (work: () => Promise<void>, success?: string) => {
      try {
        await work();
        await refresh();
        if (success) setToast(success);
      } catch (error) {
        setToast(error instanceof Error ? error.message : "Request failed");
      }
    },
    [refresh],
  );

  const login = useCallback(async (username: string, options?: { verify?: boolean }) => {
    const data = await api<{
      step?: string;
      user?: Player;
      code?: string;
      profileUrl?: string;
      username?: string;
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, terms: true, verify: Boolean(options?.verify) }),
    });
    if (data.user) {
      await refresh();
      setModal(null);
      setToast(`Welcome, ${data.user.name}`);
    }
    return data;
  }, [refresh]);

  const logout = useCallback(async () => {
    await run(async () => {
      await api("/api/auth/logout", { method: "POST" });
    });
  }, [run]);

  const openModal = useCallback((next: Modal, mode?: CreateMode) => {
    setModal(next);
    if (mode) setCreateMode(mode);
  }, []);
  const closeModal = useCallback(() => setModal(null), []);

  const sendChat = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || !user) return;
      const optimistic: ChatMessage = {
        id: `tmp_${Date.now()}`,
        at: Date.now(),
        player: user,
        text: clean,
      };
      setChat((prev) => [...prev, optimistic]);
      try {
        const data = await api<{ chat: ChatMessage[] }>("/api/chat", {
          method: "POST",
          body: JSON.stringify({ text: clean }),
        });
        setChat(data.chat);
      } catch (error) {
        setChat((prev) => prev.filter((row) => row.id !== optimistic.id));
        setToast(error instanceof Error ? error.message : "Could not send");
      }
    },
    [user],
  );

  const createCoin = useCallback(
    async (items: PetInstance[], side: CoinSide) => {
      try {
        const game = await api<CoinFlipGame>("/api/games/coinflip", {
          method: "POST",
          body: JSON.stringify({ itemIds: items.map((item) => item.uid), side }),
        });
        setModal(null);
        setCoins((prev) => [game, ...prev.filter((item) => item.id !== game.id)]);
        await refresh();
        setToast("Table added below — click it to open");
        return game;
      } catch (error) {
        setToast(error instanceof Error ? error.message : "Could not create CoinFlip");
        return undefined;
      }
    },
    [refresh],
  );

  const joinCoin = useCallback(
    async (gameId: string, items: PetInstance[]) => {
      try {
        await api(`/api/games/coinflip/${gameId}/join`, {
          method: "POST",
          body: JSON.stringify({ itemIds: items.map((item) => item.uid) }),
        });
        setModal(null);
        await refresh();
        await wait(2500);
        await api(`/api/games/coinflip/${gameId}/finish`, { method: "POST" });
        await refresh();
        setToast("Flip finished");
      } catch (error) {
        setToast(error instanceof Error ? error.message : "Could not join");
      }
    },
    [refresh],
  );

  const callOpponent = useCallback(
    async (gameId: string) => {
      try {
        await api(`/api/games/coinflip/${gameId}/bot`, { method: "POST" });
        await refresh();
        await wait(2500);
        await api(`/api/games/coinflip/${gameId}/finish`, { method: "POST" });
        await refresh();
        setToast("Flip finished");
      } catch (error) {
        setToast(error instanceof Error ? error.message : "Could not find an opponent");
      }
    },
    [refresh],
  );

  const createJackpot = useCallback(
    async (items: PetInstance[]) => {
      await run(async () => {
        await api("/api/games/jackpot", {
          method: "POST",
          body: JSON.stringify({ itemIds: items.map((item) => item.uid) }),
        });
        setModal(null);
      }, "Jackpot opened");
    },
    [run],
  );

  const joinJackpot = useCallback(
    async (gameId: string, items: PetInstance[]) => {
      await run(async () => {
        await api(`/api/games/jackpot/${gameId}/join`, {
          method: "POST",
          body: JSON.stringify({ itemIds: items.map((item) => item.uid) }),
        });
        setModal(null);
      }, "Joined jackpot");
    },
    [run],
  );

  const spinJackpot = useCallback(
    async (gameId: string) => {
      try {
        const next = await api<JackpotGame>(`/api/games/jackpot/${gameId}/spin`, { method: "POST" });
        setJackpots((prev) => [next, ...prev.filter((game) => game.id !== next.id)]);
        await wait(4300);
        await api(`/api/games/jackpot/${gameId}/finish`, { method: "POST" });
        await refresh();
        setToast("Jackpot settled");
      } catch (error) {
        setToast(error instanceof Error ? error.message : "Could not spin");
      }
    },
    [refresh],
  );

  const createRace = useCallback(
    async (items: PetInstance[]) => {
      await run(async () => {
        await api("/api/games/race", {
          method: "POST",
          body: JSON.stringify({ itemIds: items.map((item) => item.uid) }),
        });
        setModal(null);
      }, "Race opened");
    },
    [run],
  );

  const joinRace = useCallback(
    async (gameId: string, items: PetInstance[]) => {
      await run(async () => {
        await api(`/api/games/race/${gameId}/join`, {
          method: "POST",
          body: JSON.stringify({ itemIds: items.map((item) => item.uid) }),
        });
        setModal(null);
      }, "Joined race");
    },
    [run],
  );

  const startRace = useCallback(
    async (gameId: string) => {
      await run(async () => {
        await api(`/api/games/race/${gameId}/start`, { method: "POST" });
        await refresh();
        await wait(4400);
        await api(`/api/games/race/${gameId}/finish`, { method: "POST" });
      }, "Race settled");
    },
    [refresh, run],
  );

  const rollUpgrade = useCallback(
    async (stake: PetInstance[], target: PetInstance) => {
      const result = await api<{ chance: number; roll: number; won: boolean }>("/api/games/upgrade", {
        method: "POST",
        body: JSON.stringify({ itemIds: stake.map((item) => item.uid), target }),
      });
      setUpgrades((prev) => [{ id: `${Date.now()}`, at: Date.now(), stakeItems: stake, target, ...result }, ...prev].slice(0, 20));
      await refresh();
      setToast(result.won ? "Upgrade won" : "Upgrade missed");
      return result;
    },
    [refresh],
  );

  const requireUser = useCallback(() => {
    if (user) return true;
    setModal("login");
    return false;
  }, [user]);

  const totals = useMemo(
    () => ({
      items: inventory.length,
      value: itemsValue(inventory),
      active:
        coins.filter((game) => game.status !== "done").length +
        jackpots.filter((game) => game.status !== "done").length +
        races.filter((game) => game.status !== "done").length,
    }),
    [coins, inventory, jackpots, races],
  );

  const value = useMemo<Store>(
    () => ({
      splash,
      user,
      catalog,
      robloxEnabled,
      inventory,
      coins,
      jackpots,
      races,
      upgrades,
      history,
      chat,
      stats,
      modal,
      createMode,
      toast,
      login,
      logout,
      openModal,
      closeModal,
      sendChat,
      createCoin,
      joinCoin,
      callOpponent,
      createJackpot,
      joinJackpot,
      spinJackpot,
      createRace,
      joinRace,
      startRace,
      rollUpgrade,
      requireUser,
      totals,
    }),
    [
      splash,
      user,
      catalog,
      robloxEnabled,
      inventory,
      coins,
      jackpots,
      races,
      upgrades,
      history,
      chat,
      stats,
      modal,
      createMode,
      toast,
      login,
      logout,
      openModal,
      closeModal,
      sendChat,
      createCoin,
      joinCoin,
      callOpponent,
      createJackpot,
      joinJackpot,
      spinJackpot,
      createRace,
      joinRace,
      startRace,
      rollUpgrade,
      requireUser,
      totals,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
