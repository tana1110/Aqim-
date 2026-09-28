import Link from "next/link";
import { Logo } from "@/components/Logo";

// Public, standalone privacy policy — linked from the Google Play listing and
// the Google OAuth consent screen. Both languages are always rendered in the
// HTML (English first): reviewers' crawlers don't run the app's client-side
// language switch, so a policy that only appeared after hydration read to
// them as missing.
export const metadata = {
  title: "Privacy Policy — Aqim / سياسة الخصوصية — أقِم",
};

const UPDATED_EN = "September 28, 2026";
const UPDATED_AR = "٢٨ سبتمبر ٢٠٢٦";
const CONTACT = "aqimsalat@gmail.com";

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-background px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/home" className="inline-flex items-center gap-2.5">
          <Logo variant={2} size={32} />
        </Link>

        <EnglishPolicy />
        <ArabicPolicy />

        <p className="text-center text-xs text-muted pb-6">
          <Link href="/home" className="underline hover:text-foreground">
            Back to the app · العودة إلى التطبيق
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

function Mail() {
  return (
    <a href={`mailto:${CONTACT}`} className="text-primary underline" dir="ltr">
      {CONTACT}
    </a>
  );
}

function EnglishPolicy() {
  return (
    <article className="card p-6 space-y-6" dir="ltr" lang="en">
      <div>
        <h1 className="text-xl font-bold mb-1">Privacy Policy — Aqim</h1>
        <p className="text-xs text-muted">Last updated: {UPDATED_EN}</p>
      </div>

      <p className="text-sm leading-relaxed">
        Aqim (أقِم, available at aqimalsalat.app and as an Android app) helps
        Muslims vary the Quran passages they recite in prayer, drawn from what
        they have memorized, alongside a daily wird, adhkar and a tasbih
        counter. This policy explains what information Aqim collects, how it
        is used, where it is stored, and how you can delete it. Aqim is free,
        shows no ads and is run by an individual developer, reachable at{" "}
        <Mail />.
      </p>

      <Section title="1. Information we collect">
        <ul className="list-disc ps-5 space-y-1.5">
          <li>
            <strong>Anonymous device identifier.</strong> A random ID stored in
            a cookie so the app can keep your memorization and settings on this
            device. It contains no name or personal details.
          </li>
          <li>
            <strong>Optional account.</strong> If you create an account: your
            email address, the name you enter (optional), and your password,
            which is stored only as a one-way bcrypt hash — we can never see
            it.
          </li>
          <li>
            <strong>Google Sign-In (optional).</strong> See section 3 for
            exactly what Aqim receives from Google and how it is used.
          </li>
          <li>
            <strong>Your app content.</strong> The surahs and ayahs you mark as
            memorized, your recitation history, daily reading streak, wird and
            adhkar progress, and preferences (language, passage length, theme).
          </li>
          <li>
            <strong>Location (optional).</strong> Only if you turn on prayer
            times: approximate coordinates, used to calculate prayer times. In
            the Android app, reminders are calculated and scheduled on your
            device. On the website, if you enable push notifications, the
            coordinates are stored with your notification subscription so the
            server can send the reminder at the right time.
          </li>
          <li>
            <strong>Notification subscription (optional).</strong> The
            technical push-subscription details your browser creates, needed
            to deliver reminders.
          </li>
          <li>
            <strong>Basic technical logs.</strong> Like any website, our
            hosting provider records standard request logs (such as IP
            address, device type and the page requested) to keep the service
            running and secure. They are kept for a short period and are not
            used to identify or profile you.
          </li>
        </ul>
      </Section>

      <Section title="2. How we use it">
        <p>
          Only to provide Aqim&apos;s features: suggesting varied passages from
          what you have memorized, keeping your streak and progress, syncing
          your data across devices when you sign in, sending the reminders you
          turned on, and letting you reset your password. We do not use your
          data for advertising, profiling, or training AI models.
        </p>
      </Section>

      <Section title="3. Google user data">
        <p>
          If you choose &ldquo;Continue with Google&rdquo;, Aqim receives from
          Google only your <strong>name</strong>, <strong>email address</strong>{" "}
          and your <strong>Google account ID</strong> (via the basic
          <em> openid, email and profile</em> scopes). Aqim does not request
          access to your contacts, Drive, Gmail, calendar or any other Google
          data.
        </p>
        <ul className="list-disc ps-5 space-y-1.5">
          <li>
            <strong>Use:</strong> solely to create your Aqim account and sign
            you in, and to link it to an existing Aqim account with the same
            verified email.
          </li>
          <li>
            <strong>Sharing:</strong> never sold, rented or shared with anyone,
            and never used for advertising or to train AI models.
          </li>
          <li>
            <strong>Storage and retention:</strong> kept in our database (see
            section 5) for as long as your account exists, and deleted when you
            delete your account.
          </li>
          <li>
            <strong>Revoking access:</strong> you can remove Aqim at any time
            from your Google Account → Security → Third-party connections.
          </li>
        </ul>
        <p>
          Aqim&apos;s use and transfer of information received from Google APIs
          adheres to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            className="text-primary underline"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
      </Section>

      <Section title="4. What we never do">
        <ul className="list-disc ps-5 space-y-1.5">
          <li>No ads, no marketing trackers, no third-party analytics.</li>
          <li>We never sell your data or share it for commercial purposes.</li>
          <li>
            Quran text, tafsir, adhkar and hadith come from verified sources
            and are never generated or altered by AI.
          </li>
        </ul>
      </Section>

      <Section title="5. Where data is stored and who processes it">
        <ul className="list-disc ps-5 space-y-1.5">
          <li>
            <strong>Cloudflare</strong> hosts the app and its database (in
            Western Europe) and routes email sent to @aqimalsalat.app.
          </li>
          <li>
            <strong>Resend</strong> sends password-reset emails (your email
            address only).
          </li>
          <li>
            <strong>Google</strong> provides sign-in, if you choose to use it.
          </li>
          <li>
            Recitation audio streams from a public Quran audio service
            (cdn.islamic.network) using only the ayah number — no personal data
            is sent.
          </li>
        </ul>
        <p>
          All data travels over encrypted connections (HTTPS). These providers
          process data only to run their part of the service.
        </p>
      </Section>

      <Section title="6. Retention and deletion">
        <p>
          Your data is kept while you use Aqim. You can delete your account and
          all data linked to it at any time from the{" "}
          <Link href="/delete-account" className="text-primary underline">
            delete account
          </Link>{" "}
          page, or by emailing <Mail />; we complete deletion requests within
          30 days. If you use Aqim without an account, clearing the app&apos;s
          data or uninstalling it removes what is stored on your device.
        </p>
      </Section>

      <Section title="7. Children">
        <p>
          Aqim is a general-audience app, not directed at children under 13,
          and does not knowingly collect personal information from them.
        </p>
      </Section>

      <Section title="8. Changes">
        <p>
          If this policy changes, the updated version will be posted on this
          page with a new &ldquo;Last updated&rdquo; date.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>
          Questions or requests about your data: <Mail />
        </p>
      </Section>
    </article>
  );
}

