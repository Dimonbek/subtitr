"use client";

import { useState } from "react";
import { LogOut, Coins, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderActionsProps {
  email: string;
  coins: number;
  isPro: boolean;
}

export function HeaderActions({ email, coins, isPro }: HeaderActionsProps) {
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/access/logout", { method: "POST" });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error("Logout error", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
        <Coins className="h-3.5 w-3.5" />
        <span>{isPro ? "Obuna faol" : `${coins} coin`}</span>
      </div>
      <span className="hidden text-sm text-muted-foreground sm:inline">
        {email}
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={handleLogout}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Chiqish</span>
          </>
        )}
      </Button>
    </div>
  );
}
