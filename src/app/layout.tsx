import type { Metadata, Viewport } from "next";
import { Amiri, Amiri_Quran, Cairo, Inter } from "next/font/google";
import { LanguageProvider } from "@/components/LanguageProvider";
import "./globals.css";

// Headers (Arabic): Amiri — classical, manuscript-like.
const amiri = Amiri({
  variable: "--font-amiri",
  weight: ["400", "700"],
  subsets: ["arabic", "latin"],
  display: "swap",
});

// Quranic verse text: Amiri Quran — renders full tashkeel clearly.
const amiriQuran = Amiri_Quran({
  variable: "--font-amiri-quran",
  weight: "400",
  subsets: ["arabic"],
  display: "swap",
});

// UI text / buttons / settings (Arabic): Cairo — clean, modern, readable small.
const cairo = Cairo({
  variable: "--font-cairo",
  weight: ["400", "500", "600", "700"],
  subsets: ["arabic", "latin"],
  display: "swap",
});

// Latin text / numbers: Inter.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aqim · أقم",
  description:
    "Choose which memorized verses to recite in prayer — with variety, from a verified Quran source.",
  appleWebApp: { capable: true, title: "Aqim", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3eee3" },
    { media: "(prefers-color-scheme: dark)", color: "#1c2830" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${amiri.variable} ${amiriQuran.variable} ${cairo.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        {/* Apply the saved language before paint to avoid a flash of the wrong
            direction. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var l=localStorage.getItem('aqim-lang');if(l==='en'){document.documentElement.lang='en';document.documentElement.dir='ltr';}}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
