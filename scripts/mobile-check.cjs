// Проверка ширины страницы на телефоне и снимок: запускает Chrome с remote debugging,
// эмулирует ширину, снимает скриншот и печатает элементы, вылезающие за край.
// Запуск: node scripts/mobile-check.cjs [маршрут] [ширина]
const { spawn } = require("node:child_process");
const { writeFileSync, mkdirSync } = require("node:fs");
const { join } = require("node:path");

const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.ANIX_URL || "http://localhost:3000";
const OUT = join(__dirname, "..", ".shots");
mkdirSync(OUT, { recursive: true });

const route = process.argv[2] || "/";
const width = Number(process.argv[3] || 390);
const PORT = 9333;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function json(path) {
  const res = await fetch(`http://127.0.0.1:${PORT}${path}`);
  return res.json();
}

async function main() {
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${join(process.env.TEMP || "C:\\Windows\\Temp", "anix-cdp")}`,
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let targets = null;
  for (let i = 0; i < 60; i++) {
    try {
      targets = await json("/json/list");
      if (targets && targets.length) break;
    } catch {
      /* ещё стартует */
    }
    await sleep(300);
  }
  if (!targets) throw new Error("Chrome не запустился");

  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));

  let seq = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++seq;
      pending.set(id, resolve);
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

  // Первый запуск показывает предупреждение, затем список изменений
  for (let i = 0; i < 3; i++) {
    await send("Runtime.evaluate", {
      expression: `(() => {
        const btn = Array.from(document.querySelectorAll('.md button'))
          .find(x => /Принимаю|^\\s*✕?\\s*$/.test(x.innerText) || x.getAttribute('aria-label') === 'Закрыть');
        if (document.querySelector('.md') && btn) btn.click();
        return Boolean(document.querySelector('.md'));
      })()`,
      returnByValue: true,
    });
    await sleep(2500);
  }

  const result = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const de = document.documentElement;
      const vw = de.clientWidth;
      const offenders = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const style = getComputedStyle(el);
        if (style.position === 'fixed') continue;
        if (r.right <= vw + 1) continue;
        // прокручиваемые ряды (свайперы, чипы) намеренно шире экрана
        let p = el.parentElement, inScroller = false;
        while (p) {
          const ps = getComputedStyle(p);
          if (ps.overflowX === 'auto' || ps.overflowX === 'scroll') { inScroller = true; break; }
          p = p.parentElement;
        }
        if (inScroller) continue;
        // Swiper двигает слайды трансформами, а не overflow
        if (el.closest('.swiper')) continue;
        offenders.push({ tag: el.tagName, cls: String(el.className || '').slice(0, 40), right: Math.round(r.right), text: (el.innerText || '').trim().slice(0, 40) });
      }
      return { vw, scrollWidth: de.scrollWidth, offenders: offenders.slice(0, 12) };
    })()`,
  });

  const shot = await send("Page.captureScreenshot", { format: "png" });
  const name = route === "/" ? "index" : route.replace(/\//g, "_").replace(/^_/, "");
  const file = join(OUT, `cdp-${name}-${width}.png`);
  writeFileSync(file, Buffer.from(shot.data, "base64"));

  console.log(JSON.stringify({ route, width, ...result.result.value, file }, null, 1));

  ws.close();
  chrome.kill();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
