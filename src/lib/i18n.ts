// Bilingual UI strings (Arabic / English). The Quran verse text itself is never
// translated for recitation — only the interface and the verse *meaning*.

export type Lang = "ar" | "en";

export const LANGS: Lang[] = ["ar", "en"];
export const dirOf = (lang: Lang) => (lang === "ar" ? "rtl" : "ltr");

type Dict = Record<string, string>;

const ar: Dict = {
  // nav / shell
  "nav.home": "الرئيسية",
  "nav.setup": "محفوظاتي",
  "nav.history": "السجل",
  "nav.settings": "الإعدادات",
  "nav.about": "عن التطبيق",
  "nav.openApp": "افتح التطبيق",

  // generic
  "common.loading": "جارٍ التحميل…",
  "common.save": "حفظ",
  "common.saved": "حُفظت",
  "common.source": "المصدر",
  "common.startNow": "ابدأ الآن",

  // db not ready
  "db.notReady.title": "قاعدة البيانات غير مهيأة",
  "db.notReady.body": "شغّل الإعداد لمرة واحدة:",

  // home
  "home.greeting": "السلام عليكم",
  "home.title": "ماذا ستقرأ في صلاتك؟",
  "home.subtitle": "اختر الصلاة، ثم دع «أقِم» يقترح لك بتنوّع.",
  "home.setMemoFirst": "حدّد محفوظاتك أولاً لتبدأ الاقتراحات",
  "home.tapHere": "← اضغط هنا",
  "home.type": "النوع",
  "home.prayer": "الصلاة",
  "home.rakahs": "عدد الركعات",
  "home.error": "تعذّر جلب الاقتراح. تأكد من تشغيل قاعدة البيانات.",
  "home.emptyState": "اختر الصلاة واضغط «أقِم» ليظهر الاقتراح هنا.",
  "home.dailyAyah": "آية اليوم",
  "home.thisWeek": "هذا الأسبوع",
  "home.recitations": "تلاوة",
  "home.passages": "مقطع مختلف",
  "home.surahs": "سورة مختلفة",
  "home.fatihaOnly": "الفاتحة فقط",
  "home.noSuggestion": "لا يوجد اقتراح متاح.",
  "home.usedThis": "استخدمت هذه",
  "home.logged": "سُجّلت",
  "home.suggestAnother": "اقترح غيرها",
  "home.relaxed": "محفوظاتك محدودة، لذا سُمح بتكرار بعض المقاطع لتغطية كل الركعات.",
  "home.exhausted": "لا توجد مقاطع كافية — أضف المزيد إلى محفوظاتك.",

  // modes
  "mode.faraid": "الفرائض",
  "mode.faraid.hint": "المكتوبة",
  "mode.nafl": "النوافل",
  "mode.nafl.hint": "السنن",
  "mode.qiyam": "قيام الليل",
  "mode.qiyam.hint": "آيات أطول",

  // prayers
  "prayer.fajr": "الفجر",
  "prayer.dhuhr": "الظهر",
  "prayer.asr": "العصر",
  "prayer.maghrib": "المغرب",
  "prayer.isha": "العشاء",
  "prayer.fajr-sunnah": "سنة الفجر",
  "prayer.dhuhr-nafl": "سنن الظهر",
  "prayer.maghrib-sunnah": "سنة المغرب",
  "prayer.isha-shaf": "الشفع",
  "prayer.witr": "الوتر",
  "prayer.free": "نافلة حرة",
  "prayer.qiyam": "قيام",

  // rak'ah
  "rakah.1": "الركعة الأولى",
  "rakah.2": "الركعة الثانية",
  "rakah.3": "الركعة الثالثة",
  "rakah.4": "الركعة الرابعة",
  "rakah.n": "الركعة {n}",

  // passage card
  "passage.surah": "سورة",
  "passage.fixed": "ثابتة",
  "passage.ayah": "آية",
  "passage.meaningSimple": "المعنى المبسّط",
  "passage.translation": "الترجمة",
  "passage.more": "المزيد",
  "passage.less": "أقل",

  // setup
  "setup.title": "ماذا تحفظ؟",
  "setup.subtitle": "اختر بالسور أو بالأجزاء — سنقترح من محفوظاتك فقط.",
  "setup.bySurah": "بالسور",
  "setup.byJuz": "بالأجزاء",
  "setup.ayahs": "آية",
  "setup.juz": "جزء",
  "setup.selected": "{n} محدّد",
  "setup.noneSelected": "لم تختر بعد",
  "setup.notSeeded": "قاعدة البيانات غير مهيأة بعد.",

  // settings
  "settings.title": "الإعدادات",
  "settings.language": "اللغة",
  "settings.witr": "عدد ركعات الوتر",
  "settings.witr.hint": "الركعة الأخيرة تبقى بالإخلاص.",
  "settings.noRepeat": "نافذة عدم التكرار",
  "settings.noRepeat.hint": "لا يتكرر المقطع ضمن آخر N مقاطع.",
  "settings.qiyamWindow": "نافذة قيام الليل",
  "settings.qiyamWindow.hint": "نافذة أوسع للجلسات الليلية.",
  "settings.shortSurah": "حدّ السورة القصيرة (آيات)",
  "settings.shortSurah.hint": "لاختيار الفرائض من مقاطع أقصر.",
  "settings.tafsirSource": "مصدر التفسير",
  "settings.tafsirSource.value": "تفسير الميسّر — مجمع الملك فهد",
  "settings.fiqhNote":
    "الخيارات الفقهية (مثل عدد ركعات الوتر) قابلة للضبط وتعكس ما هو شائع — يُرجى مراجعة أهل العلم للتأكد مما يناسبك.",
  "settings.saveSettings": "حفظ الإعدادات",
  "settings.settingsSaved": "حُفظت الإعدادات",

  // history
  "history.title": "سجلّك",
  "history.subtitle": "تابع تنوّعك في القراءة هذا الأسبوع.",
  "history.week": "تلاوات الأسبوع",
  "history.distinctPassages": "مقاطع مختلفة",
  "history.distinctSurahs": "سور مختلفة",
  "history.mostRepeated": "الأكثر تكراراً",
  "history.recent": "آخر ما استُخدم",
  "history.empty": "لا يوجد سجل بعد — ابدأ بالقراءة.",

  // welcome (first-run onboarding)
  "welcome.title": "أهلاً بك في أقِم",
  "welcome.intro": "رفيقك لتقرأ في صلاتك بخشوع، لا بعادة.",
  "welcome.s2.title": "حدّد ما تحفظه",
  "welcome.s2.body": "اختر السور أو الأجزاء التي تحفظها — مرة واحدة فقط.",
  "welcome.s3.title": "اضغط «أقِم» قبل كل صلاة",
  "welcome.s3.body": "يقترح لك آيات من محفوظاتك، بمعناها، دون تكرار السورة نفسها كل مرة.",
  "welcome.next": "التالي",
  "welcome.start": "لنبدأ — حدّد محفوظاتك",
  "welcome.skip": "تخطّي",

  // landing
  "landing.slogan": "اقرأ بخشوع، لا بعادة",
  "landing.description":
    "«أقم» يقترح عليك آيات من محفوظاتك لكل صلاة، بنص موثّق ومعنى مبسّط تحتها، ولا يكرر نفس السورة في كل مرة.",
  "landing.why": "لماذا «أقم»؟",
  "landing.why1.title": "الثوابت ما بتتغير",
  "landing.why1.body":
    "سنة الفجر وبعد المغرب دايماً الكافرون والإخلاص في مكانها الصح — ما بتتبدل ولا بتتخلط.",
  "landing.why2.title": "نص موثوق، صفر توليد آلي",
  "landing.why2.body":
    "كل آية جايه من نص عثماني موثّق ومخزّن مسبقاً — التطبيق ما بيولّد أو يخمّن أي نص قرآني.",
  "landing.why3.title": "ما بتقرا نفس السورة كل مرة",
  "landing.why3.body":
    "يتابع شنو قريت قبل كدة ويقترح ليك حاجة مختلفة من محفوظاتك، بدل التكرار اللاواعي.",
  "landing.covers": "يشمل كل صلاتك",
  "landing.how": "كيف يعمل؟",
  "landing.step1.title": "حدّد محفوظاتك",
  "landing.step1.body": "بالسور أو بالأجزاء، بضغطة.",
  "landing.step2.title": "اختر الصلاة والنوع",
  "landing.step2.body": "فرض، نفل، أو قيام.",
  "landing.step3.title": "اضغط «أقِم»",
  "landing.step3.body":
    "يظهر لك المقترح بنصّه وتفسيره، مع «استخدمت هذه» و«اقترح غيرها».",
  "landing.trust":
    "النصوص من مشروع تنزيل عبر al-Quran Cloud، والتفسير من تفسير الميسّر (مجمع الملك فهد)، والترجمة الإنجليزية من Saheeh International. محقّقة ومُخزّنة محلياً — لا تُولّد ولا تُعدّل.",
  "landing.cta.title": "جرّب أقم في صلاتك القادمة",
  "landing.cta.body":
    "ما محتاجة وقت طويل — اختاري صلاتك، وخلي «أقم» يفتح ليك آية تقراها بخشوع.",
  "landing.fiqhNote": "الخيارات الفقهية تعكس ما هو شائع — يُرجى مراجعة أهل العلم.",
};

