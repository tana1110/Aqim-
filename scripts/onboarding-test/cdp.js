// Minimal Chrome DevTools Protocol driver (Node 24 global WebSocket).
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

async function launch({ width, height, mobile = true, reducedMotion = false, port = 9333 }) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "aqim-cdp-"));
  const proc = spawn(CHROME, [
    "--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--hide-scrollbars", "about:blank",
  ], { stdio: "ignore" });
  let ver;
  for (let i = 0; i < 50; i++) {
    try { ver = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (ver.length) break; } catch {}
    await sleep(200);
  }
  const page = ver.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
    }
  };
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const i = ++id;
      pending.set(i, { res, rej });
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true });
  if (reducedMotion)
    await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  const api = {
    send,
    async goto(url) { await send("Page.navigate", { url }); await sleep(2500); },
    async eval(expr) {
      const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + " " + JSON.stringify(r.exceptionDetails.exception?.description));
      return r.result.value;
    },
    // Click the first visible element whose text (trimmed) matches.
    async clickText(text, sel = "button,a,[role=tab]") {
      const ok = await api.eval(`(() => {
        const els = [...document.querySelectorAll(${JSON.stringify(sel)})].filter(e => {
          const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && e.textContent.trim().includes(${JSON.stringify(text)});
        });
        if (!els.length) return false; els[0].click(); return true; })()`);
      if (!ok) throw new Error("no clickable with text: " + text);
    },
    async type(selector, value) {
      await api.eval(`(() => { const el = document.querySelector(${JSON.stringify(selector)});
        const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
        set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
    },
    async shot(file) {
      const r = await send("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(file, Buffer.from(r.data, "base64"));
    },
    async back() { await send("Runtime.evaluate", { expression: "history.back()" }); await sleep(900); },
    async close() { try { ws.close(); } catch {} proc.kill(); },
  };
  return api;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
module.exports = { launch, sleep };
