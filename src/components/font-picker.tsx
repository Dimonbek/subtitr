"use client";

import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { CAPTION_FONTS } from "@/lib/fonts";

interface FontPickerProps {
  selected: string | null;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
  isPro?: boolean;
}

export function FontPicker({ selected, onSelect, disabled, isPro }: FontPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {/* Standart — uslub o'z shriftini ishlatadi */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(null)}
        className={cn(
          "rounded-lg border px-3 py-2 text-sm transition-all",
          selected === null
            ? "border-brand ring-2 ring-brand/40"
            : "border-border hover:border-brand/60",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        Standart
      </button>

      {CAPTION_FONTS.map((font) => {
        const isSelected = selected === font.id;
        const locked = font.premium && !isPro;
        return (
          <button
            key={font.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(font.id)}
            className={cn(
              "relative rounded-lg border px-3 py-2 text-base transition-all",
              isSelected
                ? "border-brand ring-2 ring-brand/40"
                : "border-border hover:border-brand/60",
              disabled && "pointer-events-none opacity-60",
            )}
            style={{ fontFamily: `"${font.family}", system-ui, sans-serif` }}
          >
            {font.label}
            {locked && (
              <Crown className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 text-amber-500" />
            )}
          </button>
        );
      })}
    </div>
  );
}
