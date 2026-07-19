import type { ComponentType } from "react";
import Link from "next/link";
import { ArrowLeft, Repeat, ShieldCheck, Lock, BookOpenText } from "lucide-react";
import { Logo } from "@/components/Logo";
import { MosqueIcon, NafilahIcon, QiyamIcon } from "@/components/ModeIcons";
import { prisma } from "@/lib/prisma";

// The slogan verse — Al-Isra (17:78), which commands establishing the prayer.
// Text is read from the verified, locally-seeded source, never hand-typed.
async function getSloganAyah() {
  try {
    return await prisma.quranText.findUnique({
      where: { surahNumber_ayahNumber: { surahNumber: 17, ayahNumber: 78 } },
    });
  } catch {
    return null;
  }
}

export default async function Landing() {
  const ayah = await getSloganAyah();

  return (
    <div className="min-h-dvh overflow-x-hidden">
      {/* Top bar */}
      <header className="mx-auto max-w-6xl px-5 md:px-8 pt-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo variant={2} size={36} />
          <span className="text-[11px] tracking-widest text-muted mt-1">
            AQIM
          </span>
        </Link>
        <Link
          href="/home"
          className="text-sm font-bold text-primary hover:opacity-80"
        >
          افتح التطبيق
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 md:px-8 pt-10 md:pt-14 pb-12 text-center">
        {/* Brand */}
        <Logo variant={2} size={64} className="mx-auto mb-8" />

        {/* The ayah — refined, muted; the source/credibility anchor for the name */}
        {ayah && (
          <p className="font-quran text-lg md:text-xl text-muted leading-[2.1] max-w-2xl mx-auto mb-7">
            {ayah.arabicText}
          </p>
        )}

        {/* The slogan — the emotional hook */}
        <h1 className="font-heading text-4xl md:text-5xl font-bold text-primary leading-[1.3]">
          اقرأ بخشوع، لا بعادة
        </h1>

        {/* Description */}
        <p className="text-[15px] md:text-lg text-muted leading-relaxed mt-5 mx-auto max-w-xl">
          «أقم» يقترح عليك آيات من محفوظاتك لكل صلاة، بنص موثّق ومعنى مبسّط تحتها،
          ولا يكرر نفس السورة في كل مرة.
        </p>

        <Link
          href="/home"
          className="btn-primary inline-flex items-center gap-2 px-8 py-4 text-lg mt-8"
        >
          ابدأ الآن
          <ArrowLeft size={20} />
        </Link>
      </section>

      {/* Problem → solution */}
      <section className="mx-auto max-w-6xl px-5 md:px-8 py-8 md:py-12">
        <h2 className="text-xl md:text-2xl font-bold mb-6 text-center">
          لماذا «أقِم»؟
        </h2>
        <div className="grid gap-3 md:grid-cols-3 md:items-stretch">
          <Feature
            Icon={Lock}
            title="الثوابت ما بتتغير"
            body="سنة الفجر وبعد المغرب دايماً الكافرون والإخلاص في مكانها الصح — ما بتتبدل ولا بتتخلط."
          />
          <Feature
            Icon={ShieldCheck}
            title="نص موثوق، صفر توليد آلي"
            body="كل آية جايه من نص عثماني موثّق ومخزّن مسبقاً — التطبيق ما بيولّد أو يخمّن أي نص قرآني."
          />
          <Feature
            Icon={Repeat}
            title="ما بتقرا نفس السورة كل مرة"
            body="يتابع شنو قريت قبل كدة ويقترح ليك حاجة مختلفة من محفوظاتك، بدل التكرار اللاواعي."
          />
        </div>
      </section>

      {/* Modes */}
      <section className="mx-auto max-w-2xl px-5 py-6">
        <h2 className="text-lg md:text-xl font-bold mb-4 text-center">
          يشمل كل صلواتك
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          <ModeChip Icon={MosqueIcon} label="الفرائض" hint="المكتوبة" />
          <ModeChip Icon={NafilahIcon} label="النوافل" hint="السنن والرواتب" />
          <ModeChip Icon={QiyamIcon} label="قيام الليل" hint="آيات أطول" />
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 md:px-8 py-8 md:py-12">
        <h2 className="text-xl md:text-2xl font-bold mb-6 text-center">
          كيف يعمل؟
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          <Step n={1} title="حدّد محفوظاتك" body="بالسور أو بالأجزاء، بضغطة." />
          <Step n={2} title="اختر الصلاة والنوع" body="فرض، نفل، أو قيام." />
          <Step
            n={3}
            title="اضغط «أقِم»"
            body="يظهر لك المقترح بنصّه وتفسيره، مع «استخدمت هذه» و«اقترح غيرها»."
          />
        </div>
      </section>

      {/* Trust strip */}
      <section className="mx-auto max-w-4xl px-5 md:px-8 py-6">
        <div className="card p-5 md:p-6 flex items-center gap-4 bg-accent-soft/60 border-accent/25">
          <BookOpenText size={26} className="text-accent shrink-0" />
          <p className="text-xs text-foreground/80 leading-relaxed">
            النصوص من مشروع <b>تنزيل</b> عبر al-Quran Cloud، والتفسير من{" "}
            <b>تفسير الميسّر</b> (مجمع الملك فهد). محقّقة ومُخزّنة محلياً — لا
            تُولّد ولا تُعدّل.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-5 md:px-8 pt-4 pb-16 text-center">
        <div className="card overflow-hidden">
          <div className="p-8 md:p-12 bg-primary-soft">
            <div>
              <h2 className="font-heading text-2xl md:text-3xl text-foreground mb-3">
                جرّب أقم في صلاتك القادمة
              </h2>
              <p className="text-sm md:text-base text-muted leading-relaxed max-w-md mx-auto">
                ما محتاجة وقت طويل — اختاري صلاتك، وخلي «أقم» يفتح ليك آية تقراها
                بخشوع.
              </p>
              <Link
                href="/home"
                className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 mt-6"
              >
                ابدأ الآن
                <ArrowLeft size={18} />
              </Link>
            </div>
          </div>
        </div>
        <p className="text-[11px] text-muted mt-6 leading-relaxed">
          الخيارات الفقهية تعكس ما هو شائع — يُرجى مراجعة أهل العلم.
        </p>
      </section>
    </div>
  );
}

function Feature({
  Icon,
  title,
  body,
}: {
  Icon: typeof Repeat;
  title: string;
  body: string;
}) {
  return (
    <div className="card p-4 flex gap-4">
      <div className="w-11 h-11 rounded-xl bg-primary-soft grid place-items-center shrink-0">
        <Icon size={20} className="text-primary" />
      </div>
      <div>
        <h3 className="font-bold text-[15px] mb-0.5">{title}</h3>
        <p className="text-sm text-muted leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function ModeChip({
  Icon,
  label,
  hint,
}: {
  Icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  hint: string;
}) {
  return (
    <div className="card p-4 flex flex-col items-center gap-2 text-center">
      <Icon size={28} className="text-primary" />
      <span className="text-sm font-bold">{label}</span>
      <span className="text-[10px] text-muted">{hint}</span>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-9 h-9 rounded-lg btn-primary grid place-items-center text-base shrink-0">
        {n}
      </div>
      <div className="pt-1">
        <h3 className="font-bold text-[15px]">{title}</h3>
        <p className="text-sm text-muted leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
