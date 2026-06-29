"use client";

import type { CSSProperties } from "react";
import { Crown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRESET_ORDER, STYLE_PRESETS } from "@/lib/style-presets";
import type { StylePreset } from "@/types/job";

interface StylePresetPickerProps {
  selected: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
  /** Premium uslublardan foydalanish mumkinmi (obuna). */
  isPro?: boolean;
}

export function StylePresetPicker({ selected, onSelect, disabled, isPro }: StylePresetPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {PRESET_ORDER.map((id) => {
        const preset = STYLE_PRESETS[id];
        const isSelected = selected === id;
        const locked = preset.premium && !isPro;
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(id)}
            className={cn(
              "group relative overflow-hidden rounded-xl border bg-card p-3 text-left transition-all",
              isSelected
                ? "border-brand ring-2 ring-brand/40"
                : "border-border hover:border-brand/60",
              disabled && "pointer-events-none opacity-60",
            )}
          >
            <PresetPreview presetId={id} />
            <div className="mt-3 flex items-center gap-1.5">
              <h4 className="text-sm font-semibold">{preset.name}</h4>
              {preset.premium && (
                <Crown className="h-3.5 w-3.5 text-amber-500" aria-label="Premium" />
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {preset.description}
            </p>
            {isSelected && (
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-medium text-brand-foreground">
                <Check className="h-2.5 w-2.5" /> Tanlangan
              </span>
            )}
            {locked && !isSelected && (
              <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-medium text-white">
                <Crown className="h-2.5 w-2.5" /> Pro
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Har bir uslubning HAQIQIY ko'rinishini ko'rsatadi:
 *   • o'sha preset shrifti (Anton / Archivo Black / Montserrat)
 *   • ikki so'z: birinchisi primary rangda, ikkinchisi highlight rangda
 *     (so'z-so'z highlight effektini namoyish qiladi)
 *   • to'g'ri outline (paint-order: stroke — qora "blob" bo'lmaydi)
 */
function PresetPreview({ presetId }: { presetId: StylePreset["id"] }) {
  const preset = STYLE_PRESETS[presetId];

  const bg =
    presetId === "neon"
      ? "radial-gradient(circle at 50% 60%, #2a0a3f, #0d0518)"
      : presetId === "minimal"
        ? "linear-gradient(160deg, #2b3240, #141821)"
        : "linear-gradient(160deg, #181818, #050505)";

  const fontSize = presetId === "mrbeast" ? 24 : presetId === "minimal" ? 18 : 21;
  const stroke = Math.max(1.5, preset.outlineWidth / 2.4);

  const textStyle: CSSProperties = {
    fontFamily: `"${preset.fontFamily}", system-ui, sans-serif`,
    fontSize,
    fontWeight: 700,
    lineHeight: 1.05,
    textTransform: "uppercase",
    letterSpacing: presetId === "mrbeast" ? "0.5px" : "0px",
    WebkitTextStrokeWidth: `${stroke}px`,
    WebkitTextStrokeColor: preset.outlineColor,
    // stroke ORQADA, fill USTIDA — letterlar to'lib qoramas bo'lib qolmaydi
    paintOrder: "stroke fill",
    textShadow:
      presetId === "neon"
        ? `0 0 6px ${preset.highlightColor}, 0 0 2px ${preset.highlightColor}`
        : "0 2px 3px rgba(0,0,0,0.5)",
  };

  return (
    <div
      className="flex h-24 items-center justify-center rounded-lg px-2 text-center"
      style={{ background: bg }}
    >
      <span style={textStyle}>
        <span style={{ color: preset.primaryColor }}>SO&lsquo;Z</span>{" "}
        <span style={{ color: preset.highlightColor }}>SHU</span>
      </span>
    </div>
  );
}
