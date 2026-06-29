// Subtitr shriftlari ro'yxati. `family` — shriftning ICHKI nomi: u libass
// (fontsdir) bilan ham, brauzer @font-face bilan ham aynan mos kelishi shart.
export interface CaptionFont {
  id: string;
  family: string;
  label: string;
  /** Premium obuna talab qiladimi (8 shriftdan ba'zilari bepul). */
  premium: boolean;
}

export const CAPTION_FONTS: CaptionFont[] = [
  { id: "anton", family: "Anton", label: "Anton", premium: false },
  { id: "archivo", family: "Archivo Black", label: "Archivo Black", premium: false },
  { id: "montserrat", family: "Montserrat", label: "Montserrat", premium: false },
  { id: "poppins", family: "Poppins", label: "Poppins", premium: true },
  { id: "bebas", family: "Bebas Neue", label: "Bebas Neue", premium: true },
  { id: "oswald", family: "Oswald", label: "Oswald", premium: true },
  { id: "rubik", family: "Rubik", label: "Rubik", premium: true },
  { id: "inter", family: "Inter", label: "Inter", premium: true },
];

const BY_ID = new Map(CAPTION_FONTS.map((f) => [f.id, f]));
const BY_FAMILY = new Map(CAPTION_FONTS.map((f) => [f.family, f]));

export function fontFamilyFromId(id: string | undefined): string | null {
  if (!id) return null;
  return BY_ID.get(id)?.family ?? null;
}

export function isKnownFamily(family: string): boolean {
  return BY_FAMILY.has(family);
}
