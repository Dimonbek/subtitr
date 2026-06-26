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

export function chunkWordsIntoLines(transcript: Transcript, maxWordsPerLine: number): Line[] {
  const allWords = transcript.segments.flatMap((s) => s.words);
  const lines: Line[] = [];
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

  for (const word of allWords) {
    if (current.length === 0) chunkStart = word.start;
    current.push(word);
    const elapsed = word.end - chunkStart;
    if (current.length >= maxWordsPerLine || elapsed >= MAX_LINE_DURATION_SEC) flush();
  }
  flush();
  return lines;
}

export function buildAssFile(
  transcript: Transcript,
  preset: StylePreset,
  video: VideoDimensions,
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

  const lines = chunkWordsIntoLines(transcript, maxWords);
  const styleSection = buildStyleSection(preset, fontSize, outlineWidth, marginH, marginV);
  const events = lines
    .map((line, idx) => {
      const next = lines[idx + 1];
      const trailing = 0.25;
      // Keyingi qatordan oldin 50ms gap qoldiramiz — overlap'siz va frame-perfect
      const gap = 0.05;
      const cappedEnd = next
        ? Math.min(line.end + trailing, Math.max(line.end, next.start - gap))
        : line.end + trailing;
      return buildDialogueLine(line, preset, cappedEnd);
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

  return `Style: Subtitr,${preset.fontFamily},${fontSize},${primary},${secondary},${outline},${back},${bold},0,0,0,100,100,0,0,1,${outlineWidth},${shadow},${alignment},${marginH},${marginH},${marginV},1`;
}

function buildDialogueLine(line: Line, preset: StylePreset, endTime: number): string {
  const start = formatAssTime(line.start);
  // endTime — keyingi qator boshlanishi yoki line.end + 0.25 dan kichigi.
  // start + 50ms minimal davomiylik (degenerativ holatlar uchun).
  const end = formatAssTime(Math.max(endTime, line.start + 0.05));
  const text = buildKaraokeText(line, preset);
  if (!text) return "";
  return `Dialogue: 0,${start},${end},Subtitr,,0,0,0,,${text}`;
}

function buildKaraokeText(line: Line, preset: StylePreset): string {
  // Captions.ai/Submagic uslubi: faqat rang almashishi (per-word scale yo'q).
  // Vaqt \t ichida millisekundlarda Dialogue boshidan hisoblanadi.
  // Format: \t(t1,t2,\1c&Hcolor&) — t1 dan t2 gacha rang o'zgaradi.
  const primary = inlineColor(preset.primaryColor);
  const highlight = inlineColor(preset.highlightColor);
  // Color transition uchun qisqa fade — 80ms — silliq ko'rinish uchun
  const COLOR_FADE_MS = 60;
  // Qator boshida ko'rinish uchun yumshoq fade-in/out (150ms in, 0 out)
  const LINE_FADE_IN = 150;
  const LINE_FADE_OUT = 80;

  const parts: string[] = [];
  // Boshlanish: qator fade-in + barcha so'zlar primary rangda
  parts.push(`{\\fad(${LINE_FADE_IN},${LINE_FADE_OUT})\\1c${primary}}`);

  for (let i = 0; i < line.words.length; i++) {
    const w = line.words[i];
    const startMs = Math.max(0, Math.round((w.start - line.start) * 1000));
    const endMs = Math.max(startMs + 40, Math.round((w.end - line.start) * 1000));
    const cleaned = sanitizeWord(w.word);
    if (!cleaned) continue;
    // So'z boshlanganda highlight'ga, oxirida primary'ga qaytadi. Qisqa fade.
    parts.push(
      `{\\t(${startMs},${startMs + COLOR_FADE_MS},\\1c${highlight})\\t(${endMs},${endMs + COLOR_FADE_MS},\\1c${primary})}`,
    );
    parts.push(cleaned);
    if (i < line.words.length - 1) parts.push(" ");
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
