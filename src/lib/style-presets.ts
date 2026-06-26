import type { StylePreset } from "@/types/job";

// Shrift nomlari loyiha ichidagi fonts/ papkasidagi fayllarning ichki
// (family) nomlariga mos kelishi shart — chunki render vaqtida libass shu
// papkadan (fontsdir) yuklaydi. Mavjud: Anton, Archivo Black, Montserrat.
export const STYLE_PRESETS: Record<StylePreset["id"], StylePreset> = {
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    description: "Oq matn, sariq active so'z, qora outline — klassik TikTok ko'rinishi",
    fontFamily: "Archivo Black",
    fontSize: 72,
    primaryColor: "#FFFFFF",
    highlightColor: "#FFD400",
    outlineColor: "#000000",
    outlineWidth: 5,
    bold: false,
  },
  mrbeast: {
    id: "mrbeast",
    name: "MrBeast",
    description: "Katta yog'on shrift, yashil highlight — diqqatni tortuvchi",
    fontFamily: "Anton",
    fontSize: 92,
    primaryColor: "#FFFFFF",
    highlightColor: "#00E676",
    outlineColor: "#000000",
    outlineWidth: 7,
    bold: false,
  },
  minimal: {
    id: "minimal",
    name: "Minimal",
    description: "Sodda oq matn, ozgina outline — neytral va keng moslashuvchan",
    fontFamily: "Montserrat",
    fontSize: 58,
    primaryColor: "#FFFFFF",
    highlightColor: "#FFFFFF",
    outlineColor: "#000000",
    outlineWidth: 3,
    bold: false,
  },
  neon: {
    id: "neon",
    name: "Neon",
    description: "Pushti-cyan neon highlight — modern AI-product ko'rinishi",
    fontFamily: "Archivo Black",
    fontSize: 72,
    primaryColor: "#FF4FD8",
    highlightColor: "#00E5FF",
    outlineColor: "#1A0033",
    outlineWidth: 4,
    bold: false,
  },
};

export const PRESET_ORDER: StylePreset["id"][] = ["tiktok", "mrbeast", "minimal", "neon"];
