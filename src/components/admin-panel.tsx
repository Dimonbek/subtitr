"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Copy, Check, KeyRound, Coins, Zap, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PromoCode {
  code: string;
  coins: number;
  durationDays: number;
  status: "active" | "used";
  redeemedBy?: string;
}
interface Subject {
  id: string;
  coins: number;
  expiresAt?: number;
  createdAt: number;
}
interface ElevenKey {
  index: number;
  masked: string;
  active: boolean;
  used: number;
  limit: number;
  remaining: number;
}

function fmt(ts?: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("uz-UZ", { dateStyle: "short" });
}
function label(id: string): string {
  return id.startsWith("email:") ? id.slice(6) : "anonim";
}

export function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [elKeys, setElKeys] = useState<ElevenKey[]>([]);
  const [elTotal, setElTotal] = useState(0);

  const [codeCoins, setCodeCoins] = useState(10);
  const [codeDays, setCodeDays] = useState(0);
  const [gEmail, setGEmail] = useState("");
  const [gCoins, setGCoins] = useState(10);
  const [gDays, setGDays] = useState(0);
  const [copied, setCopied] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/data");
    if (res.status === 401) {
      setAuthed(false);
      return;
    }
    const data = await res.json();
    setCodes(data.codes ?? []);
    setSubjects(data.subjects ?? []);
    setAuthed(true);
    const el = await fetch("/api/admin/elevenlabs");
    if (el.ok) {
      const d = await el.json();
      setElKeys(d.keys ?? []);
      setElTotal(d.totalRemaining ?? 0);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error("Parol noto'g'ri");
      setPassword("");
      await refresh();
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Xato");
    } finally {
      setAuthBusy(false);
    }
  };

  const createCode = async () => {
    await fetch("/api/admin/codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coins: codeCoins, durationDays: codeDays }),
    });
    await refresh();
  };
  const removeCode = async (code: string) => {
    await fetch(`/api/admin/codes?code=${code}`, { method: "DELETE" });
    await refresh();
  };
  const grant = async () => {
    if (!gEmail.trim()) return;
    await fetch("/api/admin/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: gEmail, coins: gCoins, days: gDays }),
    });
    setGEmail("");
    await refresh();
  };
  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  };

  if (!authed) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" /> Admin kirish
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              placeholder="Parol"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            {authError && <p className="text-sm text-destructive">{authError}</p>}
            <Button onClick={login} disabled={authBusy} className="w-full" variant="brand">
              {authBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kirish"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Admin panel</h1>

      {/* ElevenLabs kreditlari */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4 text-amber-500" /> ElevenLabs kreditlari
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              Jami: <b className="text-foreground">{elTotal.toLocaleString()}</b>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {elKeys.map((k) => {
            const pct = k.limit > 0 ? Math.round((k.remaining / k.limit) * 100) : 0;
            return (
              <div key={k.index} className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <span className="font-mono text-xs">#{k.index + 1}</span>
                {k.active && <span className="rounded-full bg-brand/15 px-2 py-0.5 text-xs text-brand">faol</span>}
                <div className="ml-2 h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div className={pct > 20 ? "h-full bg-emerald-500" : "h-full bg-rose-500"} style={{ width: `${pct}%` }} />
                </div>
                <span className="tabular-nums text-xs">{k.remaining.toLocaleString()} / {k.limit.toLocaleString()}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Promokod */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" /> Promokodlar (coin / obuna)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="mr-1 text-muted-foreground">Coin:</span>
              <input type="number" value={codeCoins} onChange={(e) => setCodeCoins(Number(e.target.value))} className="w-20 rounded-md border border-input bg-background px-2 py-1.5" />
            </label>
            <label className="text-sm">
              <span className="mr-1 text-muted-foreground">Obuna kun:</span>
              <input type="number" value={codeDays} onChange={(e) => setCodeDays(Number(e.target.value))} className="w-20 rounded-md border border-input bg-background px-2 py-1.5" />
            </label>
            <Button onClick={createCode} variant="brand" size="sm">
              <Plus className="h-4 w-4" /> Kod yaratish
            </Button>
          </div>
          <div className="space-y-1.5">
            {codes.length === 0 && <p className="text-sm text-muted-foreground">Kodlar yo'q</p>}
            {codes.map((c) => (
              <div key={c.code} className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <span className="font-mono text-base font-bold tracking-widest">{c.code}</span>
                <button onClick={() => copy(c.code)} className="text-muted-foreground hover:text-foreground">
                  {copied === c.code ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
                {c.coins > 0 && <span className="flex items-center gap-1 text-xs"><Coins className="h-3 w-3 text-amber-500" />{c.coins}</span>}
                {c.durationDays > 0 && <span className="text-xs text-muted-foreground">{c.durationDays} kun</span>}
                <span className={c.status === "active" ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}>
                  {c.status === "active" ? "faol" : "ishlatilgan"}
                </span>
                <button onClick={() => removeCode(c.code)} className="ml-auto text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Email orqali berish */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> Email orqali coin/obuna berish
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <input type="email" value={gEmail} onChange={(e) => setGEmail(e.target.value)} placeholder="email@example.com" className="flex-1 min-w-[160px] rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
            <label className="text-sm"><span className="mr-1 text-muted-foreground">Coin:</span>
              <input type="number" value={gCoins} onChange={(e) => setGCoins(Number(e.target.value))} className="w-16 rounded-md border border-input bg-background px-2 py-1.5" />
            </label>
            <label className="text-sm"><span className="mr-1 text-muted-foreground">Kun:</span>
              <input type="number" value={gDays} onChange={(e) => setGDays(Number(e.target.value))} className="w-16 rounded-md border border-input bg-background px-2 py-1.5" />
            </label>
            <Button onClick={grant} variant="brand" size="sm"><Plus className="h-4 w-4" /> Berish</Button>
          </div>

          <div className="space-y-1.5">
            {subjects.length === 0 && <p className="text-sm text-muted-foreground">Foydalanuvchilar yo'q</p>}
            {subjects.map((s) => {
              const pro = s.expiresAt && s.expiresAt > Date.now();
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                  <span className="font-medium">{label(s.id)}</span>
                  <span className="flex items-center gap-1 text-xs"><Coins className="h-3 w-3 text-amber-500" />{s.coins}</span>
                  {pro && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">obuna {fmt(s.expiresAt)}</span>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
