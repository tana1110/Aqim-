"use client";

import Link from "next/link";
import { useLang } from "@/components/LanguageProvider";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Logo } from "@/components/Logo";

// Public, standalone "delete account" page — required by Google Play's
// Data Safety / account-deletion policy. Not part of the (app) shell so it's
// reachable by anyone, including Play Store reviewers, without logging in.
// There's no in-app self-service delete yet, so this describes the manual
// email process; if a real in-app delete flow is built later, update this
// page to match it exactly rather than leaving the two out of sync.
const SUPPORT_EMAIL = "aqimsalat@gmail.com";

export default function DeleteAccountPage() {
  const { lang } = useLang();

  return (
    <div className="min-h-dvh bg-background px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/home" className="flex items-center gap-2.5">
            <Logo variant={2} size={32} />
          </Link>
          <LanguageToggle />
        </div>

        {lang === "ar" ? <ArabicVersion /> : <EnglishVersion />}

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

function ArabicVersion() {
  return (
    <div className="space-y-6" dir="rtl" lang="ar">
      <div>
        <h1 className="text-xl font-bold">حذف الحساب — أقِم (Aqim Al-Salah)</h1>
        <p className="text-sm text-muted mt-1">
          هذه الصفحة تشرح كيف تطلب حذف حسابك وبياناتك من تطبيق «أقِم».
        </p>
      </div>

      <Section title="١. كيف تطلب الحذف">
        <p>
          لا يوجد حاليًا زر حذف داخل التطبيق، فالحذف يتم عبر طلب يدوي بسيط:
        </p>
        <ol className="list-decimal list-inside space-y-1.5">
          <li>
            أرسل بريدًا إلكترونيًا إلى{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("طلب حذف الحساب")}`}
              className="text-primary underline"
              dir="ltr"
            >
              {SUPPORT_EMAIL}
            </a>
          </li>
          <li>
            اكتب في الرسالة: <strong>«طلب حذف حساب»</strong> والبريد الإلكتروني
            المسجَّل به حسابك في التطبيق.
          </li>
          <li>
            سنؤكد الطلب ونحذف الحساب وكل بياناته خلال <strong>٣٠ يومًا</strong>{" "}
            كحد أقصى من استلام الطلب.
          </li>
        </ol>
      </Section>

      <Section title="٢. ما الذي يُحذف">
        <p>عند حذف الحساب، تُحذف نهائيًا كل البيانات المرتبطة به، وتشمل:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>البريد الإلكتروني وكلمة المرور (المُشفّرة)</li>
          <li>الاسم المسجَّل</li>
          <li>سجلّ ما حفظته من القرآن (المحفوظات)</li>
          <li>سجلّ التلاوة والمراجعة</li>
          <li>سلسلة الإنجاز اليومية (Streak)</li>
          <li>إعدادات التذكير بأوقات الصلاة والموقع الجغرافي المحفوظ لها</li>
          <li>اشتراك الإشعارات (Push) وجلسات الدخول النشطة</li>
        </ul>
      </Section>

      <Section title="٣. ما الذي يُحتفظ به">
        <p>
          لا نحتفظ بأي بيانات شخصية بعد الحذف. الاستثناء الوحيد هو نسخ
          احتياطية آلية روتينية لقاعدة البيانات، تُستبدل تلقائيًا ويُصفّى ما
          فيها من بيانات قديمة خلال ٣٠ يومًا من الحذف — دون أي استخدام لها في
          هذه الفترة.
        </p>
        <p className="text-xs text-muted">
          ملاحظة: إذا كنت تستخدم التطبيق دون إنشاء حساب (بيانات الجهاز فقط)،
          فلا يوجد حساب على خوادمنا لحذفه — يكفي حذف التطبيق من جهازك لمسح
          بياناتك المحلية بالكامل.
        </p>
      </Section>
    </div>
  );
}

function EnglishVersion() {
  return (
    <div className="space-y-6" dir="ltr" lang="en">
      <div>
        <h1 className="text-xl font-bold">Delete Account — Aqim (أقِم)</h1>
        <p className="text-sm text-muted mt-1">
          This page explains how to request deletion of your account and data
          from the Aqim app.
        </p>
      </div>

      <Section title="1. How to request deletion">
        <p>
          There's no in-app delete button yet, so deletion is handled through
          a simple manual request:
        </p>
        <ol className="list-decimal list-inside space-y-1.5">
          <li>
            Email{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Account deletion request")}`}
              className="text-primary underline"
            >
              {SUPPORT_EMAIL}
            </a>
          </li>
          <li>
            Include <strong>"Account deletion request"</strong> and the email
            address registered on your Aqim account.
          </li>
          <li>
            We'll confirm the request and delete your account and all its
            data within <strong>30 days</strong> of receiving it.
          </li>
        </ol>
      </Section>

      <Section title="2. What gets deleted">
        <p>
          Deleting your account permanently removes everything tied to it,
          including:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Email address and password (hashed)</li>
          <li>Registered name</li>
          <li>Your memorization record</li>
          <li>Recitation and review history</li>
          <li>Daily streak data</li>
          <li>Prayer-time reminder settings and any saved location</li>
          <li>Push-notification subscription and active login sessions</li>
        </ul>
      </Section>

      <Section title="3. What's retained">
        <p>
          We don't retain any personal data after deletion. The only
          exception is routine automated database backups, which are rotated
          and fully purged of old data within 30 days of deletion — they are
          not accessed or used during that window.
        </p>
        <p className="text-xs text-muted">
          Note: if you use the app without creating an account (device-only
          data), there's no account on our servers to delete — uninstalling
          the app fully clears your local data.
        </p>
      </Section>
    </div>
  );
}
