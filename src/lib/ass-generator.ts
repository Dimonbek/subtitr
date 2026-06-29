import type { StylePreset, Transcript, WordToken } from "@/types/job";

export interface VideoDimensions {
  width: number;
  height: number;
}

interface Line {
  start: number;
  end: number;
  words: WordToken[];
}

const MAX_LINE_DURATION_SEC = 3.5;
// Segment ichida ham shu vaqtdan katta pauza bo'lsa — qatorni bo'lamiz
// (gapirib to'xtagan joyda yangi qator boshlanadi).
const PAUSE_BREAK_SEC = 0.5;

export function chunkWordsIntoLines(transcript: Transcript, maxWordsPerLine: number): Line[] {
  const lines: Line[] = [];

  // MUHIM: har bir segment (gap/jumla) ICHIDA bo'lamiz. Bir qator hech qachon
  // ikki segmentga (ikki gapga) yoyilmaydi — shuning uchun keyingi gapning
  // so'zi oldingi gap qatoriga aralashmaydi.
  for (const segment of transcript.segments) {
    let current: WordToken[] = [];
    let chunkStart = 0;

    const flush = () => {
      if (current.length === 0) return;
      lines.push({
        start: current[0].start,
        end: current[current.length - 1].end,
        words: current,
      });
      current = [];
    };

    for (let i = 0; i < segment.words.length; i++) {
      const word = segment.words[i];
      if (current.length === 0) chunkStart = word.start;
      current.push(word);

      const elapsed = word.end - chunkStart;
      const next = segment.words[i + 1];
      const gapToNext = next ? next.start - word.end : 0;
      // So'z gap tinish belgisi bilan tugasa (. ! ? …) — qatorni shu yerda
      // yopamiz, keyingi gap so'zi bu qatorga aralashmasin.
      const endsSentence = /[.!?…]$/.test(word.word.trim());

      if (
        current.length >= maxWordsPerLine ||
        elapsed >= MAX_LINE_DURATION_SEC ||
        endsSentence ||
        (next && gapToNext >= PAUSE_BREAK_SEC)
      ) {
        flush();
      }
    }
    flush(); // segment tugadi — keyingi segmentga o'tmaymiz
  }

  return lines;
}

export function buildAssFile(
  transcript: Transcript,
  preset: StylePreset,
  video: VideoDimensions,
  fontOverride?: string,
): string {
  // Portret bo'lsa 3 ta, landscape bo'lsa 5 ta so'z qatorda
  const isPortrait = video.height > video.width;
  const maxWords = isPortrait ? 3 : 5;

  // Shrift o'lchami videoning balandligiga nisbatan ~5.5%
  // Foydalanuvchi preset'da bergan o'lcham bilan moslashtirib olamiz
  const baseRatio = preset.fontSize / 1080;
  const heightFactor = isPortrait ? 0.058 : 0.075;
  const fontSize = Math.round(Math.max(baseRatio * video.height, video.height * heightFactor));
  const outlineWidth = Math.max(1, Math.round(preset.outlineWidth * (fontSize / preset.fontSize)));
  const marginH = Math.round(video.width * 0.06);
  const marginV = Math.round(video.height * 0.12);
  const fontFamily = fontOverride || preset.fontFamily;

  const lines = chunkWordsIntoLines(transcript, maxWords);
  const styleSection = buildStyleSection(preset, fontFamily, fontSize, outlineWidth, marginH, marginV);
  const events = lines
    .flatMap((line, idx) => {
      const next = lines[idx + 1];
      const trailing = 0.25;
      // Keyingi qatordan oldin 50ms gap qoldiramiz — overlap'siz va frame-perfect
      const gap = 0.05;
      const cappedEnd = next
        ? Math.min(line.end + trailing, Math.max(line.end, next.start - gap))
        : line.end + trailing;
      return buildLineEvents(line, preset, cappedEnd);
    })
    .filter(Boolean)
    .join("\n");

  return [
    "[Script Info]",
    "Title: Subtitr",
    "ScriptType: v4.00+",
    `PlayResX: ${video.width}`,
    `PlayResY: ${video.height}`,
    "WrapStyle: 0",
    "ScaledBorderAndShadow: yes",
    "YCbCr Matrix: TV.709",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    styleSection,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    events,
    "",
  ].join("\n");
}

