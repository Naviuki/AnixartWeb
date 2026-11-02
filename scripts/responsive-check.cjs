// Прогон узких экранов: каждый маршрут на 320, 390, 768 и 1024 px.
// Печатает переполнение по ширине и элементы, вылезающие за край.
// Запуск: node scripts/responsive-check.cjs
const { spawn } = require("node:child_process");
const { join } = require("node:path");

const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.ANIX_URL || "http://localhost:3000";
const PORT = 9335;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ROUTES = [
  "/",
  "/discovery",
  "/search",
  "/release/2013",
  "/profile/3610931",
  "/notifications",
  "/about",
  "/bookmarks",
  "/collections",
  "/history",
  "/discovery/filter",
  "/discovery/collections",
  "/related/2458",
  "/login",
];
const WIDTHS = [320, 390, 768, 1024];

async function main() {
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${join(process.env.TEMP || "C:\\Windows\\Temp", "anix-cdp3")}`,
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
  await sleep(3000);
  for (let i = 0; i < 3; i++) {
    await send("Runtime.evaluate", {
      expression: `(() => { const b = Array.from(document.querySelectorAll('.md button')).find(x => /Принимаю/.test(x.innerText) || x.getAttribute('aria-label')==='Закрыть'); if (b) b.click(); return true; })()`,
    });
    await sleep(1500);
  }

  const report = [];
  for (const width of WIDTHS) {
    await send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: width <= 768,
    });
    for (const route of ROUTES) {
      await send("Page.navigate", { url: `${BASE}${route}` });
      await sleep(3500);
      const res = await send("Runtime.evaluate", {
        returnByValue: true,
        expression: `(() => {
          const de = document.documentElement;
          const vw = de.clientWidth;
          const offenders = [];
          for (const el of document.querySelectorAll('body *')) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            if (getComputedStyle(el).position === 'fixed') continue;
            if (r.right <= vw + 1) continue;
            if (el.closest('.swiper, .railrow, .chiprow')) continue;
            // Размытый фон баннера увеличен намеренно и обрезается родителем
            if (el.classList.contains('hero-bg')) continue;
            let p = el.parentElement, inScroller = false;
            while (p) {
              const ps = getComputedStyle(p);
              if (ps.overflowX === 'auto' || ps.overflowX === 'scroll') { inScroller = true; break; }
              p = p.parentElement;
            }
            if (inScroller) continue;
            offenders.push(el.tagName + '.' + String(el.className || '').slice(0, 28) + ' ->' + Math.round(r.right));
          }
          return { scroll: de.scrollWidth - vw, offenders: offenders.slice(0, 5) };
        })()`,
      });
      const v = res.result.value;
      if (v.scroll > 0 || v.offenders.length)
        report.push({ width, route, ...v });
    }
  }
  console.log(
    report.length === 0
      ? "переполнений нет на всех маршрутах и ширинах"
      : JSON.stringify(report, null, 1)
  );
  ws.close();
  chrome.kill();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
