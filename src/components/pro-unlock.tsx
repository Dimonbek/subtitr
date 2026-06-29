"use client";

import { useState } from "react";
import { Crown, Loader2, KeyRound, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLANS, PRICING_NOTE, formatUzs } from "@/lib/pricing";

const TELEGRAM = process.env.NEXT_PUBLIC_TELEGRAM_ADMIN || "dimonbek";

interface ProUnlockProps {
  onUnlocked: (until: number, identity: string) => void;
}

export function ProUnlock({ onUnlocked }: ProUnlockProps) {
  const [tab, setTab] = useState<"code" | "email">("code");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redeem = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/access/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Kod xato");
      onUnlocked(data.until, "kod");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato");
    } finally {
      setBusy(false);
    }
  };

  const login = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/access/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Email xato");
      if (!data.isPro) {
        setError("Bu email uchun ruxsat ochilmagan. Avval to'lov qiling.");
      } else {
        onUnlocked(data.until, data.identity);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-300/50 bg-amber-50/50 p-4 dark:border-amber-500/30 dark:bg-amber-950/20">
      <div className="mb-3 flex items-center gap-2">
        <Crown className="h-5 w-5 text-amber-500" />
        <h3 className="font-semibold">Premium funksiya</h3>
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        Premium uslublar va shriftlardan foydalanish uchun obuna kerak.
      </p>

      {/* Narxlar — Captions.ai'dan 3× arzon */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={`rounded-lg border p-2 text-center ${
              p.highlight ? "border-brand bg-brand/5" : "border-border"
            }`}
          >
            <div className="text-xs text-muted-foreground">{p.label}</div>
            <div className="text-sm font-bold">{formatUzs(p.priceUzs)}</div>
          </div>
        ))}
      </div>
      <p className="mb-3 text-center text-xs text-emerald-600 dark:text-emerald-400">
        ⚡ {PRICING_NOTE}
      </p>

      {TELEGRAM && (
        <Button variant="brand" className="mb-3 w-full" asChild>
          <a href={`https://t.me/${TELEGRAM}`} target="_blank" rel="noopener noreferrer">
            <Send className="h-4 w-4" /> Telegram orqali sotib olish
          </a>
        </Button>
      )}

      <div className="mb-3 flex gap-1 rounded-lg bg-muted p-1 text-sm">
        <button
          onClick={() => setTab("code")}
          className={`flex-1 rounded-md px-2 py-1.5 ${tab === "code" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
        >
          <KeyRound className="mr-1 inline h-3.5 w-3.5" /> Promokod
        </button>
        <button
          onClick={() => setTab("email")}
          className={`flex-1 rounded-md px-2 py-1.5 ${tab === "email" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
        >
          <Mail className="mr-1 inline h-3.5 w-3.5" /> Email
        </button>
      </div>

      {tab === "code" ? (
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && redeem()}
            placeholder="6 xonali kod"
            inputMode="numeric"
            maxLength={6}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-center text-lg font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
          <Button onClick={redeem} disabled={busy || code.trim().length < 4} variant="brand">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Faollashtirish"}
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="email@example.com"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
          <Button onClick={login} disabled={busy || !email.includes("@")} variant="brand">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kirish"}
          </Button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
