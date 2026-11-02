// Проверка 4 раскладок на телефоне: у каждой должна быть своя навигация.
// Запуск: node scripts/layout-check.cjs
const { spawn } = require("node:child_process");
const { join } = require("node:path");

const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.ANIX_URL || "http://localhost:3000";
const PORT = 9336;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LAYOUTS = ["side", "rail", "top", "dock"];
const WIDTHS = [390, 768];

async function main() {
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${join(process.env.TEMP || "C:\\Windows\\Temp", "anix-cdp4")}`,
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

  await send("Page.enable");
  await send("Page.navigate", { url: `${BASE}/` });
  await sleep(3500);

  const rows = [];
  for (const width of WIDTHS) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    for (const layout of LAYOUTS) {
      await send("Runtime.evaluate", {
        expression: `(() => {
          const p = JSON.parse(localStorage.getItem('preferences') || '{}');
          p.state = p.state || {};
          p.state.appearance = { ...(p.state.appearance || {}), layout: '${layout}' };
          p.state.params = { ...(p.state.params || {}), isFirstLaunch: false };
          localStorage.setItem('preferences', JSON.stringify(p));
          location.reload();
          return true;
        })()`,
      });
      await sleep(4000);
      const res = await send("Runtime.evaluate", {
        returnByValue: true,
        expression: `(() => {
          const nav = document.querySelector('.mnav');
          const desk = document.querySelector('.nav');
          if (!nav) return { none: true };
          const cs = getComputedStyle(nav);
          const r = nav.getBoundingClientRect();
          const labels = Array.from(nav.querySelectorAll('.mnav-item span:not(.mnav-ava)'))
            .filter(x => getComputedStyle(x).display !== 'none').length;
          return {
            pos: Math.round(r.top) + '/' + Math.round(r.bottom),
            height: Math.round(r.height),
            left: Math.round(r.left),
            right: Math.round(window.innerWidth - r.right),
            radius: cs.borderTopLeftRadius,
            labels,
            desktopNav: desk ? getComputedStyle(desk).display : 'none',
            mainPadTop: Math.round(parseFloat(getComputedStyle(document.querySelector('.main')).paddingTop)),
          };
        })()`,
      });
      rows.push({ width, layout, ...res.result.value });
    }
  }
  console.log(JSON.stringify(rows, null, 1));
  ws.close();
  chrome.kill();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
