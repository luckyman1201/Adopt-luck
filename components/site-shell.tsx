"use client";

import { Wordmark } from "@/components/brand";
import { ChatSidebar, MobileChatSheet } from "@/components/chat-sidebar";
import { CreateGameModal, HistoryModal, LoginModal } from "@/components/modals";
import { MobileNav, Navbar } from "@/components/navbar";
import { formatValue } from "@/lib/format";
import { VALUES_SOURCE, VALUES_UPDATED } from "@/lib/pets";
import { useStore } from "@/lib/store";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

export function SiteShell({ children }: { children: ReactNode }) {
  const { splash, toast, totals, chat } = useStore();
  const pathname = usePathname();
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="site-bg relative flex h-dvh flex-col overflow-hidden">
      {splash && (
        <div className="pointer-events-none fixed z-50 flex h-dvh w-screen items-center justify-center bg-background">
          <div className="splash-logo">
            <Wordmark size={88} />
          </div>
        </div>
      )}
      <Navbar onOpenChat={() => setChatOpen(true)} chatCount={chat.length} />
      <div className="relative z-10 mt-[calc(3.5rem+env(safe-area-inset-top))] flex flex-1 overflow-hidden lg:mt-20">
        <ChatSidebar />
        <div className="site-scroll flex w-full min-w-0 flex-col overflow-x-hidden overflow-y-auto pb-[calc(4.75rem+env(safe-area-inset-bottom))] lg:pb-0">
          <div key={pathname} className="fade-up flex-1 px-3 pb-8 pt-3 md:px-5 xl:px-6">
            {children}
          </div>
          <div className="flex justify-center p-3 text-center text-xs text-white/40 md:text-sm">
            Adopt Luck is not affiliated with or endorsed by ROBLOX corporation or Adopt Me.
          </div>
        </div>
      </div>
      <MobileNav />
      <MobileChatSheet open={chatOpen} onClose={() => setChatOpen(false)} />
      <LoginModal />
      <CreateGameModal />
      <HistoryModal />
      {toast && (
        <div className="toast-pop fixed bottom-24 right-3 z-50 max-w-[min(90vw,20rem)] rounded-xl border border-white/10 bg-card px-4 py-3 text-sm font-semibold shadow-xl xl:bottom-6 xl:right-4">
          {toast}
        </div>
      )}
      <div className="sr-only">
        {totals.items} {VALUES_UPDATED}
      </div>
    </div>
  );
}

export function StatsRow() {
  const { totals } = useStore();
  return (
    <div className="mb-3 grid gap-2 md:grid-cols-3">
      <div className="rounded border border-white/10 bg-card px-4 py-2">
        <div className="text-xl font-semibold">{totals.items}</div>
        <div className="font-semibold opacity-60">Total Items</div>
      </div>
      <div className="rounded border border-white/10 bg-card px-4 py-2">
        <div className="flex items-center gap-2 text-xl font-semibold">
          <img alt="value gem" width={20} height={20} className="-mt-[3px] h-5 w-5" src="/gem.svg" />
          {formatValue(totals.value)}
        </div>
        <div className="font-semibold opacity-60">Total Value</div>
      </div>
      <div className="rounded border border-white/10 bg-card px-4 py-2">
        <div className="text-xl font-semibold">{totals.active}</div>
        <div className="font-semibold opacity-60">Active Games</div>
      </div>
    </div>
  );
}

export function Toolbar({ createMode }: { createMode: "coinflip" | "jackpot" | "race" }) {
  const { openModal, requireUser } = useStore();
  return (
    <div className="mb-3 mt-3 flex flex-col justify-between gap-2 md:mt-4 sm:flex-row-reverse">
      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            if (!requireUser()) return;
            openModal("create", createMode);
          }}
          className="btn btn-primary flex-1 sm:flex-none"
        >
          Create
        </button>
        <button onClick={() => openModal("history")} className="btn btn-muted flex-1 sm:flex-none">
          History
        </button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="grid h-10 w-full max-w-xs grid-cols-1 rounded-md bg-input p-1">
          <div className="grid place-items-center rounded-sm bg-primary/15 text-sm font-semibold text-primary">
            ADOPT ME
          </div>
        </div>
        <a href={VALUES_SOURCE} target="_blank" rel="noreferrer" className="text-xs font-semibold text-white/40 hover:text-gold">
          Values by Elvebredd · {VALUES_UPDATED}
        </a>
      </div>
    </div>
  );
}
