/**
 * Turkcha harflar va keng tarqalgan so'zlarni o'zbek lotin alifbosiga o'tkazish.
 */
export function turkishToUzbek(text: string): string {
  if (!text) return text;

  let result = text;

  // 1. Turkcha harflarni o'zbek lotin alifbosiga o'tkazish
  const charMap: Record<string, string> = {
    // Kichik harflar
    "ç": "ch",
    "ş": "sh",
    "ğ": "g'",
    "ö": "o'",
    "ü": "u",
    "ı": "i",
    // Katta harflar
    "Ç": "Ch",
    "Ş": "Sh",
    "Ğ": "G'",
    "Ö": "O'",
    "Ü": "U",
    "İ": "I",
  };

  for (const [tr, uz] of Object.entries(charMap)) {
    result = result.replaceAll(tr, uz);
  }

  // 2. Keng tarqalgan turkcha so'z va qo'shimchalarni o'zbekcha muqobiliga o'tkazish
  // Word boundary regex orqali faqat butun so'zlarni almashtiramiz
  const wordMap: [RegExp, string][] = [
    [/\b[Ee]vet\b/g, "ha"],
    [/\b[Hh]ayır\b/g, "yo'q"],
    [/\b[Yy]ok\b/g, "yo'q"],
    [/\b[Dd]eğil\b/g, "emas"],
    [/\b[Çç]ünkü\b/g, "chunki"],
    [/\b[Ll]ütfen\b/g, "iltimos"],
    [/\b[Mm]erhaba\b/g, "salom"],
    [/\b[Tt]eşekkürler\b/g, "rahmat"],
    [/\b[Tt]eşekkür\s+ederim\b/gi, "rahmat"],
    [/\b[Bb]en\b/g, "men"],
    [/\b[Oo]nlar\b/g, "ular"],
    [/\b[Ss]adece\b/g, "faqat"],
    [/\b[Bb]öyle\b/g, "shunday"],
    [/\b[Şş]imdi\b/g, "hozir"],
    [/\b[Ss]onra\b/g, "keyin"],
    [/\b[Bb]üyük\b/g, "katta"],
    [/\b[Kk]üçük\b/g, "kichik"],
    [/\b[Yy]eni\b/g, "yangi"],
    [/\b[Ee]ski\b/g, "eski"],
    [/\b[Kk]ötü\b/g, "yomon"],
    [/\b[Gg]üzel\b/g, "chiroyli"],
    [/\b[Aa]rkadaş\b/g, "do'st"],
    [/\b[Aa]dam\b/g, "odam"],
    [/\b[Kk]adın\b/g, "ayol"],
    [/\b[Cc]ocuk\b/g, "bola"],
    [/\b[Aa]ile\b/g, "oila"],
    [/\b[Gg]ün\b/g, "kun"],
    [/\b[Ii]ş\b/gi, "ish"],
    [/\b[Yy]ıl\b/g, "yil"],
    [/\b[Zz]aman\b/g, "vaqt"],
    [/\b[Yy]apıyor\b/g, "qilyapti"],
    [/\b[Gg]idiyor\b/g, "ketyapti"],
    [/\b[Gg]eliyor\b/g, "kelyapti"],
    [/\b[Ii]stiyorum\b/gi, "xohlayman"],
    [/\b[Bb]iliyorum\b/g, "bilaman"],
    [/\b[Gg]örüyorum\b/g, "ko'ryapman"],
    [/\b[Aa]nlıyorum\b/g, "tushunyapman"],
    [/\b[Yy]apmak\b/g, "qilish"],
    [/\b[Gg]itmek\b/g, "ketish"],
    [/\b[Gg]elmek\b/g, "kelish"],
    [/\b[Ii]stemek\b/gi, "xohlash"],
    [/\b[Bb]ilmek\b/g, "bilish"],
    [/\b[Gg]örmek\b/g, "ko'rish"],
  ];

  for (const [regex, replacement] of wordMap) {
    result = result.replace(regex, (match) => {
      // Birinchi harfi kattaligini saqlash
      if (match[0] === match[0].toUpperCase()) {
        return replacement[0].toUpperCase() + replacement.slice(1);
      }
      return replacement;
    });
  }

  return result;
}
