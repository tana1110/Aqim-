const { launch, sleep } = require("./cdp");
const BASE = process.argv[2];
const OUT = __dirname + "/flow/";
require("fs").mkdirSync(OUT, { recursive: true });
const EMAIL = process.argv[3];

(async () => {
  const b = await launch({ width: 412, height: 915 });
  const log = (...a) => console.log(...a);
  try {
    await b.goto(BASE + "/home");
    await sleep(1200);
    await b.shot(OUT + "ar-01-open-1.5s.png");
    await sleep(5500);
    await b.shot(OUT + "ar-02-open-final.png");
    log("onboarded flag before:", await b.eval("localStorage.getItem('aqim-onboarded')"));
    await b.clickText("العربية");
    await sleep(3200);
    await b.shot(OUT + "ar-03-ex1.png");
    await b.clickText("التالي");
    await sleep(1800);
    await b.shot(OUT + "ar-04-ex2-hero.png");
    await sleep(3600);
    await b.shot(OUT + "ar-05-ex2-results.png");
    // hardware back → ex1, then forward again
    await b.back();
    log("after back, title:", await b.eval("document.querySelector('.onb-root h1')?.textContent"));
    await b.clickText("التالي");
    await sleep(600);
    await b.clickText("التالي");
    await sleep(4000);
    await b.shot(OUT + "ar-06-ex3.png");
    await b.clickText("التالي");
    await sleep(900);
    await b.shot(OUT + "ar-07-signup.png");
    await b.type("input[autocomplete=username]", "Tana Test");
    await b.type("input[type=email]", EMAIL);
    await b.type("input[type=password]", "test-pass-123");
    await b.shot(OUT + "ar-08-signup-filled.png");
    await b.clickText("إنشاء الحساب", "button[type=submit]");
    await sleep(2600);
    await b.shot(OUT + "ar-09-greeting.png");
    await sleep(5200);
    log("url after greeting:", await b.eval("location.pathname + location.search"));
    await b.shot(OUT + "ar-10-setup1.png");
    await b.clickText("جزء 30");
    await b.clickText("جزء 29");
    await sleep(500);
    await b.shot(OUT + "ar-11-setup1-picked.png");
    await b.clickText("التالي");
    await sleep(2500);
    await b.shot(OUT + "ar-12-setup2.png");
    await b.clickText("قصيرة");
    await sleep(3500);
    log("url after length:", await b.eval("location.pathname"));
    log("passage-len:", await b.eval("localStorage.getItem('aqim-passage-len')"), "tip:", await b.eval("localStorage.getItem('aqim-start-tip')"));
    await b.shot(OUT + "ar-13-home-tip.png");
    const me = await b.eval("fetch('/api/auth/me').then(r=>r.json())");
    log("me:", JSON.stringify(me));
    const memo = await b.eval("fetch('/api/memorization').then(r=>r.json()).then(d=>d.memorization.length)");
    log("memorization ranges:", memo);
  } catch (e) {
    console.error("FAILED:", e.message);
    await b.shot(OUT + "ar-FAIL.png");
  } finally {
    await b.close();
  }
})();
