import Link from "next/link";
import { Logo, type LogoVariant } from "@/components/Logo";

const VARIANTS: {
  variant: LogoVariant;
  title: string;
  desc: string;
}[] = [
  {
    variant: 1,
    title: "١ · مستقيم تقريباً",
    desc: "Barely bent — most legible. A calm accent dot crowns the alef.",
  },
  {
    variant: 2,
    title: "٢ · انحناءة لطيفة",
    desc: "A gentle forward bow — the word leans as if beginning to prostrate.",
  },
  {
    variant: 3,
    title: "٣ · ركوع أوضح",
    desc: "Classical Amiri letters over a subtle arched ‘back’ stroke.",
  },
  {
    variant: 4,
    title: "٤ · الأكثر تجريداً",
    desc: "Most stylised: arced posture, grounded, head to the floor.",
  },
];

// Sizes to compare each mark at.
const SIZES = [
  { h: 120, label: "شاشة البداية · splash" },
  { h: 44, label: "الترويسة · header" },
  { h: 32, label: "أيقونة · favicon" },
];

function Panels({ variant }: { variant: LogoVariant }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Ivory (app background) */}
      <Backdrop label="ivory · الخلفية" tone="ivory">
        {SIZES.map((s) => (
          <Cell key={s.h} label={s.label}>
            <Logo variant={variant} size={s.h} />
          </Cell>
        ))}
      </Backdrop>
      {/* Plain white */}
      <Backdrop label="white · أبيض" tone="white">
        {SIZES.map((s) => (
          <Cell key={s.h} label={s.label}>
            <Logo variant={variant} size={s.h} />
          </Cell>
        ))}
      </Backdrop>
    </div>
  );
}

function Backdrop({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "ivory" | "white";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border border-border overflow-hidden ${
        tone === "white" ? "bg-white" : "bg-background"
      }`}
    >
      <div className="text-[10px] text-muted px-3 pt-2 pb-1 uppercase tracking-wide">
        {label}
      </div>
      <div className="flex flex-col items-center gap-4 px-3 pb-5 pt-2">
        {children}
      </div>
    </div>
  );
}

function Cell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="min-h-[120px] grid place-items-center">{children}</div>
      <span className="text-[10px] text-muted">{label}</span>
    </div>
  );
}

export default function LogoPreview() {
  return (
    <div className="min-h-dvh mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">معاينة الشعار</h1>
          <Link href="/" className="text-sm text-primary hover:opacity-80">
            ← العودة
          </Link>
        </div>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          أربع نسخ من الكلمة «أقم» توحي بالسجود بدرجات متفاوتة، معروضة على خلفية
          العاج وأخرى بيضاء، وبأحجام مختلفة. النصّ من الخطّ نفسه ليبقى مقروءاً؛
          الإيحاء بالسجود عبر الميل والانحناءة ونقطة «الرأس». اختر اتجاهاً وسنُتمّه
          ونحوّله إلى مسارات نهائية.
        </p>
      </header>

      <div className="space-y-5">
        {VARIANTS.map((v) => (
          <section key={String(v.variant)} className="card p-4">
            <div className="mb-3">
              <h2 className="text-lg font-bold">{v.title}</h2>
              <p className="text-xs text-muted mt-0.5" dir="ltr">
                {v.desc}
              </p>
            </div>
            <Panels variant={v.variant} />
          </section>
        ))}

        {/* Icon / favicon mark */}
        <section className="card p-4">
          <div className="mb-3">
            <h2 className="text-lg font-bold">أيقونة مبسّطة · icon mark</h2>
            <p className="text-xs text-muted mt-0.5" dir="ltr">
              Abstract sujood mark for favicon / app-icon scale.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Backdrop label="ivory · الخلفية" tone="ivory">
              <div className="flex items-end gap-6">
                <Logo variant="icon" size={64} />
                <Logo variant="icon" size={32} />
                <Logo variant="icon" size={16} />
              </div>
            </Backdrop>
            <Backdrop label="white · أبيض" tone="white">
              <div className="flex items-end gap-6">
                <Logo variant="icon" size={64} />
                <Logo variant="icon" size={32} />
                <Logo variant="icon" size={16} />
              </div>
            </Backdrop>
          </div>
        </section>
      </div>

      <p className="text-xs text-muted mt-8 text-center">
        لم يتم اعتماد نسخة نهائية بعد — بانتظار اختيارك.
      </p>
    </div>
  );
}
