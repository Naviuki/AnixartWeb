// Проверка устойчивости: битые данные в localStorage не должны давать белый экран.
// node scripts/storage-check.cjs
const { spawn } = require("node:child_process");
const { join } = require("node:path");

const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.ANIX_URL || "http://localhost:3000";
const PORT = 9342;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Наборы «плохих» данных: старый формат, null, чужие типы
const CASES = [
  {
    name: "подписки: null и без since",
    key: "notifications",
    value: {
      state: {
        subs: {
          "2013": null,
          "2458": { title: null, since: "abc", lastRelatedCount: "x" },
        },
        notices: null,
        lastCheck: 0,
      },
      version: 0,
    },
  },
  {
    name: "подписки: битый JSON",
    key: "notifications",
    raw: "{not json",
  },
  {
    name: "настройки: appearance отсутствует",
    key: "preferences",
    value: { state: { params: { isFirstLaunch: false } }, version: 2 },
  },
  {
    name: "настройки: акцент мусором",
    key: "preferences",
    value: {
      state: {
        params: { isFirstLaunch: false },
        appearance: { acc: "javascript:alert(1)", customAccents: "nope", theme: "dark" },
      },
      version: 2,
    },
  },
  {
    name: "настройки: битый JSON",
    key: "preferences",
    raw: "{{",
  },
];

const ROUTES = ["/", "/notifications", "/discovery", "/release/2013", "/profile/3610931", "/about", "/collections"];

async function main() {
  const chrome = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${join(process.env.TEMP || "C:\\Windows\\Temp", "anix-storage")}`,
    "about:blank",
  ], { stdio: "ignore" });

  let targets = null;
  for (let i = 0; i < 60; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (targets?.length) break; } catch {}
    await sleep(300);
  }
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let seq = 0;
  const pending = new Map();
  const errors = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); return; }
    if (m.method === "Runtime.exceptionThrown") {
      errors.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || "").slice(0, 160));
    }
  };
  const send = (method, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });
  const evalJs = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    return r.result?.value;
  };

  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: BASE + "/" });
  await sleep(3000);

  const results = [];
  for (const testCase of CASES) {
    await evalJs(`(() => {
      localStorage.clear();
      ${testCase.raw ? `localStorage.setItem(${JSON.stringify(testCase.key)}, ${JSON.stringify(testCase.raw)});` : `localStorage.setItem(${JSON.stringify(testCase.key)}, ${JSON.stringify(JSON.stringify(testCase.value))});`}
      return true;
    })()`);

    for (const route of ROUTES) {
      errors.length = 0;
      await send("Page.navigate", { url: BASE + route });
      await sleep(2600);
      const state = await evalJs(`({
        app: Boolean(document.querySelector('.app')),
        textLen: (document.body.innerText || '').trim().length,
        invalidDate: /Invalid Date|NaN/.test(document.body.innerText || ''),
      })`);
      const crashed = !state.app || state.textLen < 40;
      if (crashed || state.invalidDate || errors.length) {
        results.push({
          case: testCase.name,
          route,
          crashed,
          invalidDate: state.invalidDate,
          textLen: state.textLen,
          errors: errors.slice(0, 2),
        });
      }
    }
  }

  console.log(
    results.length === 0 ?
      `устойчивость: ${CASES.length} наборов битых данных × ${ROUTES.length} страниц — без падений`
    : JSON.stringify(results, null, 1)
  );
  ws.close();
  chrome.kill();
}
main().catch((e) => { console.error(e); process.exit(1); });