const en: Dict = {
  "nav.home": "Home",
  "nav.setup": "Memorized",
  "nav.history": "History",
  "nav.settings": "Settings",
  "nav.about": "About",
  "nav.openApp": "Open app",

  "common.loading": "Loading…",
  "common.save": "Save",
  "common.saved": "Saved",
  "common.source": "Source",
  "common.startNow": "Start now",

  "db.notReady.title": "Database not set up",
  "db.notReady.body": "Run the one-time setup:",

  "home.greeting": "Peace be upon you",
  "home.title": "What will you recite in your prayer?",
  "home.subtitle": "Pick a prayer, then let Aqim suggest — with variety.",
  "home.setMemoFirst": "Set your memorization first to start getting suggestions",
  "home.tapHere": "Tap here →",
  "home.type": "Type",
  "home.prayer": "Prayer",
  "home.rakahs": "Rak'ahs",
  "home.error": "Couldn't fetch a suggestion. Check the database connection.",
  "home.emptyState": "Pick a prayer and tap Aqim to see the suggestion here.",
  "home.dailyAyah": "Ayah of the day",
  "home.thisWeek": "This week",
  "home.recitations": "recitations",
  "home.passages": "distinct passages",
  "home.surahs": "distinct surahs",
  "home.fatihaOnly": "Al-Fatiha only",
  "home.noSuggestion": "No suggestion available.",
  "home.usedThis": "I recited this",
  "home.logged": "Logged",
  "home.suggestAnother": "Suggest another",
  "home.relaxed":
    "Your memorization is limited, so some passages may repeat to cover every rak'ah.",
  "home.exhausted": "Not enough passages — add more to your memorization.",

  "mode.faraid": "Obligatory",
  "mode.faraid.hint": "Fard",
  "mode.nafl": "Voluntary",
  "mode.nafl.hint": "Sunnah",
  "mode.qiyam": "Night Prayer",
  "mode.qiyam.hint": "Longer",

  "prayer.fajr": "Fajr",
  "prayer.dhuhr": "Dhuhr",
  "prayer.asr": "Asr",
  "prayer.maghrib": "Maghrib",
  "prayer.isha": "Isha",
  "prayer.fajr-sunnah": "Fajr Sunnah",
  "prayer.dhuhr-nafl": "Dhuhr Sunnah",
  "prayer.maghrib-sunnah": "Maghrib Sunnah",
  "prayer.isha-shaf": "Shaf'",
  "prayer.witr": "Witr",
  "prayer.free": "Free Nafl",
  "prayer.qiyam": "Qiyam",

  "rakah.1": "1st Rak'ah",
  "rakah.2": "2nd Rak'ah",
  "rakah.3": "3rd Rak'ah",
  "rakah.4": "4th Rak'ah",
  "rakah.n": "Rak'ah {n}",

  "passage.surah": "Surah",
  "passage.fixed": "Fixed",
  "passage.ayah": "Ayah",
  "passage.meaningSimple": "Simplified meaning",
  "passage.translation": "Translation",
  "passage.more": "More",
  "passage.less": "Less",

  "setup.title": "What have you memorized?",
  "setup.subtitle": "Pick by surah or by juz — we only suggest from your memorization.",
  "setup.bySurah": "By Surah",
  "setup.byJuz": "By Juz",
  "setup.ayahs": "ayahs",
  "setup.juz": "Juz",
  "setup.selected": "{n} selected",
  "setup.noneSelected": "None selected yet",
  "setup.notSeeded": "The database isn't set up yet.",

  "settings.title": "Settings",
  "settings.language": "Language",
  "settings.witr": "Witr rak'ahs",
  "settings.witr.hint": "The last rak'ah stays Al-Ikhlas.",
  "settings.noRepeat": "No-repeat window",
  "settings.noRepeat.hint": "A passage won't repeat within the last N used.",
  "settings.qiyamWindow": "Qiyam window",
  "settings.qiyamWindow.hint": "A wider window for night sessions.",
  "settings.shortSurah": "Short-surah limit (ayahs)",
  "settings.shortSurah.hint": "Keeps obligatory picks to shorter passages.",
  "settings.tafsirSource": "Tafsir source",
  "settings.tafsirSource.value": "Tafsir al-Muyassar — King Fahd Complex",
  "settings.fiqhNote":
    "Fiqh choices (like the number of Witr rak'ahs) are configurable and reflect common practice — please consult a scholar for what's correct for you.",
  "settings.saveSettings": "Save settings",
  "settings.settingsSaved": "Settings saved",

  "history.title": "Your history",
  "history.subtitle": "Track your variety this week.",
  "history.week": "This week",
  "history.distinctPassages": "Distinct passages",
  "history.distinctSurahs": "Distinct surahs",
  "history.mostRepeated": "Most repeated",
  "history.recent": "Recently used",
  "history.empty": "No history yet — start reciting.",

  "welcome.title": "Welcome to Aqim",
  "welcome.intro": "Your companion to recite with devotion, not by habit.",
  "welcome.s2.title": "Set what you've memorized",
  "welcome.s2.body": "Pick the surahs or juz you know — just once.",
  "welcome.s3.title": "Tap “Aqim” before each prayer",
  "welcome.s3.body": "It suggests verses from your memorization, with their meaning, without repeating the same surah every time.",
  "welcome.next": "Next",
  "welcome.start": "Let's start — set my memorization",
  "welcome.skip": "Skip",

  "landing.slogan": "Recite with devotion, not by habit",
  "landing.description":
    "Aqim suggests verses from your memorization for every prayer — verified text with a simple meaning below it — and never repeats the same surah each time.",
  "landing.why": "Why Aqim?",
  "landing.why1.title": "The fixed stays fixed",
  "landing.why1.body":
    "The Fajr and post-Maghrib Sunnahs always keep Al-Kafirun and Al-Ikhlas in their right place — never swapped or mixed up.",
  "landing.why2.title": "Verified text, zero AI generation",
  "landing.why2.body":
    "Every verse comes from a verified Uthmani source stored in advance — the app never generates or guesses any Quranic text.",
  "landing.why3.title": "Never the same surah every time",
  "landing.why3.body":
    "It tracks what you read before and suggests something different from your memorization, instead of unconscious repetition.",
  "landing.covers": "Covers every prayer",
  "landing.how": "How it works",
  "landing.step1.title": "Set your memorization",
  "landing.step1.body": "By surah or by juz, in a tap.",
  "landing.step2.title": "Pick the prayer and type",
  "landing.step2.body": "Fard, Nafl, or Qiyam.",
  "landing.step3.title": "Tap “Aqim”",
  "landing.step3.body":
    "You get the passage with its text and meaning, plus “I recited this” and “Suggest another”.",
  "landing.trust":
    "Text from the Tanzil project via al-Quran Cloud, tafsir from Tafsir al-Muyassar (King Fahd Complex), and the English translation from Saheeh International. Verified and stored locally — never generated or altered.",
  "landing.cta.title": "Try Aqim in your next prayer",
  "landing.cta.body":
    "It takes no time — pick your prayer and let Aqim open a verse for you to recite with devotion.",
  "landing.fiqhNote":
    "Fiqh choices reflect common practice — please consult a scholar.",
};

export const STRINGS: Record<Lang, Dict> = { ar, en };

// Translate a key, with optional {var} interpolation. Falls back to the key.
export function translate(
  lang: Lang,
  key: string,
  vars?: Record<string, string | number>,
): string {
  let s = STRINGS[lang][key] ?? STRINGS.ar[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return s;
}
