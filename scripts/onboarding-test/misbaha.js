// Misbaha "one after another": open as the after-prayer button does, tap
// through two full counts, check it advances.  node misbaha.js <BASE>
const { launch, sleep } = require("./cdp");
const BASE = process.argv[2];
const OUT = (process.env.SHOTS || __dirname) + "/misbaha/";
require("fs").mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await launch({ width: 412, height: 915, port: 9677 });
  try {
    await b.goto(BASE + "/privacy");
    await b.eval(`["aqim-onboarded","aqim-tour-done"].forEach(k => localStorage.setItem(k, "1"))`);
    await b.goto(BASE + "/tasbih?sequence=1");
    await sleep(2500);
    const read = () =>
      b.eval(`(() => {
        const ps = [...document.querySelectorAll("p.font-quran")];
        const txt = document.body.innerText;
        const i = txt.indexOf("التالي:");
        return {
          phrase: ps[0] ? ps[0].innerText : null,
          next: i >= 0 ? txt.slice(i + 7, txt.indexOf(String.fromCharCode(10), i)).trim() : null,
          url: location.pathname + location.search,
          pressed: [...document.querySelectorAll("button[aria-pressed=true]")].map(x => x.innerText).join(" / "),
        };
      })()`);
    const tap = async (n) => { for (let i = 0; i < n; i++) { await b.eval(`document.querySelector('button[aria-label="اضغط للتسبيح"]').click()`); await sleep(40); } };
    console.log("start   :", JSON.stringify(await read()));
    await b.shot(OUT + "start.png");
    await tap(33);
    await sleep(700);
    console.log("after 33:", JSON.stringify(await read()));
    await tap(33);
    await sleep(700);
    console.log("after 66:", JSON.stringify(await read()));
    await b.shot(OUT + "after-66.png");
  } catch (e) {
    console.log("FAILED", e.message);
  } finally {
    await b.close();
  }
})();