function buildStyleSection(
  preset: StylePreset,
  fontFamily: string,
  fontSize: number,
  outlineWidth: number,
  marginH: number,
  marginV: number,
): string {
  const primary = hexToAssColor(preset.primaryColor);
  const secondary = hexToAssColor(preset.highlightColor);
  const outline = hexToAssColor(preset.outlineColor);
  const back = "&H66000000";
  const bold = preset.bold ? -1 : 0;
  const shadow = preset.id === "neon" ? 2 : 0;
  const alignment = 2; // bottom-center

  return `Style: Subtitr,${fontFamily},${fontSize},${primary},${secondary},${outline},${back},${bold},0,0,0,100,100,0,0,1,${outlineWidth},${shadow},${alignment},${marginH},${marginH},${marginV},1`;
}

/** Bitta qatordan bir yoki bir nechta Dialogue eventlari yaratadi (animatsiyaga qarab). */
function buildLineEvents(line: Line, preset: StylePreset, endTime: number): string[] {
  const start = formatAssTime(line.start);
  const end = formatAssTime(Math.max(endTime, line.start + 0.05));

  if (preset.animation === "weight") {
    return buildWeightEvents(line, preset, endTime);
  }

  const text = buildKaraokeText(line, preset);
  if (!text) return [];
  return [`Dialogue: 0,${start},${end},Subtitr,,0,0,0,,${text}`];
}

/**
 * PREMIUM "weight" effekti: aytilgan so'z QALINdan INGICHKAga o'tadi.
 * ASS'da \b (qalin) ni \t bilan animatsiya qilib bo'lmaydi, shuning uchun har
 * "joriy so'z" oralig'i uchun alohida Dialogue event chiqaramiz: o'tgan so'zlar
 * ingichka (\b0) va xira, joriy + keyingi so'zlar qalin (\b1).
 */
function buildWeightEvents(line: Line, preset: StylePreset, endTime: number): string[] {
  const primary = inlineColor(preset.primaryColor);
  const highlight = inlineColor(preset.highlightColor);
  const words = line.words.filter((w) => sanitizeWord(w.word));
  if (words.length === 0) return [];

  const events: string[] = [];
  for (let k = 0; k < words.length; k++) {
    const segStart = words[k].start;
    const segEnd = k < words.length - 1 ? words[k + 1].start : endTime;
    if (segEnd <= segStart + 0.02) continue;

    const fadeIn = k === 0 ? 100 : 0;
    const fadeOut = k === words.length - 1 ? 60 : 0;
    const parts: string[] = [`{\\fad(${fadeIn},${fadeOut})}`];

    for (let i = 0; i < words.length; i++) {
      const cleaned = sanitizeWord(words[i].word);
      if (i < k) {
        // aytilgan so'z: ingichka (regular) + xira
        parts.push(`{\\b0\\1c${primary}\\alpha&H66&}${cleaned}`);
      } else if (i === k) {
        // joriy so'z: qalin + highlight rang
        parts.push(`{\\b1\\1c${highlight}\\alpha&H00&}${cleaned}`);
      } else {
        // hali aytilmagan: qalin + primary
        parts.push(`{\\b1\\1c${primary}\\alpha&H00&}${cleaned}`);
      }
      if (i < words.length - 1) parts.push(`{\\b1\\alpha&H00&} `);
    }
    events.push(
      `Dialogue: 0,${formatAssTime(segStart)},${formatAssTime(segEnd)},Subtitr,,0,0,0,,${parts.join("")}`,
    );
  }
  return events;
}