function ArabicPolicy() {
  return (
    <article className="card p-6 space-y-6" dir="rtl" lang="ar">
      <div>
        <h1 className="text-xl font-bold mb-1">سياسة الخصوصية — أقِم</h1>
        <p className="text-xs text-muted">آخر تحديث: {UPDATED_AR}</p>
      </div>

      <p className="text-sm leading-relaxed">
        «أقِم» (على aqimalsalat.app وتطبيق أندرويد) يساعدك على تنويع ما تقرؤه
        في صلاتك من محفوظاتك، مع الورد اليومي والأذكار والمسبحة. توضح هذه
        الصفحة ما نجمعه من بيانات، وكيف نستخدمه، وأين يُحفظ، وكيف تحذفه.
        التطبيق مجاني وبلا إعلانات، ويمكن التواصل معنا على <Mail />.
      </p>

      <Section title="١. البيانات التي نجمعها">
        <ul className="list-disc ps-5 space-y-1.5">
          <li>
            <strong>معرّف مجهول للجهاز</strong> في ملف تعريف ارتباط (cookie)،
            ليتذكر التطبيق محفوظاتك وإعداداتك — دون اسم أو هوية.
          </li>
          <li>
            <strong>حساب اختياري:</strong> بريدك الإلكتروني، واسمك إن أدخلته،
            وكلمة المرور محفوظة مشفّرة تشفيرًا لا رجعة فيه (bcrypt) — لا نراها
            أبدًا.
          </li>
          <li>
            <strong>تسجيل الدخول عبر Google (اختياري):</strong> انظر البند ٣.
          </li>
          <li>
            <strong>محتواك في التطبيق:</strong> محفوظاتك، وسجل تلاواتك، وسلسلة
            أيامك، وتقدّم الورد والأذكار، وتفضيلاتك.
          </li>
          <li>
            <strong>الموقع (اختياري):</strong> فقط إن فعّلت مواقيت الصلاة،
            لحسابها. في تطبيق أندرويد تُحسب التذكيرات وتُجدول على جهازك. وفي
            الموقع، إن فعّلت الإشعارات، تُحفظ الإحداثيات مع اشتراك الإشعارات
            لإرسال التذكير في وقته.
          </li>
          <li>
            <strong>اشتراك الإشعارات (اختياري):</strong> البيانات الفنية
            اللازمة لإيصال التذكيرات.
          </li>
          <li>
            <strong>سجلات تقنية أساسية</strong> يحفظها مزوّد الاستضافة لفترة
            قصيرة لتشغيل الخدمة وحمايتها، ولا تُستخدم لتعريفك.
          </li>
        </ul>
      </Section>

      <Section title="٢. كيف نستخدمها">
        <p>
          فقط لتقديم ميزات «أقِم»: اقتراح الآيات، وحفظ السلسلة والتقدّم، ومزامنة
          بياناتك بين أجهزتك، وإرسال التذكيرات التي فعّلتها، واستعادة كلمة
          المرور. لا نستخدمها للإعلانات أو التنميط أو تدريب الذكاء الاصطناعي.
        </p>
      </Section>

      <Section title="٣. بيانات Google">
        <p>
          إن اخترت «المتابعة بحساب Google» يستلم «أقِم» من Google فقط:
          <strong> اسمك</strong> و<strong>بريدك الإلكتروني</strong> و
          <strong>معرّف حسابك</strong> — ولا يطلب الوصول إلى جهات اتصالك أو
          Drive أو Gmail أو أي بيانات أخرى.
        </p>
        <ul className="list-disc ps-5 space-y-1.5">
          <li>تُستخدم فقط لإنشاء حسابك وتسجيل دخولك.</li>
          <li>
            لا تُباع ولا تُشارك مع أحد، ولا تُستخدم للإعلانات أو لتدريب الذكاء
            الاصطناعي.
          </li>
          <li>تبقى ما دام حسابك موجودًا، وتُحذف عند حذفه.</li>
          <li>
            يمكنك إلغاء وصول «أقِم» في أي وقت من حساب Google ← الأمان ← اتصالات
            الجهات الخارجية.
          </li>
        </ul>
        <p>
          يلتزم «أقِم» في استخدام المعلومات الواردة من واجهات Google ونقلها
          بسياسة بيانات مستخدمي خدمات Google API، بما فيها متطلبات الاستخدام
          المحدود (Limited Use).
        </p>
      </Section>

      <Section title="٤. ما لا نفعله أبدًا">
        <ul className="list-disc ps-5 space-y-1.5">
          <li>لا إعلانات، ولا أدوات تتبع تسويقية، ولا تحليلات لطرف ثالث.</li>
          <li>لا نبيع بياناتك ولا نشاركها لأغراض تجارية.</li>
          <li>
            نصوص القرآن والتفسير والأذكار والحديث من مصادر موثوقة، ولا يُنشئها
            أو يعدّلها الذكاء الاصطناعي.
          </li>
        </ul>
      </Section>

      <Section title="٥. أين تُحفظ البيانات">
        <p>
          تستضيف <strong>Cloudflare</strong> التطبيق وقاعدة بياناته (في غرب
          أوروبا) وتوجّه البريد المرسل إلى النطاق، وترسل <strong>Resend</strong>{" "}
          رسائل استعادة كلمة المرور، وتوفّر <strong>Google</strong> تسجيل الدخول
          إن اخترته. يُحمَّل صوت التلاوة من cdn.islamic.network برقم الآية فقط.
          تُنقل كل البيانات عبر اتصال مشفّر (HTTPS).
        </p>
      </Section>

      <Section title="٦. الاحتفاظ والحذف">
        <p>
          تُحفظ بياناتك ما دمت تستخدم «أقِم»، ويمكنك حذف حسابك وكل بياناتك في
          أي وقت من صفحة{" "}
          <Link href="/delete-account" className="text-primary underline">
            حذف الحساب
          </Link>{" "}
          أو بمراسلتنا على <Mail />، وننفّذ طلبات الحذف خلال ٣٠ يومًا. وإن
          استخدمت التطبيق دون حساب، فحذف بيانات التطبيق أو إلغاء تثبيته يمسح ما
          على جهازك.
        </p>
      </Section>

      <Section title="٧. الأطفال">
        <p>
          «أقِم» تطبيق عام لا يستهدف الأطفال دون ١٣ عامًا، ولا يجمع بياناتهم عن
          قصد.
        </p>
      </Section>

      <Section title="٨. التغييرات">
        <p>أي تحديث لهذه السياسة يُنشر هنا مع تاريخ «آخر تحديث» جديد.</p>
      </Section>

      <Section title="٩. تواصل معنا">
        <p>
          لأي استفسار أو طلب يخص بياناتك: <Mail />
        </p>
      </Section>
    </article>
  );
}
