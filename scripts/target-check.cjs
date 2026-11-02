// Проверка целей нажатия (WCAG 2.5.8: 24×24) и подписей у кнопок с иконками.
// Запуск: node scripts/target-check.cjs [ширина]
const { spawn } = require("node:child_process");
const { join } = require("node:path");

const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.ANIX_URL || "http://localhost:3000";
const PORT = 9338;
const width = Number(process.argv[2] || 390);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ROUTES = ["/", "/discovery", "/search", "/release/2013", "/notifications", "/profile/3610931"];

async function main() {
  const chrome = spawn(
    CHROME,
    [
      "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${join(process.env.TEMP || "C:\\Windows\\Temp", "anix-target")}`,
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
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  };
  const send = (method, params = {}) => new Promise((res) => {
    const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params }));
  });
  const evalJs = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    return r.result?.value;
  };

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height: 844, deviceScaleFactor: 1, mobile: true });

  const report = [];
  for (const route of ROUTES) {
    await send("Page.navigate", { url: BASE + route });
    await sleep(3500);
    await evalJs(`(() => { const b = Array.from(document.querySelectorAll('.md button')).find(x => /Принимаю/.test(x.innerText) || x.getAttribute('aria-label')==='Закрыть'); if (b) b.click(); return true; })()`);
    await sleep(2500);
    const res = await evalJs(`(() => {
      const small = [];
      const unnamed = [];
      for (const el of document.querySelectorAll('button, a[href], [role=button], input[type=checkbox], input[type=color]')) {
        // У чекбокса целью нажатия считается его label
        const target = el.type === 'checkbox' ? (el.closest('label') || el) : el;
        const r = target.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const cs = getComputedStyle(target);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        const name = (el.getAttribute('aria-label') || el.closest('label')?.innerText || el.innerText || el.getAttribute('title') || '').trim();
        if (!name) unnamed.push(el.tagName + '.' + String(el.className || '').slice(0, 30));
        // Ссылки внутри текста исключаются из правила
        const inText = el.closest('p, .rhero-desc, .comment-text');
        if (!inText && (r.width < 24 || r.height < 24)) {
          small.push({ tag: el.tagName, cls: String(el.className || '').slice(0, 32), w: Math.round(r.width), h: Math.round(r.height), name: name.slice(0, 20) });
        }
      }
      return { small: small.slice(0, 10), unnamed: unnamed.slice(0, 10) };
    })()`);
    if (res && (res.small.length || res.unnamed.length)) report.push({ route, ...res });
  }
  console.log(JSON.stringify(report, null, 1));
  ws.close();
  chrome.kill();
}
main().catch((e) => { console.error(e); process.exit(1); });
