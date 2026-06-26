# Subtitr

Videoga avtomatik so'z-so'z animatsiyali (karaoke) subtitr qo'shuvchi AI veb-ilova. O'zbek tiliga moslangan.

## Texnologiya

- **Next.js 16** (App Router) + TypeScript + Tailwind
- **Transkripsiya:** ElevenLabs Scribe (yoki Groq/OpenAI Whisper — fallback)
- **Imlo tuzatish:** mahalliy o'zbek lug'ati + Groq LLM (llama-3.3-70b)
- **Render:** FFmpeg + libass (ASS karaoke `\t` highlight), shriftlar `fonts/` papkasidan (`fontsdir`)

## Lokal ishga tushirish

```bash
npm install
# .env.local yarating va kalitlarni to'ldiring (pastdagi jadval)
npm run dev
```

## Muhit o'zgaruvchilari (env)

| Nomi | Majburiy | Izoh |
|------|----------|------|
| `ELEVENLABS_API_KEY` | tavsiya | Eng aniq transkripsiya (o'zbek). |
| `GROQ_API_KEY` | tavsiya | Whisper fallback + LLM imlo tuzatish. |
| `OPENAI_API_KEY` | ixtiyoriy | Whisper/LLM uchun muqobil. |
| `FFMPEG_PATH` | ixtiyoriy | Tizim ffmpeg yo'li (default: ffmpeg-static). |
| `DATA_DIR` | ixtiyoriy | Saqlash papkasi (default: `./data`). |
| `MAX_UPLOAD_BYTES` | ixtiyoriy | Maks. video hajmi (default 500MB). |
| `UZBEK_CORRECTION` | ixtiyoriy | `off` — LLM imlo tuzatishni o'chiradi. |

## Deploy (Railway)

Nixpacks orqali quriladi (`nixpacks.toml` — ffmpeg + fontconfig o'rnatadi).
Railway'da repo'ni ulang, env o'zgaruvchilarni qo'shing — tayyor.
