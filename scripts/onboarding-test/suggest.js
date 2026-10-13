// Tap «أقِم» as a guest with a given memorization and length; report what
// came back and how many lines each passage takes on a phone.
// node suggest.js <BASE>
const { launch, sleep } = require("./cdp");
const BASE = process.argv[2];
const OUT = (process.env.SHOTS || __dirname) + "/suggest/";
require("fs").mkdirSync(OUT, { recursive: true });

const PROFILES = {
  baqarah: [{ surahNumber: 2, fromAyah: 1, toAyah: 60 }],
  mulk: [{ surahNumber: 67, fromAyah: 1, toAyah: 30 }],
  naba: [{ surahNumber: 78, fromAyah: 1, toAyah: 40 }],
};

(async () => {
  for (const [name, ranges] of Object.entries(PROFILES)) {
    for (const len of ["short", "medium", "long"]) {
      const b = await launch({ width: 412, height: 915, port: 9700 + Math.floor(Math.random() * 250) });
      try {
        await b.goto(BASE + "/privacy");
        await b.eval(`["aqim-onboarded","aqim-tour-done"].forEach(k=>localStorage.setItem(k,"1")); localStorage.setItem("aqim-passage-len","${len}"); localStorage.setItem("aqim-install-dismissed","1"); localStorage.setItem("aqim-notif-snooze", String(Date.now()))`);
        const put = await b.eval(`fetch("/api/memorization",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({ranges:${JSON.stringify(ranges)}})}).then(r=>r.status)`);
        await b.goto(BASE + "/home");
        await sleep(3000);
        await b.eval(`[...document.querySelectorAll("button")].find(x=>x.textContent.trim()==="أقِم")?.click()`);
        await sleep(5000);
        const res = await b.eval(`(() => [...document.querySelectorAll(".passage-dense .quran-text")].map(p => {
          const cs = getComputedStyle(p); const lh = parseFloat(cs.lineHeight);
          const card = p.closest(".card"); const head = card ? card.innerText.split("\\n").slice(0,3).join(" | ") : "";
          return { lines: Math.round(p.getBoundingClientRect().height / lh), words: p.innerText.trim().split(/\\s+/).length, font: cs.fontSize, head: head.slice(0,70) };
        }))()`);
        console.log(`${name.padEnd(7)} ${len.padEnd(6)} put=${put}`, JSON.stringify(res));
        const first = await b.eval(`(() => { const c = document.querySelector(".passage-dense"); if (!c) return 0; c.closest(".card")?.scrollIntoView(); return 1; })()`);
        if (first) { await sleep(500); await b.shot(`${OUT}${name}-${len}.png`); }
      } catch (e) {
        console.log(name, len, "FAILED", e.message);
      } finally {
        await b.close();
      }
    }
  }
})();
