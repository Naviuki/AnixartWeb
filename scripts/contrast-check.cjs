// Контраст текста на странице: WCAG AA (4.5:1 обычный, 3:1 крупный).
// Запуск: node scripts/contrast-check.cjs [тема]
const { spawn } = require("node:child_process");
const { join } = require("node:path");

const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.ANIX_URL || "http://localhost:3000";
const PORT = 9339;
const theme = process.argv[2] || "dark";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ROUTES = ["/", "/discovery", "/release/2013", "/profile/3610931", "/about"];

async function main() {
  const chrome = spawn(
    CHROME,
    [
      "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${join(process.env.TEMP || "C:\\Windows\\Temp", "anix-contrast")}`,
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
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: BASE + "/" });
  await sleep(4000);
  await evalJs(`(() => {
    const p = JSON.parse(localStorage.getItem('preferences') || '{}');
    p.state = p.state || {};
    p.state.params = { ...(p.state.params || {}), isFirstLaunch: false };
    p.state.appearance = { ...(p.state.appearance || {}), theme: '${theme}' };
    localStorage.setItem('preferences', JSON.stringify(p));
    return true;
  })()`);

  const report = [];
  for (const route of ROUTES) {
    await send("Page.navigate", { url: BASE + route });
    await sleep(4000);
    // Открываем панель вида, чтобы проверить и её
    await evalJs(`(() => { const b = Array.from(document.querySelectorAll('button, .nav-item')).find(x => /^Вид$/.test((x.innerText||'').trim())); b && b.click(); return true; })()`);
    await sleep(800);
    const res = await evalJs(`(() => {
      const parse = (c) => {
        const rgb = c.match(/rgba?\\(([^)]+)\\)/);
        if (!rgb) {
          const srgb = c.match(/color\\(srgb ([^)]+)\\)/);
          if (!srgb) return null;
          const p = srgb[1].split(/[\\s/]+/).filter(Boolean).map(Number);
          return { r: Math.round(p[0] * 255), g: Math.round(p[1] * 255), b: Math.round(p[2] * 255), a: p.length > 3 ? p[3] : 1 };
        }
        const p = rgb[1].split(',').map(Number);
        return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
      };
      const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const bgOf = (el) => {
        let node = el;
        while (node) {
          const cs = getComputedStyle(node);
          // Градиент или картинка на фоне: контраст по цвету не посчитать, пропускаем
          if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
          const c = parse(cs.backgroundColor);
          if (c && c.a > 0.5) return c;
          node = node.parentElement;
        }
        return parse(getComputedStyle(document.body).backgroundColor) || { r: 0, g: 0, b: 0, a: 1 };
      };
      const bad = [];
      for (const el of document.querySelectorAll('body *')) {
        if (!el.childNodes.length) continue;
        const hasText = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
        if (!hasText) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
        const fg = parse(cs.color); if (!fg) continue;
        const bg = bgOf(el);
        if (!bg) continue;
        const L1 = lum(fg), L2 = lum(bg);
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        const size = parseFloat(cs.fontSize);
        const bold = Number(cs.fontWeight) >= 700;
        const large = size >= 24 || (size >= 18.66 && bold);
        const need = large ? 3 : 4.5;
        if (ratio < need) bad.push({ text: el.innerText.trim().slice(0, 28), ratio: Math.round(ratio * 100) / 100, need, size, cls: String(el.className || '').slice(0, 28), tag: el.tagName, color: cs.color, bg: 'rgb(' + bg.r + ',' + bg.g + ',' + bg.b + ')', html: el.outerHTML.slice(0, 160) });
      }
      return bad.slice(0, 12);
    })()`);
    if (res && res.length) report.push({ route, theme, bad: res });
  }
  console.log(JSON.stringify(report, null, 1));
  ws.close();
  chrome.kill();
}
main().catch((e) => { console.error(e); process.exit(1); });
