import { Sparkles, Languages, Type, Wand2 } from "lucide-react";
import { cookies } from "next/headers";
import { UploadDropzone } from "@/components/upload-dropzone";
import { AuthFormWrapper } from "@/components/auth-form-wrapper";
import { HeaderActions } from "@/components/header-actions";
import { ACCESS_COOKIE, verifySubject, getViewerAccess } from "@/lib/access";

export default async function HomePage() {
  const store = await cookies();
  const existing = store.get(ACCESS_COOKIE)?.value;
  const sid = verifySubject(existing);
  const isLoggedIn = sid && sid.startsWith("email:");

  const access = isLoggedIn ? await getViewerAccess(existing) : null;

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Subtitr</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors hidden md:inline">
              Imkoniyatlar
            </a>
            <a href="#how" className="hover:text-foreground transition-colors hidden md:inline">
              Qanday ishlaydi
            </a>
            {isLoggedIn && access && (
              <HeaderActions
                email={access.email ?? ""}
                coins={access.coins}
                isPro={access.isPro}
              />
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-6 py-16 md:py-24">
        <div className="mb-10 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3 text-brand" />
          <span>O&apos;zbek tilidagi videolar uchun AI subtitr generator</span>
        </div>

        <h1 className="text-balance text-center text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
          Videoga subtitr bir bosishda
        </h1>
        <p className="mt-5 max-w-xl text-balance text-center text-base text-muted-foreground md:text-lg">
          Videoni yuklang — Subtitr o&apos;zbek tilidagi nutqni aniqlab, so&apos;z-so&apos;z
          animatsiyali subtitrlarni avtomatik yopishtirib beradi.
        </p>

        <div className="mt-12 w-full flex justify-center">
          {isLoggedIn ? (
            <UploadDropzone />
          ) : (
            <AuthFormWrapper />
          )}
        </div>

        <section
          id="features"
          className="mt-24 grid w-full grid-cols-1 gap-6 md:grid-cols-3"
        >
          <Feature
            icon={<Wand2 className="h-5 w-5" />}
            title="So‘z-so‘z highlight"
            description="TikTok va Reels uslubidagi karaoke-effekt: har bir so‘z chiqqanda yorqinlashadi."
          />
          <Feature
            icon={<Languages className="h-5 w-5" />}
            title="O‘zbek tili"
            description="Lotin va kirill yozuvi — Whisper-large modeli mahalliy nutqni tushunadi."
          />
          <Feature
            icon={<Type className="h-5 w-5" />}
            title="4 ta tayyor uslub"
            description="TikTok, MrBeast, Minimal va Neon preset’lari — bir bosishda almashtiring."
          />
        </section>

        <section id="how" className="mt-24 w-full">
          <h2 className="text-center text-2xl font-semibold tracking-tight md:text-3xl">
            Qanday ishlaydi
          </h2>
          <ol className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Step n={1} title="Yuklang" description="Video faylini tortib tashlang yoki bosib tanlang." />
            <Step
              n={2}
              title="Tahrirlang"
              description="Transkripsiyani ko‘ring, kerakli style preset’ini tanlang."
            />
            <Step
              n={3}
              title="Yuklab oling"
              description="Subtitr yopishtirilgan MP4 faylni bir bosishda yuklab oling."
            />
          </ol>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} Subtitr — AI subtitr generator</p>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  description,
}: {
  n: number;
  title: string;
  description: string;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
      <span className="text-3xl font-bold text-brand">{n}</span>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </li>
  );
}
