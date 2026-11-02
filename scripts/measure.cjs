// Точечный замер: печатает геометрию выбранных селекторов на телефоне.
// Запуск: node scripts/measure.cjs "/" ".hero,.hero-body,.app-main,.main"
const { spawn } = require("node:child_process");
const { join } = require("node:path");

const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.ANIX_URL || "http://localhost:3000";
const PORT = 9334;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const route = process.argv[2] || "/";
const selector = process.argv[3] || ".hero";
const width = Number(process.argv[4] || 390);

async function main() {
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${join(process.env.TEMP || "C:\\Windows\\Temp", "anix-cdp2")}`,
      "about:blank",
    ],
    { stdio: "ignore" }
  );
  let targets = null;
  for (let i = 0; i < 60; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      if (targets && targets.length) break;
    } catch {}
    await sleep(300);
  }
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let seq = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m.result);
      pending.delete(m.id);
    }
  };
  const send = (method, params = {}) =>
    new Promise((res) => {
      const id = ++seq;
      pending.set(id, res);
      ws.send(JSON.stringify({ id, method, params }));
    });

  await send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await send("Page.enable");
  await send("Page.navigate", { url: `${BASE}${route}` });
  await sleep(4000);
  for (let i = 0; i < 3; i++) {
    await send("Runtime.evaluate", {
      expression: `(() => { const b = Array.from(document.querySelectorAll('.md button')).find(x => /Принимаю/.test(x.innerText) || x.getAttribute('aria-label')==='Закрыть'); if (b) b.click(); return true; })()`,
    });
    await sleep(2000);
  }
  const res = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => Array.from(document.querySelectorAll(${JSON.stringify(selector)})).slice(0,6).map(el => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { sel: el.tagName + '.' + String(el.className||'').slice(0,30), x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height), display: cs.display, maxW: cs.maxWidth, overflowX: cs.overflowX, position: cs.position };
    }))()`,
  });
  console.log(JSON.stringify(res.result.value, null, 1));
  ws.close();
  chrome.kill();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
