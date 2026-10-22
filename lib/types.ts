export type Rarity = "common" | "uncommon" | "rare" | "ultra-rare" | "legendary";

export type Potion = "np" | "r" | "f" | "fr";
export type Growth = "normal" | "neon" | "mega";
export type CoinSide = "heads" | "tails";

export type PetValues = {
  regular: number;
  neon: number;
  mega: number;
};

export type Pet = {
  id: string;
  name: string;
  rarity: Rarity;
  emoji: string;
  color: string;
  image: string;
  values: PetValues;
  source: "elvebredd";
};

export type PetInstance = {
  uid: string;
  petId: string;
  fly: boolean;
  ride: boolean;
  neon: boolean;
  mega: boolean;
};

export type Player = {
  id: string;
  name: string;
  hue: number;
  isBot: boolean;
};

export type CoinFlipGame = {
  id: string;
  createdAt: number;
  creator: Player;
  creatorSide: CoinSide;
  creatorItems: PetInstance[];
  joiner?: Player;
  joinerItems?: PetInstance[];
  status: "open" | "flipping" | "done";
  result?: CoinSide;
  winnerId?: string;
};

export type JackpotEntry = {
  player: Player;
  items: PetInstance[];
  color: string;
};

export type JackpotGame = {
  id: string;
  createdAt: number;
  entries: JackpotEntry[];
  status: "open" | "spinning" | "done";
  winnerId?: string;
  ticket?: number;
};

export type RaceGame = {
  id: string;
  createdAt: number;
  entries: JackpotEntry[];
  status: "open" | "racing" | "done";
  winnerId?: string;
};

export type UpgradeRoll = {
  id: string;
  at: number;
  stakeItems: PetInstance[];
  target: PetInstance;
  chance: number;
  roll: number;
  won: boolean;
};

export type HistoryItem = {
  id: string;
  at: number;
  mode: "coinflip" | "jackpot" | "upgrader" | "race";
  title: string;
  value: number;
  won: boolean;
  detail: string;
};

export type ChatMessage = {
  id: string;
  at: number;
  player: Player;
  text: string;
};

export type LeaderStat = {
  player: Player;
  wagered: number;
  profit: number;
  wins: number;
  games: number;
};
