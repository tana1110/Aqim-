# Handoff: Onboarding v2 (read this first)

You're continuing work started in another Claude Code session. That session's chat history doesn't carry over, so this file is the full context. The owner is Jumana (jumanaomer74@gmail.com). The app is used daily by Tana on an Android phone.

## The app in one paragraph
Aqim (أقِم) is a bilingual (AR/EN, RTL-first) prayer companion. Before each prayer, the user taps «أقِم» and gets ayat to recite for each rak'ah, drawn from what they've memorized. It's built with Next.js 16 App Router on Cloudflare Workers via OpenNext, with a D1 (SQLite) database through Prisma 7 and the D1 adapter. A native Android WebView wrapper (package `app.aqimalsalat`) runs it on the phone. It's live at https://aqimalsalat.app.

## Where things stand
- Branch `onboarding-v2` holds the new first-launch onboarding. It's code-complete and passes `npx tsc --noEmit`.
- It is **not deployed and not merged**. Production still runs `main`.
- One preview test ran (Arabic, 412x915). The opening, explainer 1 and explainer 2 rendered correctly. It also found a bug: pressing hardware back on an explainer gave a blank screen. The cause was the Next App Router fully reloading when back lands on a history entry it didn't create. The fix is in this branch, but it hasn't been verified yet:
  - the onboarding `pushState` now spreads `window.history.state`
  - `BackExitGuard` only arms after the `aqim-onboarded` event
- The build kept failing on the old laptop because there wasn't enough RAM for WSL (`Wsl/Service/E_UNEXPECTED`).

## The approved design
Canvas: https://claude.ai/artifact/4ckvGTef7Se9BpkhWduWkN (9 screens, owner's account). The implementation follows it. Flow:
1. **Opening + language.** The real logo mark animates as a "descent into sujood": the dot travels down the arc path using the curve's equation (keyframes in `src/app/onboarding.css`). Then the wordmark appears, then Al-Isra 17:78 word by word, then the slogan «صلِّ بخشوع، لا بعادة» + "Pray with humility, not a habit." Then the العربية / English buttons. Tapping anywhere skips to the finished screen.
2. **Explainer 1:** «حدّد ما تحفظه». Juz 28, 29 and 30 get checked one by one.
3. **Explainer 2:** «في كل صلاة، آيات مختلفة من محفوظك». It mirrors the real home card (next prayer, a ticking «المتبقي», prayer chips, round «أقِم»). After the tap, it shows Rak'ah 1 = Al-Mulk 1–5 and Rak'ah 2 = An-Naba' 1–11, each with a «المعنى» line.
4. **Explainer 3:** «وكل ما تحتاجه لصلاتك، في مكان واحد». Five tiles light up one at a time: الورد اليومي، الأذكار، المسبحة، القبلة، المراجعة. The review tile reads «اختر سورة واحدة / لتركّز عليها».
5. **Sign up:** username + email + password, «لاحقًا» to continue without an account, and a link to log in.
6. **Greeting** (new sign-ups only): «السلام عليكم،» + username + «فتح الله عليكم». It continues by itself.
7. **Setup step 1** (`/setup?onboarding=1`): the app's real memorization picker, opening on the juz tab.
8. **Setup step 2:** «ما طول الآيات الذي تفضّله في صلاتك؟». Tapping an option chooses it; «تخطي» sets **short**.
9. **Home:** a «اضغط هنا للبدء» bubble under «أقِم». It's gone after the first tap.

## Decisions the owner made (don't undo)
- Memorization explainer comes **first**, then «أقِم», then the features screen. There's no problem/marketing screen.
- Don't say «آيات جديدة» (it sounds like revelation). Say «آيات مختلفة من محفوظك».
- No "Ready" screen and no «ابدأ بخطوتين» checklist; the Home bubble replaces them. The old HomeTour is deleted.
- Explainer subtitles are removed to avoid over-explaining. Keep copy minimal.
- The welcome uses the **username**, never a first name or a sample name.
- Default ayah length is **short** across the app. Skipping the length step means short.
- Sign-up is optional («لاحقًا»). Login, sessions and password reset are unchanged and email-based. `/api/auth/signup` accepts `username` and stores it as the account `name`.
- The look must match the app's own theme (dark tokens, rounded tiles, round buttons, Cairo extra-bold UI, Amiri for ceremonial text). Gold buttons use dark ink text for contrast.
- Design taste: no generic "AI-looking" layouts, no emoji, no sparkle icons, no confetti. The owner cares a lot about design and wants calm, clear, not overwhelming.

## Hard rules
- **Never hand-type Arabic Quran text.** Take it from the app's dataset/API (Al-Isra 78 comes from `/api/slogan-ayah`) and verify it with a script. A hand copy once reordered harakat.
- Demo content shows surah names and ayah numbers only, never ayah text. Everything is in Mushaf order with ascending ranges.
- Don't deploy to production or merge to `main` without the owner's OK after they've seen the preview results.
- Test accounts must use `onb-test-<n>@example.com`, and you must delete them afterwards (`scripts/onboarding-test/cleanup-test-users.js`).

## How to build, preview and deploy
- **Windows:** OpenNext needs real symlinks, so build inside WSL (distro `Ubuntu2`) with `scripts/wsl/build.sh`. It rsyncs the repo to `~/aqim` and builds there. `build-fast.sh` skips `npm ci`. If WSL says "Catastrophic failure", run `wsl --shutdown` and retry; the machine needs several GB of free RAM. **Mac/Linux:** run `npx opennextjs-cloudflare build` directly.
- **Preview** (production untouched): `npx opennextjs-cloudflare upload`. It prints a `Version Preview URL`. It uses the production D1 database, so be careful with test data.
- **Production:** `npx opennextjs-cloudflare deploy`, only with the owner's OK. Cloudflare API calls often time out; just retry.
- Env for deploys: `CLOUDFLARE_API_TOKEN` comes from `C:\Users\Admin\.cloudflare_token_for_aqim.txt` (never commit it; copy it to the new machine by hand), and `CLOUDFLARE_ACCOUNT_ID=23c4ed86016680e63c6c038a14a9806b`.

## Remaining steps
1. Build, then upload a preview.
2. Run `node scripts/onboarding-test/flow-ar.js <previewURL> onb-test-<n>@example.com`. It does the full Arabic sign-up, checks hardware back on explainer 2 (verifies the fix), then goes through greeting → setup → length → home bubble.
3. Run `node scripts/onboarding-test/walk.js <previewURL> <ar|en> <w> <h> <fontScale> <reducedMotion>`. It goes through every screen via «لاحقًا». Cover:
   - 360 640 and 412 915
   - ar and en
   - font scale 0.875 and 1.25
   - reducedMotion 1 at least once
4. Look at every screenshot carefully: no overlaps, nothing under the status bar, clean line breaks, English left-to-right.
5. Run `node scripts/onboarding-test/cleanup-test-users.js`.
6. Show the owner the results. After they approve: deploy, test on the phone, merge `onboarding-v2` into `main`, push.

The test scripts drive headless Chrome over CDP and assume Chrome is at `C:/Program Files/Google/Chrome/Application/chrome.exe`; change that path on another OS.
