"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, Pencil, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";
import type { Transcript } from "@/types/job";

interface TranscriptEditorProps {
  jobId: string;
  transcript: Transcript;
  disabled?: boolean;
  onSaved?: (updated: Transcript) => void;
}

export function TranscriptEditor({ jobId, transcript, disabled, onSaved }: TranscriptEditorProps) {
  const [drafts, setDrafts] = useState<string[]>(() => transcript.segments.map((s) => s.text));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // E'tibor (reference) matni
  const [showRef, setShowRef] = useState(false);
  const [refText, setRefText] = useState("");
  const [applyingRef, setApplyingRef] = useState(false);

  const applyReference = async () => {
    if (!refText.trim()) return;
    setApplyingRef(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/reference`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: refText }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Qo'llashda xato");
      }
      const job = await fetch(`/api/jobs/${jobId}`).then((r) => r.json());
      if (job?.transcript) {
        onSaved?.(job.transcript);
        setDrafts(job.transcript.segments.map((s: { text: string }) => s.text));
      }
      setShowRef(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Noma'lum xato");
    } finally {
      setApplyingRef(false);
    }
  };

  // Yangi transkript kelganda draft'larni yangilash (faqat tahrir qilinmagan bo'lsa)
  useEffect(() => {
    const original = transcript.segments.map((s) => s.text);
    setDrafts((prev) =>
      prev.length === original.length && prev.every((p, i) => p === original[i] || p === drafts[i])
        ? original
        : prev,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript]);

  const isDirty = drafts.some((d, i) => d.trim() !== transcript.segments[i]?.text.trim());

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/transcript`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segments: drafts }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Saqlashda xato");
      }
      setSavedAt(Date.now());
      // Local transcript holatini yangilash uchun yangi transkript yuklab olamiz
      const job = await fetch(`/api/jobs/${jobId}`).then((r) => r.json());
      if (job?.transcript) onSaved?.(job.transcript);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Noma'lum xato");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            Whisper aniqlamagan so'zlarni qo'lda tahrirlang. Saqlagandan keyin <b>Tayyorlash</b> tugmasini bosing.
            Vaqt har segment ichida so'zlar bo'yicha avtomatik qayta taqsimlanadi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && !saving && (
            <span className="text-xs text-amber-600 dark:text-amber-400">
              <Pencil className="inline h-3 w-3 mr-1" />
              tahrir qilingan
            </span>
          )}
          {savedAt && !isDirty && !saving && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400">
              <Check className="inline h-3 w-3 mr-1" />
              saqlandi
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowRef((v) => !v)}
            disabled={disabled || saving}
          >
            <FileText className="h-4 w-4" /> E&apos;tibor matni
          </Button>
          <Button
            size="sm"
            variant={isDirty ? "brand" : "outline"}
            onClick={save}
            disabled={disabled || saving || !isDirty}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            O&apos;zgarishlarni saqlash
          </Button>
        </div>
      </div>

      {showRef && (
        <div className="rounded-lg border border-brand/40 bg-brand/5 p-3">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            <span className="text-sm font-medium">Videodagi to&apos;liq matn</span>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            Videodagi nutqning to&apos;liq, to&apos;g&apos;ri matnini (masalan she&apos;r yoki ssenariy)
            shu yerga joylashtiring. Tizim so&apos;zlarni vaqtga moslab, aniq yozib chiqadi.
          </p>
          <textarea
            value={refText}
            onChange={(e) => setRefText(e.target.value)}
            disabled={applyingRef}
            rows={5}
            placeholder="Masalan: Assalomu alaykum, bugun siz bilan..."
            className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand/40"
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowRef(false)} disabled={applyingRef}>
              Bekor
            </Button>
            <Button
              variant="brand"
              size="sm"
              onClick={applyReference}
              disabled={applyingRef || !refText.trim()}
            >
              {applyingRef ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Matnni qo&apos;llash
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/5 p-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {transcript.segments.map((seg, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3"
          >
            <span className="mt-2 shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums">
              {formatDuration(seg.start)}
            </span>
            <textarea
              value={drafts[i] ?? ""}
              onChange={(e) => {
                setDrafts((prev) => prev.map((d, j) => (j === i ? e.target.value : d)));
              }}
              disabled={disabled || saving}
              rows={Math.max(1, Math.ceil((drafts[i]?.length ?? 0) / 60))}
              className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
