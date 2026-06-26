"use client";

import { cn } from "@/lib/utils";
import { PRESET_ORDER, STYLE_PRESETS } from "@/lib/style-presets";
import type { StylePreset } from "@/types/job";

interface StylePresetPickerProps {
  selected: StylePreset["id"] | null;
  onSelect: (id: StylePreset["id"]) => void;
  disabled?: boolean;
}

export function StylePresetPicker({ selected, onSelect, disabled }: StylePresetPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {PRESET_ORDER.map((id) => {
        const preset = STYLE_PRESETS[id];
        const isSelected = selected === id;
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(id)}
            className={cn(
              "group relative overflow-hidden rounded-xl border bg-card p-4 text-left transition-all",
              isSelected
                ? "border-brand ring-2 ring-brand/40"
                : "border-border hover:border-brand/60",
              disabled && "pointer-events-none opacity-60",
            )}
          >
            <div
              className="flex h-20 items-center justify-center rounded-lg mb-3"
              style={{
                background:
                  id === "neon"
                    ? "linear-gradient(135deg, #1a0033, #4a004a)"
                    : id === "minimal"
                      ? "#1f2937"
                      : "#000000",
              }}
            >
              <PresetPreview presetId={id} />
            </div>
            <h4 className="text-sm font-semibold">{preset.name}</h4>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {preset.description}
            </p>
            {isSelected && (
              <span className="absolute top-2 right-2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-medium text-brand-foreground">
                Tanlangan
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function PresetPreview({ presetId }: { presetId: StylePreset["id"] }) {
  const preset = STYLE_PRESETS[presetId];
  return (
    <span
      className="inline-flex items-baseline gap-1"
      style={{
        fontFamily: preset.fontFamily,
        fontWeight: preset.bold ? 900 : 500,
        fontSize: presetId === "mrbeast" ? "20px" : "16px",
        WebkitTextStroke: `${Math.max(1, preset.outlineWidth / 3)}px ${preset.outlineColor}`,
      }}
    >
      <span style={{ color: preset.primaryColor }}>SO&lsquo;Z</span>
      <span style={{ color: preset.highlightColor }}>BU</span>
    </span>
  );
}
