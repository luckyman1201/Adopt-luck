"use client";

import { PetTile, ValueGem } from "@/components/pet-tile";
import { formatValue, relativeTime } from "@/lib/format";
import { getPet, itemsValue } from "@/lib/pets";
import { useStore } from "@/lib/store";
import type { CoinSide, PetInstance } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

export function Overlay({
  children,
  onClose,
  size = "lg",
}: {
  children: React.ReactNode;
  onClose: () => void;
  size?: "sm" | "lg";
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    document.documentElement.classList.add("overlay-lock");
    return () => {
      document.documentElement.classList.remove("overlay-lock");
    };
  }, []);
  if (!mounted) return null;

  return createPortal(
    <div
      className="overlay-in fixed inset-0 z-[80] grid place-items-center overflow-hidden bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className={`scroll-thin my-auto max-h-[min(88dvh,880px)] w-full overflow-x-hidden overflow-y-auto ${
          size === "sm"
            ? "login-card max-w-[400px]"
            : "modal-in max-w-4xl rounded-2xl border border-white/10 bg-card shadow-2xl"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function LoginModal() {
  const { modal, closeModal, login } = useStore();
  const [username, setUsername] = useState("");
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"username" | "verify">("username");
  const [code, setCode] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [copied, setCopied] = useState(false);
  if (modal !== "login") return null;

  function dismiss() {
    setUsername("");
    setTerms(false);
    setBusy(false);
    setError("");
    setStep("username");
    setCode("");
    setProfileUrl("");
    setCopied(false);
    closeModal();
  }

  async function copyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  async function submit() {
    if (!terms) {
      setError("By checking this box you agree to our terms and service");
      return;
    }
    if (username.trim().length < 3) {
      setError("Enter your username");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await login(username.trim(), { verify: step === "verify" });
      if (result?.code) {
        setCode(result.code);
        setProfileUrl(result.profileUrl || "");
        setUsername(result.username || username.trim());
        setStep("verify");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-overlay" onClick={dismiss}>
      <div
        role="dialog"
        aria-labelledby="login-title"
        aria-describedby="login-copy"
        className="login-card"
        onClick={(e) => e.stopPropagation()}
      >
        <img src="/cloud.svg" alt="" className="login-cloud login-cloud-tr" />
        <img src="/cloud.svg" alt="" className="login-cloud login-cloud-bl" />
        <button type="button" onClick={dismiss} className="login-close" aria-label="Close">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
        <div className="login-head">
          <h2 id="login-title" className="login-title">
            Welcome to AdoptLuck
          </h2>
          <p id="login-copy" className="login-copy">
            {step === "username"
              ? "By logging in, you acknowledge that you are at least 18 years of age, that any items you wager are not stolen, and that you agree to our Terms of Use."
              : "Copy this code and paste it into your Roblox profile About / Bio. Open your profile, edit About, save, then click Login. Do not use the Social links card."}
          </p>
        </div>
        <form
          className="login-form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label className="login-label" htmlFor="login-username">
            Username
          </label>
          <input
            id="login-username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (step === "verify") {
                setStep("username");
                setCode("");
                setError("");
              }
            }}
            placeholder="Enter your username..."
            className="login-input"
            autoComplete="username"
            readOnly={step === "verify"}
          />
          {step === "verify" && (
            <>
              <label className="login-label" htmlFor="login-code" style={{ marginTop: 16 }}>
                Verification code
              </label>
              <div className="login-code-row">
                <input
                  id="login-code"
                  readOnly
                  value={code}
                  className="login-input"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button type="button" className="login-copy-btn" onClick={copyCode}>
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              {profileUrl && (
                <a href={profileUrl} target="_blank" rel="noreferrer" className="login-link">
                  Open Roblox profile About
                </a>
              )}
            </>
          )}
          <div className="login-terms">
            <input
              id="terms"
              type="checkbox"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
            />
            <label htmlFor="terms">
              By checking this box you agree to <span>our terms and service</span>
            </label>
          </div>
          {error && <div className="login-error">{error}</div>}
          <button type="submit" disabled={busy} className="login-submit">
            {busy ? "Please wait..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function InventoryPicker({
  selected,
  onToggle,
  targetValue,
  nested,
}: {
  selected: PetInstance[];
  onToggle: (item: PetInstance) => void;
  targetValue?: number;
  nested?: boolean;
}) {
  const { inventory, user, openModal } = useStore();
  const [query, setQuery] = useState("");
  const selectedIds = new Set(selected.map((item) => item.uid));
  const filtered = inventory.filter((item) => {
    const pet = getPet(item.petId);
    return pet?.name.toLowerCase().includes(query.toLowerCase());
  });
  const value = itemsValue(selected);

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search pets"
          className="h-10 w-full min-w-0 rounded-lg bg-input px-3 text-sm outline-none ring-1 ring-white/10 sm:flex-1"
        />
        <div className="text-sm font-semibold text-white/70">
          Selected <ValueGem value={value} className="text-gold" />
          {targetValue ? ` · need ${formatValue(targetValue * 0.88)}–${formatValue(targetValue * 1.12)}` : ""}
        </div>
      </div>
      <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 ${nested ? "" : "scroll-thin max-h-[42vh] overflow-y-auto"}`}>
        {filtered.map((item) => (
          <PetTile key={item.uid} item={item} selected={selectedIds.has(item.uid)} onClick={() => onToggle(item)} />
        ))}
        {!filtered.length && (
          <div className="col-span-full py-10 text-center">
            <div className="text-sm text-white/40">
              {user
                ? inventory.length
                  ? "No pets match that search."
                  : "Nursery is empty. Deposit pets through the trade bot, or ask staff to grant test pets."
                : "Login to load your nursery."}
            </div>
            {!user && (
              <button onClick={() => openModal("login")} className="btn btn-primary mt-3">
                Login
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CreateGameModal() {
  const { modal, createMode, closeModal, createCoin, createJackpot, createRace, user, openModal } = useStore();
  const [selected, setSelected] = useState<PetInstance[]>([]);
  const [side, setSide] = useState<CoinSide>("heads");

  if (modal !== "create") return null;

  function toggle(item: PetInstance) {
    setSelected((prev) => (prev.some((row) => row.uid === item.uid) ? prev.filter((row) => row.uid !== item.uid) : [...prev, item]));
  }

  function submit() {
    if (!user) {
      openModal("login");
      return;
    }
    if (!selected.length) return;
    if (createMode === "coinflip") createCoin(selected, side);
    else if (createMode === "jackpot") createJackpot(selected);
    else createRace(selected);
    setSelected([]);
  }

  const title =
    createMode === "coinflip" ? "Create CoinFlip" : createMode === "jackpot" ? "Create Jackpot" : "Create Race";

  return (
    <CreateInner
      title={title}
      selected={selected}
      onToggle={toggle}
      side={side}
      setSide={setSide}
      showSide={createMode === "coinflip"}
      onClose={closeModal}
      onSubmit={submit}
    />
  );
}

function CreateInner({
  title,
  selected,
  onToggle,
  side,
  setSide,
  showSide,
  targetValue,
  onClose,
  onSubmit,
}: {
  title: string;
  selected: PetInstance[];
  onToggle: (item: PetInstance) => void;
  side: CoinSide;
  setSide: (side: CoinSide) => void;
  showSide: boolean;
  targetValue?: number;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <Overlay onClose={onClose}>
      <div className="p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-extrabold md:text-2xl">{title}</h2>
            <p className="text-xs text-white/45">Pet values from Elvebredd · no calculator</p>
          </div>
          <button onClick={onClose} className="text-white/50">
            Close
          </button>
        </div>
        {showSide && (
          <div className="mb-4 flex justify-center">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSide("heads")}
                className={`side-pick ${side === "heads" ? "is-on" : ""}`}
              >
                <span className="side-pick-coin">
                  <img src="/coin-heads.png?v=2" alt="" draggable={false} />
                </span>
                Heads
              </button>
              <button
                onClick={() => setSide("tails")}
                className={`side-pick ${side === "tails" ? "is-on" : ""}`}
              >
                <span className="side-pick-coin">
                  <img src="/coin-tails.png?v=2" alt="" draggable={false} />
                </span>
                Tails
              </button>
            </div>
          </div>
        )}
        <InventoryPicker selected={selected} onToggle={onToggle} targetValue={targetValue} />
        <button
          onClick={onSubmit}
          disabled={!selected.length}
          className="btn btn-primary mt-4 h-11 w-full"
        >
          Confirm
        </button>
      </div>
    </Overlay>
  );
}

export function JoinPickerController({
  open,
  onClose,
  title,
  targetValue,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  targetValue?: number;
  onConfirm: (items: PetInstance[]) => void;
}) {
  const { user, openModal } = useStore();
  const [selected, setSelected] = useState<PetInstance[]>([]);
  if (!open) return null;

  return (
    <Overlay onClose={onClose}>
      <div className="p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-extrabold md:text-2xl">{title}</h2>
          <button onClick={onClose} className="text-white/50">
            Close
          </button>
        </div>
        <InventoryPicker
          selected={selected}
          targetValue={targetValue}
          onToggle={(item) =>
            setSelected((prev) => (prev.some((row) => row.uid === item.uid) ? prev.filter((row) => row.uid !== item.uid) : [...prev, item]))
          }
        />
        <button
          onClick={() => {
            if (!user) {
              openModal("login");
              return;
            }
            onConfirm(selected);
            setSelected([]);
          }}
          disabled={!selected.length}
          className="btn btn-primary mt-4 h-11 w-full"
        >
          Join
        </button>
      </div>
    </Overlay>
  );
}

export function HistoryModal() {
  const { modal, closeModal, history } = useStore();
  if (modal !== "history") return null;
  return (
    <Overlay onClose={closeModal}>
      <div className="p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-extrabold md:text-2xl">History</h2>
          <button onClick={closeModal} className="text-white/50">
            Close
          </button>
        </div>
        <div className="scroll-thin max-h-[60vh] space-y-2 overflow-y-auto">
          {history.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-card px-3 py-3 md:px-4">
              <div>
                <div className="font-semibold">{item.title}</div>
                <div className="text-xs text-white/50">
                  {item.detail} · {relativeTime(item.at)}
                </div>
              </div>
              <div className={`font-semibold ${item.won ? "text-secondary" : "text-rose"}`}>
                {item.won ? "+" : "-"}
                {formatValue(item.value)}
              </div>
            </div>
          ))}
          {!history.length && <div className="py-10 text-center text-sm text-white/40">No games yet.</div>}
        </div>
      </div>
    </Overlay>
  );
}

export function UpgradeTargetModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (item: PetInstance) => void;
}) {
  const [query, setQuery] = useState("");
  const [neon, setNeon] = useState(false);
  const [mega, setMega] = useState(false);
  const [fr, setFr] = useState(true);
  const { catalog } = useStore();
  const pets = useMemo(
    () => catalog.filter((pet) => pet.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.values.regular - a.values.regular),
    [catalog, query],
  );
  if (!open) return null;

  return (
    <Overlay onClose={onClose}>
      <div className="p-4 md:p-5">
        <h2 className="font-display text-xl font-extrabold md:text-2xl">Choose upgrade target</h2>
        <p className="mb-4 text-xs text-white/45">
          Elvebredd values · {pets.length} pets loaded · pick a target
        </p>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pets"
            className="h-11 flex-1 rounded-xl bg-input px-4 text-sm outline-none ring-1 ring-white/10"
          />
          <div className="grid grid-cols-3 overflow-hidden rounded-xl bg-input p-1">
            <button
              onClick={() => setFr((v) => !v)}
              className={`period-btn h-9 rounded-lg px-4 text-xs font-bold ${fr ? "bg-primary text-primary-ink" : "text-white/45"}`}
            >
              FR
            </button>
            <button
              onClick={() => {
                setNeon((v) => !v);
                if (mega) setMega(false);
              }}
              className={`period-btn h-9 rounded-lg px-4 text-xs font-bold ${neon && !mega ? "bg-sky text-black" : "text-white/45"}`}
            >
              Neon
            </button>
            <button
              onClick={() => {
                setMega((v) => !v);
                if (!mega) setNeon(true);
              }}
              className={`period-btn h-9 rounded-lg px-4 text-xs font-bold ${mega ? "bg-gold text-black" : "text-white/45"}`}
            >
              Mega
            </button>
          </div>
        </div>
        <div className="scroll-thin grid max-h-[52vh] grid-cols-2 gap-2.5 overflow-y-auto sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {pets.map((pet) => {
            const item: PetInstance = {
              uid: `target_${pet.id}`,
              petId: pet.id,
              fly: fr,
              ride: fr,
              neon: neon || mega,
              mega,
            };
            return <PetTile key={pet.id} item={item} onClick={() => onPick(item)} />;
          })}
        </div>
      </div>
    </Overlay>
  );
}