function buildKaraokeText(line: Line, preset: StylePreset): string {
  // Captions.ai/Submagic uslubi: FAQAT aytilayotgan so'z highlight rangida,
  // qolganlari primary. ASS'da \1c "cascade" qiladi (keyingi matnga oqib o'tadi),
  // shuning uchun HAR SO'Z bloki static \1c primary bilan boshlanadi — bu oldingi
  // so'zning highlight'ini bekor qiladi. Natijada faqat faol so'z rang oladi.
  const primary = inlineColor(preset.primaryColor);
  const highlight = inlineColor(preset.highlightColor);
  const COLOR_FADE_MS = 50; // rang o'tishi uchun qisqa silliq fade
  const LINE_FADE_IN = 120;
  const LINE_FADE_OUT = 60;

  const parts: string[] = [];
  parts.push(`{\\fad(${LINE_FADE_IN},${LINE_FADE_OUT})}`);

  for (let i = 0; i < line.words.length; i++) {
    const w = line.words[i];
    const startMs = Math.max(0, Math.round((w.start - line.start) * 1000));
    const endMs = Math.max(startMs + 40, Math.round((w.end - line.start) * 1000));
    const cleaned = sanitizeWord(w.word);
    if (!cleaned) continue;

    // Har so'z bloki static reset bilan boshlanadi (cascade'ni bekor qiladi),
    // keyin animatsiya turiga qarab effekt qo'shiladi.
    let anim = `\\1c${primary}`;
    // rang highlight — barcha turlarda bor
    anim += `\\t(${startMs},${startMs + COLOR_FADE_MS},\\1c${highlight})\\t(${endMs},${endMs + COLOR_FADE_MS},\\1c${primary})`;

    if (preset.animation === "pop") {
      // PREMIUM: faol so'z kattalashib qaytadi (zarba)
      anim =
        `\\1c${primary}\\fscx100\\fscy100` +
        `\\t(${startMs},${startMs + COLOR_FADE_MS},\\1c${highlight}\\fscx122\\fscy122)` +
        `\\t(${startMs + COLOR_FADE_MS},${startMs + 200},\\fscx100\\fscy100)` +
        `\\t(${endMs},${endMs + COLOR_FADE_MS},\\1c${primary})`;
    } else if (preset.animation === "bounce") {
      // PREMIUM: faol so'z sakraydi (scale overshoot)
      anim =
        `\\1c${primary}\\fscx100\\fscy100` +
        `\\t(${startMs},${startMs + 60},\\1c${highlight}\\fscx112\\fscy132)` +
        `\\t(${startMs + 60},${startMs + 150},\\fscx104\\fscy92)` +
        `\\t(${startMs + 150},${startMs + 240},\\fscx100\\fscy100)` +
        `\\t(${endMs},${endMs + COLOR_FADE_MS},\\1c${primary})`;
    }

    parts.push(`{${anim}}`);
    parts.push(cleaned);
    // Bo'sh joy — primary, normal o'lcham (cascade'siz)
    if (i < line.words.length - 1) parts.push(`{\\1c${primary}\\fscx100\\fscy100} `);
  }

  return parts.join("");
}

function sanitizeWord(word: string): string {
  return word.replace(/[{}\\]/g, "").trim();
}

export function formatAssTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const cs = Math.floor((s - Math.floor(s)) * 100);
  return `${h}:${m.toString().padStart(2, "0")}:${Math.floor(s).toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
}

export function hexToAssColor(hex: string): string {
  // Style sektorida ishlatiladi: &HAABBGGRR (alpha=00 = to'liq ko'rinadi)
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return "&H00FFFFFF";
  const rgb = m[1];
  const r = rgb.slice(0, 2);
  const g = rgb.slice(2, 4);
  const b = rgb.slice(4, 6);
  return `&H00${b}${g}${r}`.toUpperCase();
}

export function inlineColor(hex: string): string {
  // Inline override (\1c, \3c) uchun: &HBBGGRR& (alpha yo'q, oxirida & terminator)
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!m) return "&HFFFFFF&";
  const rgb = m[1];
  const r = rgb.slice(0, 2);
  const g = rgb.slice(2, 4);
  const b = rgb.slice(4, 6);
  return `&H${b}${g}${r}&`.toUpperCase();
}
