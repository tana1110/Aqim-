// Which Home card does each kind of visitor see?  node cards.js <BASE>
const { launch, sleep } = require("./cdp");
const BASE = process.argv[2];
const OUT = (process.env.SHOTS || __dirname) + "/cards/";
require("fs").mkdirSync(OUT, { recursive: true });

const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

const cases = [
  { name: "android-browser", ua: ANDROID, extra: {} },
  { name: "iphone-safari", ua: IPHONE, extra: {} },
  { name: "android-install-dismissed", ua: ANDROID, extra: { "aqim-install-dismissed": "1" } },
];

(async () => {
  for (const c of cases) {
    const b = await launch({ width: 412, height: 915, port: 9500 + Math.floor(Math.random() * 300) });
    try {
      await b.send("Emulation.setUserAgentOverride", { userAgent: c.ua });
      await b.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
      await b.goto(BASE + "/privacy");
      const ls = { "aqim-onboarded": "1", "aqim-tour-done": "1", "aqim-passage-len": "short", ...c.extra };
      await b.eval(`(() => { const o = ${JSON.stringify(ls)}; for (const k in o) localStorage.setItem(k, o[k]); })()`);
      await b.goto(BASE + "/home");
      await sleep(3500);
      const found = await b.eval(`(() => {
        const txt = document.body.innerText;
        return {
          coarse: matchMedia("(pointer: coarse)").matches,
          playButton: !!document.querySelector('a[href*="play.google.com"]'),
          iosTitle: txt.includes("الشاشة الرئيسية"),
          reminderCard: txt.includes("فعّل تذكير الصلاة"),
          oldPwaInstall: txt.includes("تثبيت التطبيق"),
        };
      })()`);
      console.log(c.name, JSON.stringify(found));
      await b.shot(OUT + c.name + ".png");
    } catch (e) {
      console.log(c.name, "FAILED", e.message);
    } finally {
      await b.close();
    }
  }
})();
