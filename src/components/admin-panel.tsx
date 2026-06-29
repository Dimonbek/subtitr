"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Copy, Check, KeyRound, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PromoCode {
  code: string;
  durationDays: number;
  status: "active" | "used";
  createdAt: number;
  redeemedAt?: number;
  redeemedUntil?: number;
  note?: string;
}
interface EmailGrant {
  email: string;
  expiresAt: number;
  createdAt: number;
  note?: string;
}

function fmt(ts?: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("uz-UZ", { dateStyle: "short", timeStyle: "short" });
}
function daysLeft(ts: number): string {
  const d = Math.ceil((ts - Date.now()) / (24 * 60 * 60 * 1000));
  return d > 0 ? `${d} kun` : "tugagan";
}

export function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [emails, setEmails] = useState<EmailGrant[]>([]);
  const [loading, setLoading] = useState(false);

  const [codeDays, setCodeDays] = useState(30);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantDays, setGrantDays] = useState(30);
  const [copied, setCopied] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/data");
    if (res.status === 401) {
      setAuthed(false);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setCodes(data.codes ?? []);
    setEmails(data.emails ?? []);
    setAuthed(true);
    setLoading(false);
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
      body: JSON.stringify({ durationDays: codeDays }),
    });
    await refresh();
  };
  const removeCode = async (code: string) => {
    await fetch(`/api/admin/codes?code=${code}`, { method: "DELETE" });
    await refresh();
  };
  const addGrant = async () => {
    if (!grantEmail.trim()) return;
    await fetch("/api/admin/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: grantEmail, durationDays: grantDays }),
    });
    setGrantEmail("");
    await refresh();
  };
  const removeGrant = async (email: string) => {
    await fetch(`/api/admin/email?email=${encodeURIComponent(email)}`, { method: "DELETE" });
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

      {/* Promokod yaratish */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" /> Promokodlar
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-sm">
              <span className="mr-2 text-muted-foreground">Muddat (kun):</span>
              <input
                type="number"
                value={codeDays}
                onChange={(e) => setCodeDays(Number(e.target.value))}
                className="w-20 rounded-md border border-input bg-background px-2 py-1.5"
              />
            </label>
            <Button onClick={createCode} variant="brand" size="sm">
              <Plus className="h-4 w-4" /> Kod yaratish
            </Button>
          </div>

          <div className="space-y-1.5">
            {codes.length === 0 && <p className="text-sm text-muted-foreground">Kodlar yo'q</p>}
            {codes.map((c) => (
              <div
                key={c.code}
                className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm"
              >
                <span className="font-mono text-base font-bold tracking-widest">{c.code}</span>
                <button onClick={() => copy(c.code)} className="text-muted-foreground hover:text-foreground">
                  {copied === c.code ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </button>
                <span className="text-muted-foreground">{c.durationDays} kun</span>
                <span
                  className={
                    c.status === "active"
                      ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "rounded-full bg-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  }
                >
                  {c.status === "active" ? "faol" : "ishlatilgan"}
                </span>
                {c.status === "used" && (
                  <span className="text-xs text-muted-foreground">→ {fmt(c.redeemedUntil)}</span>
                )}
                <button
                  onClick={() => removeCode(c.code)}
                  className="ml-auto text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Email ruxsatlari */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" /> Email orqali ruxsat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <input
              type="email"
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              placeholder="email@example.com"
              className="flex-1 min-w-[180px] rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
            <label className="text-sm">
              <input
                type="number"
                value={grantDays}
                onChange={(e) => setGrantDays(Number(e.target.value))}
                className="w-20 rounded-md border border-input bg-background px-2 py-1.5"
              />
              <span className="ml-1 text-muted-foreground">kun</span>
            </label>
            <Button onClick={addGrant} variant="brand" size="sm">
              <Plus className="h-4 w-4" /> Ruxsat berish
            </Button>
          </div>

          <div className="space-y-1.5">
            {emails.length === 0 && <p className="text-sm text-muted-foreground">Ruxsatlar yo'q</p>}
            {emails.map((g) => {
              const active = g.expiresAt > Date.now();
              return (
                <div
                  key={g.email}
                  className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{g.email}</span>
                  <span
                    className={
                      active
                        ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                    }
                  >
                    {active ? daysLeft(g.expiresAt) : "tugagan"}
                  </span>
                  <span className="text-xs text-muted-foreground">{fmt(g.expiresAt)}</span>
                  <button
                    onClick={() => removeGrant(g.email)}
                    className="ml-auto text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {loading && <p className="text-sm text-muted-foreground">Yangilanmoqda…</p>}
    </div>
  );
}
