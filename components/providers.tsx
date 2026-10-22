"use client";

import { SiteShell } from "@/components/site-shell";
import { StoreProvider } from "@/lib/store";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <SiteShell>{children}</SiteShell>
    </StoreProvider>
  );
}
