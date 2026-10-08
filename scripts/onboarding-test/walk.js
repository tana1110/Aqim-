// Walks the whole first-launch journey via «لاحقًا» (no account created)
// and screenshots every screen.  node walk.js BASE lang w h fontScale reducedMotion
const { launch, sleep } = require("./cdp");
const [BASE, lang, w, h, scale, rm] = process.argv.slice(2);
const tag = `${lang}-${w}x${h}-f${scale}${rm === "1" ? "-rm" : ""}`;
const OUT = __dirname + "/walk/";
require("fs").mkdirSync(OUT, { recursive: true });
const T = lang === "ar"
  ? { lang: "العربية", next: "التالي", later: "لاحقًا", juz: "جزء 30", skip: "تخطي" }
  : { lang: "English", next: "Next", later: "Later", juz: "Juz 30", skip: "Skip" };

(async () => {
  const b = await launch({ width: +w, height: +h, reducedMotion: rm === "1", port: 9400 + Math.floor(Math.random() * 400) });
  const shot = (n) => b.shot(`${OUT}${tag}-${n}.png`);
  try {
    await b.goto(BASE + "/privacy");
    await b.eval(`localStorage.setItem('aqim-font-scale', '${scale}')`);
    await b.goto(BASE + "/home");
    await sleep(800);
    if (rm !== "1") await b.eval("document.querySelector('.onb-root > div > div').click()");
    await sleep(900);
    await shot("1-open");
    await b.clickText(T.lang);
    await sleep(rm === "1" ? 900 : 3200);
    await shot("2-ex1");
    await b.clickText(T.next);
    await sleep(rm === "1" ? 900 : 5800);
    await shot("3-ex2");
    await b.clickText(T.next);
    await sleep(rm === "1" ? 900 : 4000);
    await shot("4-ex3");
    await b.clickText(T.next);
    await sleep(900);
    await shot("5-auth");
    await b.clickText(T.later);
    await sleep(4000);
    await shot("6-setup1");
    await b.clickText(T.juz);
    await sleep(300);
    await b.clickText(T.next);
    await sleep(2200);
    await shot("7-setup2");
    await b.clickText(T.skip);
    await sleep(4000);
    await shot("8-home");
    console.log(tag, "ok", await b.eval("location.pathname"), "len=" + (await b.eval("localStorage.getItem('aqim-passage-len')")),
      "dir=" + (await b.eval("document.documentElement.dir")));
  } catch (e) {
    console.log(tag, "FAILED:", e.message);
    await shot("FAIL");
  } finally {
    await b.close();
  }
})();
