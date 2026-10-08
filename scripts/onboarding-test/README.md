# Onboarding v2: status and how to finish

Branch: `onboarding-v2`. Not merged and not deployed. Production still runs `main`.

Approved design (canvas): https://claude.ai/artifact/4ckvGTef7Se9BpkhWduWkN

## What's built

- `src/components/onboarding/`: the first-launch flow. It covers the opening with the logo descent, Al-Isra 78 shown word by word from `/api/slogan-ayah`, and the language choice. Then come 3 explainers, sign-up (username + email + password, «لاحقًا», login), and the «السلام عليكم» greeting.
- `src/app/onboarding.css`: all the motion. It honours `prefers-reduced-motion`.
- `/setup?onboarding=1`: step 1 is the real memorization picker, opening on the juz tab. Step 2 is the ayah length; tapping an option picks it, and «تخطي» means short.
- Home: the «اضغط هنا للبدء» bubble under «أقِم». It shows until the first tap and is controlled by `aqim-start-tip`. The old HomeTour is removed.
- `/api/auth/signup` accepts `username` and stores it as the account name.
- Settings, "replay tour", replays the new intro. A signed-in user skips sign-up.
- `BackExitGuard` waits for onboarding to finish before arming.

## Left to do

1. Build. On Windows, use WSL (see `build.sh`). The machine needs several GB of free RAM, or WSL crashes.
2. Run `npx opennextjs-cloudflare upload` to get a preview URL without touching production.
3. Run `node scripts/onboarding-test/flow-ar.js <previewURL> onb-test-<n>@example.com`. It runs the full Arabic sign-up and checks hardware back on explainers.
   - The back-button fix (history entries keep Next's state) has not been verified yet.
4. Run `node scripts/onboarding-test/walk.js <previewURL> <ar|en> <w> <h> <0.875|1.25> <0|1>`. It walks every screen at 360x640 and 412x915, in both languages, at both font extremes, with and without reduced motion.
5. Run `node scripts/onboarding-test/cleanup-test-users.js` to delete the `onb-test-*@example.com` accounts.
6. Review the screenshots, deploy, check on the phone, then merge into `main`.

The scripts assume Chrome at the default Windows path and the Cloudflare token at `C:\Users\Admin\.cloudflare_token_for_aqim.txt`. The token is never committed.
