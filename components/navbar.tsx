"use client";

import { Brand } from "@/components/brand";
import { ChatIcon, CoinIcon, CrownIcon, DiscordIcon, JackpotIcon, LoginIcon, RaceIcon, UpgradeIcon } from "@/components/icons";
import { PlayerChip } from "@/components/pet-tile";
import { formatValue } from "@/lib/format";
import { useStore } from "@/lib/store";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "CoinFlip", short: "Flip", icon: CoinIcon },
  { href: "/jackpot", label: "JackPot", short: "Pot", icon: JackpotIcon },
  { href: "/upgrader", label: "Upgrader", short: "Up", icon: UpgradeIcon },
  { href: "/race", label: "Race", short: "Race", icon: RaceIcon },
  { href: "/leaderboard", label: "Leaderboard", short: "Board", icon: CrownIcon },
];

export function Navbar({ onOpenChat, chatCount = 0 }: { onOpenChat?: () => void; chatCount?: number }) {
  const pathname = usePathname();
  const { user, openModal, logout, totals } = useStore();

  return (
    <nav className="fixed z-40 flex h-[calc(3.5rem+env(safe-area-inset-top))] w-full items-center justify-between border-b border-white/10 bg-nav/90 px-3 pt-[env(safe-area-inset-top)] backdrop-blur md:px-8 lg:h-20 lg:pt-0">
      <div className="hidden items-center gap-10 lg:flex">
        <Brand />
        <ul className="flex items-center text-sm">
          {LINKS.map((link) => {
            const active = pathname === link.href;
            const Icon = link.icon;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`nav-link relative flex h-20 items-center gap-2 border-b-2 px-5 text-sm font-semibold uppercase ${
                    active ? "border-b-primary text-white" : "border-b-transparent text-white/60 hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              </li>
            );
          })}
          <li>
            <a
              href="https://elvebredd.com/"
              target="_blank"
              rel="noreferrer"
              className="flex h-20 items-center gap-2 px-3 text-base text-white/60 transition hover:opacity-80"
              title="Elvebredd values"
            >
              <DiscordIcon className="h-4 w-4" />
            </a>
          </li>
        </ul>
      </div>

      <div className="hidden items-center gap-3 lg:flex">
        {user ? (
          <>
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <img src="/gem.svg" alt="" width={16} height={16} className="-mt-px h-4 w-4" />
              {formatValue(totals.value)}
            </div>
            <button
              type="button"
              onClick={() => openModal("history")}
              className="inline-flex h-9 items-center justify-center rounded-md bg-[#FFA834] px-5 text-sm font-semibold text-[#1a1204] hover:bg-[#ffb020]"
            >
              Wallet
            </button>
            <PlayerChip player={user} />
            <button onClick={logout} className="text-sm font-semibold text-white/50 hover:text-white">
              Logout
            </button>
          </>
        ) : (
          <button onClick={() => openModal("login")} className="inline-flex h-10 items-center justify-center rounded-md bg-[#FFA834] px-8 text-sm font-semibold text-[#1a1204] hover:bg-[#ffb020]">
            <LoginIcon className="mr-2 h-5 w-5" />
            Login
          </button>
        )}
      </div>

      <div className="flex w-full min-w-0 items-center justify-between gap-2 lg:hidden">
        <div className="min-w-0 overflow-hidden">
          <Brand compact />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenChat}
            className="relative grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-input text-white"
            aria-label="Messages"
          >
            <ChatIcon className="h-4 w-4" />
            {chatCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose px-1 text-[9px] font-bold">
                {chatCount > 9 ? "9+" : chatCount}
              </span>
            )}
          </button>
          {user ? (
            <>
              <button
                type="button"
                onClick={() => openModal("history")}
                className="inline-flex h-9 items-center justify-center rounded-md bg-[#FFA834] px-3 text-xs font-semibold text-[#1a1204]"
              >
                Wallet
              </button>
              <PlayerChip player={user} compact />
              <button onClick={logout} className="text-xs font-semibold text-white/50">
                Out
              </button>
            </>
          ) : (
            <button onClick={() => openModal("login")} className="inline-flex h-9 shrink-0 items-center rounded-md bg-[#FFA834] px-3 text-xs font-semibold text-[#1a1204]">
              Login
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <div className="mobile-tabbar fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-white/10 bg-nav/95 lg:hidden">
      {LINKS.map((link) => {
        const Icon = link.icon;
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-link flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-[10px] font-bold uppercase tracking-wide ${
              active ? "text-primary" : "text-white/50"
            }`}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="max-w-full truncate">{link.short}</span>
          </Link>
        );
      })}
    </div>
  );
}
