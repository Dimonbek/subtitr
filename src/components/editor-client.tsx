"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Download,
  Loader2,
  Sparkles,
  ArrowLeft,
  AlertTriangle,
  RotateCcw,
  Coins,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StylePresetPicker } from "@/components/style-preset-picker";
import { FontPicker } from "@/components/font-picker";
import { CoinShop } from "@/components/coin-shop";
import { TranscriptEditor } from "@/components/transcript-editor";
import { formatDuration } from "@/lib/utils";
import type { Job, Transcript } from "@/types/job";

interface EditorClientProps {
  jobId: string;
  initialJob: Job;
  initialPro: boolean;
  initialCoins: number;
}

export function EditorClient({ jobId, initialJob, initialPro, initialCoins }: EditorClientProps) {
  const [job, setJob] = useState<Job>(initialJob);
  const [preset, setPreset] = useState<string>("tiktok");
  const [font, setFont] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [isPro, setIsPro] = useState(initialPro);
  const [coins, setCoins] = useState(initialCoins);
  const [showShop, setShowShop] = useState(false);

  // Coin yo'q va obuna ham yo'q — tayyorlash uchun sotib olish kerak
  const canRender = isPro || coins > 0;
  // SSE qayta ulanish uchun versiya — bump qilsak useEffect qayta ishlaydi
  const [sseVersion, setSseVersion] = useState(0);
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (job.status === "done" || job.status === "failed") return;
    const es = new EventSource(`/api/jobs/${jobId}/events`);
    sseRef.current = es;
    es.addEventListener("state", (e) => {
      try {
        const parsed = JSON.parse((e as MessageEvent).data) as Job;
        setJob(parsed);
        if (parsed.status === "done" || parsed.status === "failed") {
          setBusy(false);
        }
      } catch {
        /* ignore */
      }
    });
    es.addEventListener("end", () => es.close());
    es.onerror = () => es.close();
    return () => {
      es.close();
      sseRef.current = null;
    };
  }, [jobId, sseVersion, job.status]);

  const isProcessing =
    job.status === "uploading" ||
    job.status === "extracting_audio" ||
    job.status === "transcribing" ||
    job.status === "rendering";
  const isReady = job.status === "ready_to_render";
  const isDone = job.status === "done";
  const isFailed = job.status === "failed";
  const canAct = !isProcessing && !busy;

  const requestRender = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset, font }),
      });
      if (res.status === 402) {
        // Coin yetarli emas — do'konni ochamiz
        setShowShop(true);
        setBusy(false);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Tayyorlash boshlanmadi");
      }
      // Obuna bo'lmasa 1 coin yechildi
      if (!isPro) setCoins((c) => Math.max(0, c - 1));
      // SSE qayta ulanishi uchun job statusini "rendering" ga o'zgartirib, version bump qilamiz
      setJob((prev) => ({ ...prev, status: "rendering", progress: 0, error: undefined }));
      setSseVersion((v) => v + 1);
    } catch (err) {
      console.error(err);
      setBusy(false);
    }
  }, [jobId, preset, font, isPro]);

  const requestRetranscribe = useCallback(async () => {
    if (!confirm("Qayta tarjima qilamizmi? Mavjud tahrirlar o'chiriladi.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/transcribe`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Qayta tarjima boshlanmadi");
      }
      setJob((prev) => ({ ...prev, status: "transcribing", progress: 0, error: undefined }));
      setSseVersion((v) => v + 1);
    } catch (err) {
      console.error(err);
      setBusy(false);
    }
  }, [jobId]);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Bosh sahifa
      </Link>

      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{job.sourceFilename}</h1>
        <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
          {job.duration ? <span>{formatDuration(job.duration)}</span> : null}
          <StatusBadge job={job} />
        </div>
      </header>

      {isFailed && (
        <Card className="mb-6 border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-5">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive">Xato</h3>
              <p className="mt-1 text-sm text-muted-foreground">{job.error}</p>
            </div>
            {job.transcript && (
              <Button variant="outline" size="sm" onClick={requestRetranscribe} disabled={busy}>
                <RotateCcw className="h-4 w-4" /> Qaytadan urinish
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {isProcessing && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Loader2 className="h-5 w-5 animate-spin text-brand" />
              <span className="font-medium">{job.message ?? statusLabel(job.status)}</span>
              <span className="ml-auto text-sm text-muted-foreground tabular-nums">
                {job.progress}%
              </span>
            </div>
            <Progress value={job.progress} />
          </CardContent>
        </Card>
      )}

      {(isReady || isProcessing || isDone) && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-5">
          <div className="md:col-span-3">
            <Card>
              <CardContent className="p-2">
                <VideoPreview jobId={jobId} done={isDone} />
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Subtitr uslubi</CardTitle>
              </CardHeader>
              <CardContent>
                <StylePresetPicker
                  selected={preset}
                  onSelect={setPreset}
                  disabled={isProcessing}
                  isPro
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-1.5 text-base">Shrift</CardTitle>
              </CardHeader>
              <CardContent>
                <FontPicker selected={font} onSelect={setFont} disabled={isProcessing} isPro />
              </CardContent>
            </Card>

            {/* Coin balansi */}
            <div className="flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm">
              <span className="flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-amber-500" />
                {isPro ? (
                  <span className="font-medium">Cheksiz obuna faol</span>
                ) : (
                  <span>
                    Balans: <b>{coins}</b> coin
                  </span>
                )}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setShowShop((v) => !v)}>
                Coin sotib olish
              </Button>
            </div>

            {(showShop || !canRender) && (
              <CoinShop
                coins={coins}
                isPro={isPro}
                onUpdated={(c, pro) => {
                  setCoins(c);
                  setIsPro(pro);
                  if (pro || c > 0) setShowShop(false);
                }}
              />
            )}

            <div className="flex flex-col gap-2">
              {isDone && (
                <Button size="xl" variant="brand" asChild>
                  <a href={`/api/jobs/${jobId}/download`}>
                    <Download className="h-5 w-5" />
                    Subtitr bilan yuklab olish
                  </a>
                </Button>
              )}

              {(isReady || isDone) && (
                <Button
                  size={isDone ? "lg" : "xl"}
                  variant={isDone ? "outline" : "brand"}
                  onClick={canRender ? requestRender : () => setShowShop(true)}
                  disabled={!canAct}
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Boshlanmoqda...
                    </>
                  ) : !canRender ? (
                    <>
                      <Coins className="h-5 w-5" /> Coin sotib olish
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      {isDone ? "Qayta tayyorlash" : "Tayyorlash"}
                      {!isPro && <span className="ml-1 text-xs opacity-80">(1 coin)</span>}
                    </>
                  )}
                </Button>
              )}

              {(isReady || isDone) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={requestRetranscribe}
                  disabled={!canAct}
                  className="self-center text-muted-foreground"
                >
                  <RotateCcw className="h-4 w-4" />
                  Qayta tarjima qilish
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {job.transcript && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-base">Transkripsiya — qo&apos;lda tahrirlash</CardTitle>
          </CardHeader>
          <CardContent>
            <TranscriptEditor
              jobId={jobId}
              transcript={job.transcript}
              disabled={isProcessing || busy}
              onSaved={(updated: Transcript) =>
                setJob((prev) => ({ ...prev, transcript: updated }))
              }
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ job }: { job: Job }) {
  const colors: Record<Job["status"], string> = {
    uploading: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    extracting_audio: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    transcribing: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    ready_to_render: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    rendering: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    done: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    failed: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[job.status]}`}
    >
      {statusLabel(job.status)}
    </span>
  );
}

function statusLabel(status: Job["status"]): string {
  return {
    uploading: "Yuklanmoqda",
    extracting_audio: "Audio chiqarilmoqda",
    transcribing: "Nutq aniqlanmoqda",
    ready_to_render: "Tayyorlashga tayyor",
    rendering: "Tayyorlanmoqda",
    done: "Tayyor",
    failed: "Xato",
  }[status];
}

function VideoPreview({ jobId, done }: { jobId: string; done: boolean }) {
  return (
    <video
      key={done ? "done" : "source"}
      controls
      className="aspect-video w-full rounded-lg bg-black"
      src={done ? `/api/jobs/${jobId}/download` : undefined}
      poster=""
    >
      Brauzeringiz video tegini qo&apos;llab-quvvatlamaydi.
    </video>
  );
}
