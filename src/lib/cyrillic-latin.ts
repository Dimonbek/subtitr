// O'zbek kirill → lotin transliteratsiyasi.
// ElevenLabs Scribe ba'zan kirill alifbosida qaytaradi; bizga lotin kerak.

// Ko'p harfli (digraf) mappinglar — alohida ishlanadi (katta/kichik holatga qarab)
const DIGRAPHS: Record<string, string> = {
  ё: "yo",
  ж: "j",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sh",
  ю: "yu",
  я: "ya",
  ў: "o'",
  ғ: "g'",
};

// Bir harfli mappinglar
const SINGLES: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "x",
  ъ: "'",
  ы: "i",
  ь: "",
  э: "e",
  қ: "q",
  ҳ: "h",
};

const VOWELS_CYR = new Set(["а", "е", "ё", "и", "о", "у", "э", "ю", "я", "ў"]);

export function isCyrillic(text: string): boolean {
  return /[Ѐ-ӿԀ-ԯ]/.test(text);
}

/**
 * Bitta so'zning katta/kichik holatiga qarab digrafni moslashtirish.
 * "Ш" (so'z boshida, qolgani kichik) → "Sh"; "ШУ" (hammasi katta) → "SH".
 */
function applyCaseToDigraph(latin: string, isUpper: boolean, restUpper: boolean): string {
  if (!isUpper) return latin;
  if (restUpper) return latin.toUpperCase();
  // Title-case: birinchi harf katta
  return latin.charAt(0).toUpperCase() + latin.slice(1);
}

export function cyrillicToLatin(input: string): string {
  let out = "";
  const chars = [...input];

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const lower = ch.toLowerCase();
    const isUpper = ch !== lower && ch === ch.toUpperCase();

    // Keyingi harf katta-kichikligini aniqlash (digraf case uchun)
    const next = chars[i + 1];
    const restUpper = next ? next === next.toUpperCase() && next !== next.toLowerCase() : false;

    // Digraflar
    if (lower in DIGRAPHS) {
      out += applyCaseToDigraph(DIGRAPHS[lower], isUpper, restUpper);
      continue;
    }

    // "е" — so'z boshida yoki unlidan keyin "ye", aks holda "e"
    if (lower === "е") {
      const prev = chars[i - 1];
      const atWordStart = !prev || !/[\p{L}]/u.test(prev);
      const afterVowel = prev && VOWELS_CYR.has(prev.toLowerCase());
      const latin = atWordStart || afterVowel ? "ye" : "e";
      out += applyCaseToDigraph(latin, isUpper, restUpper);
      continue;
    }

    // Bir harfli
    if (lower in SINGLES) {
      const latin = SINGLES[lower];
      out += isUpper && latin ? latin.toUpperCase() : latin;
      continue;
    }

    // Kirill bo'lmagan belgilar (lotin harflar, raqamlar, tinish) — o'zgarmaydi
    out += ch;
  }

  return out;
}

/**
 * Har xil apostrof/tutuq belgilarini standart ASCII ' ga keltiradi.
 * ElevenLabs ba'zan o´ (acute), o` (grave), o' (curly) qaytaradi — biz o' istaymiz.
 */
export function normalizeApostrophes(text: string): string {
  return text.replace(/[´`ʻʼ‘’‚‛ˋˊ]/g, "'");
}

/**
 * Turkcha-ga xos harflarni o'zbek lotin alifbosidagi ekvivalentiga o'giradi.
 * Bu harflar (ç ş ğ ı ö ü â î û) o'zbek lotin alifbosida UMUMAN ishlatilmaydi,
 * shuning uchun ElevenLabs ularni qaytarsa — bu turkcha "sizib chiqishi" demak.
 * Deterministik o'girish: ç→ch, ş→sh, ğ→g', ı→i, ö→o', ü→u.
 */
const TURKISH_MAP: Record<string, string> = {
  ç: "ch",
  ş: "sh",
  ğ: "g'",
  ı: "i",
  ö: "o'",
  ü: "u",
  â: "a",
  î: "i",
  û: "u",
  Ç: "Ch",
  Ş: "Sh",
  Ğ: "G'",
  İ: "I",
  Ö: "O'",
  Ü: "U",
  Â: "A",
  Î: "I",
  Û: "U",
};

export function turkishToUzbek(text: string): string {
  return text.replace(/[çşğıöüâîûÇŞĞİÖÜÂÎÛ]/g, (ch) => TURKISH_MAP[ch] ?? ch);
}

/**
 * Matnni o'zbek lotin alifbosiga keltiradi:
 *   1) kirill bo'lsa → lotin transliteratsiya
 *   2) turkcha harflar → o'zbekcha (ç→ch, ş→sh, ...)
 *   3) apostroflarni standartlash (´ ` ' → ')
 */
export function ensureLatin(text: string): string {
  let out = isCyrillic(text) ? cyrillicToLatin(text) : text;
  out = turkishToUzbek(out);
  return normalizeApostrophes(out);
}
