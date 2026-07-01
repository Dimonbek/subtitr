"use client";

import { useState } from "react";
import { Coins, Loader2, KeyRound, Mail, Send, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { COIN_PACKS, PLANS, PRICING_NOTE, formatUzs } from "@/lib/pricing";

// @ belgisini olib tashlaymiz — t.me linki @ siz bo'ladi (t.me/dimonbek)
const TELEGRAM = (process.env.NEXT_PUBLIC_TELEGRAM_ADMIN || "dimonbek").replace(/^@+/, "");

interface CoinShopProps {
  coins: number;
  isPro: boolean;
  onUpdated: (coins: number, isPro: boolean) => void;
}

export function CoinShop({ coins, isPro, onUpdated }: CoinShopProps) {
  const [tab, setTab] = useState<"buy" | "code" | "email">("buy");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const apply = async (path: string, payload: object) => {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xato");
      const acc = data.access ?? data;
      onUpdated(acc.coins ?? coins, acc.isPro ?? isPro);
      if (path.includes("redeem")) {
        setMsg(`+${data.coins ?? 0} coin${data.days ? `, +${data.days} kun obuna` : ""}`);
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Xato");
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-300/50 bg-amber-50/50 p-4 dark:border-amber-500/30 dark:bg-amber-950/20">
      <div className="mb-3 flex items-center gap-2">
        <Coins className="h-5 w-5 text-amber-500" />
        <h3 className="font-semibold">
          {isPro ? "Cheksiz obuna faol" : coins > 0 ? `Sizda ${coins} coin` : "Coin tugadi"}
        </h3>
      </div>

      {!isPro && (
        <p className="mb-3 text-sm text-muted-foreground">
          Har video tayyorlash 1 coin. Coin yoki cheksiz obuna sotib oling.
        </p>
      )}

      <div className="mb-3 flex gap-1 rounded-lg bg-muted p-1 text-sm">
        <button onClick={() => setTab("buy")} className={tabCls(tab === "buy")}>
          Narxlar
        </button>
        <button onClick={() => setTab("code")} className={tabCls(tab === "code")}>
          <KeyRound className="mr-1 inline h-3.5 w-3.5" /> Kod
        </button>
        <button onClick={() => setTab("email")} className={tabCls(tab === "email")}>
          <Mail className="mr-1 inline h-3.5 w-3.5" /> Email
        </button>
      </div>

      {tab === "buy" && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {COIN_PACKS.map((p) => (
              <div
                key={p.id}
                className={`rounded-lg border p-2 text-center ${p.highlight ? "border-brand bg-brand/5" : "border-border"}`}
              >
                <div className="flex items-center justify-center gap-1 text-sm font-bold">
                  <Coins className="h-3.5 w-3.5 text-amber-500" /> {p.coins}
                </div>
                <div className="text-xs text-muted-foreground">{formatUzs(p.priceUzs)}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {PLANS.map((p) => (
              <div
                key={p.id}
                className={`rounded-lg border p-2 text-center ${p.highlight ? "border-amber-400 bg-amber-100/40 dark:bg-amber-900/20" : "border-border"}`}
              >
                <div className="flex items-center justify-center gap-1 text-xs font-semibold">
                  <Crown className="h-3 w-3 text-amber-500" /> {p.label}
                </div>
                <div className="text-xs text-muted-foreground">{formatUzs(p.priceUzs)}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-emerald-600 dark:text-emerald-400">⚡ {PRICING_NOTE}</p>
          <Button variant="brand" className="w-full" asChild>
            <a href={`https://t.me/${TELEGRAM}`} target="_blank" rel="noopener noreferrer">
              <Send className="h-4 w-4" /> Sotib olish
            </a>
          </Button>
        </div>
      )}

      {tab === "code" && (
        <div className="flex gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6 xonali kod"
            inputMode="numeric"
            maxLength={6}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-center text-lg font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
          <Button onClick={() => apply("/api/access/redeem", { code: code.trim() })} disabled={busy || code.trim().length < 4} variant="brand">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Faollashtirish"}
          </Button>
        </div>
      )}

      {tab === "email" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Email bilan kiring — coinlaringiz saqlanadi va boshqa qurilmada ham ishlaydi.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            <Button onClick={() => apply("/api/access/login", { email: email.trim() })} disabled={busy || !email.includes("@")} variant="brand">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kirish"}
            </Button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      {msg && <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">{msg}</p>}
    </div>
  );
}

function tabCls(active: boolean): string {
  return `flex-1 rounded-md px-2 py-1.5 ${active ? "bg-background shadow-sm" : "text-muted-foreground"}`;
}
