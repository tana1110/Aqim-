"use client";

import Link from "next/link";
import { useLang } from "@/components/LanguageProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Logo } from "@/components/Logo";

// Public, standalone privacy policy — required for the Google Play Store
// listing and for the account/notification features. Not part of the
// (app) shell (no nav/header) since it must be reachable by anyone,
// including Play Store reviewers, without opening the app first.
export default function PrivacyPage() {
  const { lang } = useLang();
  const updated = lang === "ar" ? "٢٧ يوليو ٢٠٢٦" : "July 27, 2026";

  return (
    <div className="min-h-dvh bg-background px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/home" className="flex items-center gap-2.5">
            <Logo variant={2} size={32} />
          </Link>
          <LanguageToggle />
        </div>

        {lang === "ar" ? (
          <ArabicPolicy updated={updated} />
        ) : (
          <EnglishPolicy updated={updated} />
        )}

        <p className="text-center text-xs text-muted pb-6">
          <Link href="/home" className="underline hover:text-foreground">
            {lang === "ar" ? "العودة إلى التطبيق" : "Back to the app"}
          </Link>
        </p>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-bold text-primary">{title}</h2>
      <div className="text-sm text-foreground leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  );
}

function ArabicPolicy({ updated }: { updated: string }) {
  return (
    <div className="card p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-xl font-bold mb-1">سياسة الخصوصية — أقِم</h1>
        <p className="text-xs text-muted">آخر تحديث: {updated}</p>
      </div>

      <p className="text-sm leading-relaxed">
        تطبيق «أقِم» يساعدك على اختيار آيات متنوعة من محفوظاتك لتقرأها في
        صلاتك، مع أدوات للورد اليومي، الأذكار، والمسبحة. هذه الصفحة توضح ما
        الذي نجمعه من بيانات، وكيف نستخدمه.
      </p>

      <Section title="١. البيانات التي نجمعها">
        <ul className="list-disc ps-5 space-y-1.5">
          <li>
            معرّف مجهول للجهاز يُحفظ في ملف تعريف ارتباط (cookie)، ليتذكر
            التطبيق محفوظاتك وتفضيلاتك على هذا الجهاز — دون أي اسم أو هوية.
          </li>
          <li>
            إن اخترت إنشاء حساب اختياري: بريدك الإلكتروني، اسمك (إن أدخلته)،
            وكلمة مرورك (تُحفظ مشفّرة ولا نراها أبدًا)، أو معرّف حساب Google
            إن استخدمت تسجيل الدخول عبره — لجعل سجلّك ومحفوظاتك متاحة من أي
            جهاز تسجّل الدخول منه.
          </li>
          <li>
            إحداثيات موقعك، فقط إن فعّلت ميزة تذكير مواقيت الصلاة — تُستخدم
            لحساب المواقيت على جهازك، وتُرسل لخادمنا فقط إن فعّلت الإشعارات،
            من أجل حساب وإرسال التذكير في وقته.
          </li>
          <li>
            بيانات اشتراك الإشعارات (Push) الفنية اللازمة لإرسال تذكيرات
            الصلاة والورد والأذكار إلى جهازك.
          </li>
          <li>
            محفوظاتك من القرآن، سجلّ تلاواتك، وإعداداتك (اللغة، طول المقطع
            المفضل، إلخ) — لتقديم اقتراحات متنوعة ومناسبة لك.
          </li>
        </ul>
      </Section>

      <Section title="٢. ما لا نفعله">
        <ul className="list-disc ps-5 space-y-1.5">
          <li>لا نعرض إعلانات، ولا نستخدم أدوات تتبع أو تحليلات تسويقية.</li>
          <li>لا نبيع بياناتك، ولا نشاركها مع أي طرف ثالث لأغراض تجارية.</li>
          <li>
            نص القرآن والتفسير والأذكار مأخوذة من مصادر موثوقة ومحفوظة على
            خوادمنا — لا يُنشئها أو يُعدّلها الذكاء الاصطناعي إطلاقًا.
          </li>
        </ul>
      </Section>

      <Section title="٣. خدمات خارجية">
        <p>
          يُحمَّل صوت التلاوة من شبكة توزيع صوتية عامة للقرآن الكريم
          (cdn.islamic.network) بحسب رقم الآية فقط، دون إرسال أي بيانات
          تعريفية عنك. إن استخدمت تسجيل الدخول عبر Google، يخضع ذلك لسياسة
          خصوصية Google.
        </p>
      </Section>

      <Section title="٤. حذف بياناتك">
        <p>
          يمكنك حذف حسابك وكل بياناتك المرتبطة به بمراسلتنا على البريد أدناه.
          إن كنت تستخدم التطبيق دون حساب، يكفي حذف بيانات التطبيق أو إلغاء
          تثبيته من جهازك لمسح كل شيء محليًا.
        </p>
      </Section>

      <Section title="٥. أمان البيانات">
        <p>
          تُنقل جميع البيانات عبر اتصال مشفّر (HTTPS)، وتُحفظ كلمات المرور
          بصيغة مشفّرة لا رجعة فيها (bcrypt).
        </p>
      </Section>

      <Section title="٦. الفئة العمرية">
        <p>
          «أقِم» تطبيق عام لا يستهدف تحديدًا الأطفال دون ١٣ عامًا، ولا يجمع
          بياناتٍ تعريفية عن هويتهم.
        </p>
      </Section>

      <Section title="٧. تواصل معنا">
        <p>
          لأي استفسار حول هذه السياسة أو لطلب حذف بياناتك، راسلنا على:{" "}
          <a
            href="mailto:aqimsalat@gmail.com"
            className="text-primary underline"
            dir="ltr"
          >
            aqimsalat@gmail.com
          </a>
        </p>
      </Section>
    </div>
  );
}

function EnglishPolicy({ updated }: { updated: string }) {
  return (
    <div className="card p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold mb-1">Privacy Policy — Aqim</h1>
        <p className="text-xs text-muted">Last updated: {updated}</p>
      </div>

      <p className="text-sm leading-relaxed">
        Aqim helps you recite varied passages from what you have memorized
        during prayer, with tools for a daily wird, adhkar, and a tasbih
        counter. This page explains what data we collect and how we use it.
      </p>

      <Section title="1. Data we collect">
        <ul className="list-disc ps-5 space-y-1.5">
          <li>
            An anonymous device identifier stored in a cookie, so the app
            remembers your memorization and preferences on this device — no
            name or identity attached.
          </li>
          <li>
            If you choose to create an optional account: your email, name
            (if you provide one), and password (stored hashed — we never see
            it), or your Google account identifier if you sign in with
            Google — so your history and memorization follow you across
            devices.
          </li>
          <li>
            Your location coordinates, only if you enable prayer-time
            reminders — used to compute prayer times on your device, and
            sent to our server only if notifications are enabled, so we can
            compute and deliver the reminder at the right time.
          </li>
          <li>
            The technical push-notification subscription details needed to
            deliver prayer, wird, and adhkar reminders to your device.
          </li>
          <li>
            Your Quran memorization, recitation history, and preferences
            (language, preferred passage length, etc.) — to provide varied,
            relevant suggestions.
          </li>
        </ul>
      </Section>

      <Section title="2. What we don't do">
        <ul className="list-disc ps-5 space-y-1.5">
          <li>We show no ads and use no marketing trackers or analytics.</li>
          <li>
            We never sell your data or share it with third parties for
            commercial purposes.
          </li>
          <li>
            Quran text, tafsir, and adhkar come from verified sources stored
            on our servers — never generated or altered by AI.
          </li>
        </ul>
      </Section>

      <Section title="3. Third-party services">
        <p>
          Recitation audio is streamed from a public Quran audio CDN
          (cdn.islamic.network) by ayah number only, with no identifying
          data sent. If you sign in with Google, that is governed by
          Google's own privacy policy.
        </p>
      </Section>

      <Section title="4. Deleting your data">
        <p>
          You can delete your account and all associated data by emailing us
          at the address below. If you use the app without an account,
          clearing the app's storage or uninstalling it removes everything
          stored locally.
        </p>
      </Section>

      <Section title="5. Data security">
        <p>
          All data is transmitted over an encrypted connection (HTTPS), and
          passwords are stored irreversibly hashed (bcrypt).
        </p>
      </Section>

      <Section title="6. Age">
        <p>
          Aqim is a general-audience app not specifically directed at
          children under 13, and does not knowingly collect identifying data
          from them.
        </p>
      </Section>

      <Section title="7. Contact us">
        <p>
          For any question about this policy, or to request deletion of
          your data, email us at:{" "}
          <a
            href="mailto:aqimsalat@gmail.com"
            className="text-primary underline"
          >
            aqimsalat@gmail.com
          </a>
        </p>
      </Section>
    </div>
  );
}
