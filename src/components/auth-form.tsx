"use client";

import { useState } from "react";
import { Mail, Lock, Loader2, Sparkles, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface AuthFormProps {
  onSuccess: () => void;
}

export function AuthForm({ onSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailTrimmed = email.trim();
    if (!emailTrimmed || !password) {
      setError("Barcha maydonlarni to'ldiring");
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError("Parollar mos kelmadi");
      return;
    }

    if (!isLogin && password.length < 4) {
      setError("Parol kamida 4 ta belgidan iborat bo'lishi kerak");
      return;
    }

    setBusy(true);
    try {
      const endpoint = isLogin ? "/api/access/login" : "/api/access/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTrimmed, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Xatolik yuz berdi");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-border/80 bg-card/60 shadow-xl backdrop-blur-md">
      <CardHeader className="space-y-1.5 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand mb-2">
          <Sparkles className="h-5 w-5" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">
          {isLogin ? "Tizimga kirish" : "Ro'yxatdan o'tish"}
        </CardTitle>
        <CardDescription>
          {isLogin 
            ? "Loyihadan foydalanish uchun email va parolingizni kiriting" 
            : "Ro'yxatdan o'ting va 3 ta bepul coinga ega bo'ling!"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Email manzilingiz
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                required
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                className="flex h-10 w-full rounded-md border border-input bg-background px-10 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">
              Parol
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                className="flex h-10 w-full rounded-md border border-input bg-background px-10 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Parolni tasdiqlang
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={busy}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-10 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/15 p-3 text-sm font-medium text-destructive">
              {error}
            </div>
          )}

          <Button type="submit" disabled={busy} className="w-full bg-brand hover:bg-brand/90 text-brand-foreground flex items-center justify-center gap-2">
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isLogin ? (
              <>
                <LogIn className="h-4 w-4" /> Kirish
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" /> Ro'yxatdan o'tish
              </>
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground mt-4">
            {isLogin ? (
              <p>
                Hisobingiz yo'qmi?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(false);
                    setError(null);
                  }}
                  className="font-semibold text-brand hover:underline"
                >
                  Ro'yxatdan o'tish
                </button>
              </p>
            ) : (
              <p>
                Sizda hisob bormi?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(true);
                    setError(null);
                  }}
                  className="font-semibold text-brand hover:underline"
                >
                  Kirish
                </button>
              </p>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
