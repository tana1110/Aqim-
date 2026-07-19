# Aqim · أقم

Helps people who have memorized parts of the Quran choose **which** verses to
recite in prayer — with variety — instead of unconsciously repeating the same
few short surahs. Built with Next.js 16, React 19, Tailwind v4, Prisma 7, and
PostgreSQL.

## Quranic content accuracy (non-negotiable)

- **No Quranic text is ever AI-generated or AI-modified.** All text is copied
  verbatim from the Tanzil project (Uthmani script) via al-Quran Cloud and
  stored locally.
- On seed, the text is **cross-checked against two independent sources**: a
  canonical per-surah ayah-count table (structural) and a second, independently
  maintained Uthmani edition (textual). The last run matched to within 0.03%.
- The meaning shown under each verse is **Tafsir al-Muyassar** (King Fahd
  Complex), condensed to a few lines from the existing tafsir — never a newly
  composed interpretation. The full sourced tafsir is retained and cited.
- Surah name, ayah numbers, and tafsir source are shown under every passage.

## Features

- **Three modes:** Obligatory (Fara'id), Voluntary (Nawafil), Qiyam al-Layl.
- **Fixed surahs** (Al-Kafirun, Al-Ikhlas) are never randomized in their
  designated positions (Fajr/Maghrib Sunnah, Witr).
- **Anti-repetition:** a passage isn't suggested again within a configurable
  window; gracefully relaxes when little is memorized.
- Setup by **surah or juz'**, history/stats, settings, full **RTL** + Amiri
  Quran font.

## Running it

The database is a recovered PostgreSQL 15 cluster run from portable binaries
(not a Windows service), so start it first each session:

```bash
npm run db:start   # start PostgreSQL on port 5432
npm run dev        # landing page at http://localhost:3000, app at /home
npm run db:stop    # stop PostgreSQL when done
```

The marketing/intro **landing page** is at `/`; the actual app (with the
bottom tab bar) lives under `/home`, `/setup`, `/history`, `/settings`.

One-time data load (already done): `npm run db:migrate` then `npm run db:seed`.

### Database notes

- Live cluster: `C:\Users\Admin\aqim-pgdata` (started via `scripts/start-db.ps1`).
- Binaries: `C:\Users\Admin\aqim-pg\pgsql\bin`.
- The original cluster at `C:\Program Files\PostgreSQL\15\data` is untouched and
  kept as a backup. To make this durable across reboots, register a Windows
  service with `pg_ctl register` (requires an elevated shell).
- Connection: see `.env` (`DATABASE_URL`).
