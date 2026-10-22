"use client";

import { PlayerChip } from "@/components/pet-tile";
import { useStore } from "@/lib/store";
import { FormEvent, useEffect, useRef, useState } from "react";

export function ChatPanel({ onClose }: { onClose?: () => void }) {
  const { chat, user, sendChat, openModal } = useStore();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = listRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [chat.length]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) {
      openModal("login");
      return;
    }
    if (!text.trim()) return;
    sendChat(text.trim());
    setText("");
  }

  return (
    <>
      <div className="flex items-center justify-between px-1 pb-2">
        <div className="text-sm font-semibold text-white">Messages</div>
        <div className="flex items-center gap-2">
          <div className="text-xs font-semibold text-white/50">{chat.length}</div>
          <div className="h-2 w-2 rounded-full bg-rose" />
          {onClose && (
            <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-white" aria-label="Close chat">
              ×
            </button>
          )}
        </div>
      </div>
      <div ref={listRef} className="scroll-thin mb-2 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto py-1 pr-1">
        {!chat.length && (
          <div className="rounded-xl border border-dashed border-white/15 px-3 py-8 text-center text-sm text-white/45">
            {user ? "Lobby is quiet. Send the first message." : "Login to read and send messages."}
          </div>
        )}
        {chat.map((message) => (
          <div key={message.id} className="chat-bubble rounded-xl px-3 py-2">
            <PlayerChip player={message.player} />
            <p className="chat-bubble-text mt-1 text-sm font-medium leading-5">{message.text}</p>
          </div>
        ))}
      </div>
      <form onSubmit={onSubmit} className="mb-3 flex shrink-0 gap-2 xl:mb-4">
        <input
          className="chat-input h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-input px-3 text-sm font-medium text-white placeholder:text-white/45 focus-visible:outline-none disabled:opacity-50"
          placeholder={user ? "Say something..." : "Login to chat"}
          disabled={!user}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn btn-primary h-11 shrink-0 px-4" type="submit" disabled={!user}>
          Send
        </button>
      </form>
    </>
  );
}

export function ChatSidebar() {
  return (
    <aside className="hidden h-full min-h-0 w-[21rem] shrink-0 flex-col border-r border-white/8 bg-chat px-3 pt-3 lg:flex">
      <ChatPanel />
    </aside>
  );
}

export function MobileChatSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" className="absolute inset-0 bg-black/55" aria-label="Close chat" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 top-[calc(3.5rem+env(safe-area-inset-top))] flex flex-col gap-2 rounded-t-2xl bg-chat px-3 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.35)]">
        <ChatPanel onClose={onClose} />
      </div>
    </div>
  );
}
