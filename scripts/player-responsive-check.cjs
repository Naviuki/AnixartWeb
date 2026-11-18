// Адаптивность нового плеера: узкие экраны, поворот, DPI и масштаб.
// Проверяются переполнение, доступность органов управления и влезание меню.
// Нужны запущенные http://localhost:3000 и парсер на порту 7000.
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const BASE = process.env.ANIX_URL || "http://localhost:3000";
const PORT = 9355;
const RELEASE = "/release/18439";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Ширина, высота, DPI, масштаб интерфейса (как зум браузера), сенсорный экран
const VIEWPORTS = [
  { name: "телефон 320", width: 320, height: 568, dpi: 2, zoom: 1, touch: true },
  { name: "телефон 390", width: 390, height: 844, dpi: 3, zoom: 1, touch: true },
  { name: "телефон боком", width: 568, height: 320, dpi: 2, zoom: 1, touch: true },
  { name: "телефон 390, зум 1.5", width: 390, height: 844, dpi: 3, zoom: 1.5, touch: true },
  { name: "планшет", width: 768, height: 1024, dpi: 2, zoom: 1, touch: true },
  { name: "планшет боком", width: 1024, height: 768, dpi: 1, zoom: 1, touch: true },
  { name: "десктоп", width: 1280, height: 800, dpi: 1, zoom: 1, touch: false },
  { name: "десктоп, зум 1.5", width: 1280, height: 800, dpi: 1, zoom: 1.5, touch: false },
];

const report = (evaluate, viewport) => `(() => {
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const overflow = document.documentElement.scrollWidth - vw;
  const offenders = [];
  for (const el of document.querySelectorAll('body *')) {
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true })) continue;
    if (getComputedStyle(el).position === 'fixed') continue;
    if (rect.right <= vw + 1) continue;
    if (el.closest('.swiper, .railrow, .chiprow')) continue;
    if (el.classList.contains('hero-bg')) continue;
    let parent = el.parentElement;
    let scrollable = false;
    while (parent) {
      const style = getComputedStyle(parent);
      if (style.overflowX === 'auto' || style.overflowX === 'scroll') { scrollable = true; break; }
      parent = parent.parentElement;
    }
    if (scrollable) continue;
    offenders.push(el.outerHTML.slice(0, 140) + ' << ' + String(el.parentElement?.outerHTML || '').slice(0, 60));
  }

  const frame = document.querySelector('.player-frame')?.getBoundingClientRect();
  const buttons = [...document.querySelectorAll('[class*=media-button]')]
    .filter((node) => node.offsetParent !== null)
    .map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        label: node.getAttribute('aria-label') || node.tagName.toLowerCase(),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
      };
    });
  const bar = document.querySelector('media-control-bar')?.getBoundingClientRect();
  const clipped = buttons.filter((button) => bar && (button.right > bar.right + 1 || button.left < bar.left - 1));

  return {
    viewport: { width: vw, height: vh, ...${JSON.stringify(viewport)} },
    overflow,
    offenders: offenders.slice(0, 6),
    frame: frame && { width: Math.round(frame.width), height: Math.round(frame.height) },
    buttons,
    clipped,
    bar: bar && { left: Math.round(bar.left), right: Math.round(bar.right), width: Math.round(bar.width) },
    smallButtons: buttons.filter((button) => button.width < ${viewport.touch ? 30 : 20} || button.height < ${viewport.touch ? 30 : 20}),
    taps: ${viewport.touch},
  };
})()`;

async function main() {
  const health = await fetch(`${BASE}/api/version`, { signal: AbortSignal.timeout(10000) });
  assert.equal(health.ok, true, "Сначала нужен работающий локальный сервер");

  const profile = mkdtempSync(join(tmpdir(), "anix-player-responsive-"));
  const chrome = spawn(process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required",
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore" });

  let ws;
  try {
    let page;
    for (let attempt = 0; attempt < 80; attempt++) {
      try {
        const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
        page = targets.find((target) => target.type === "page");
        if (page) break;
      } catch {}
      await sleep(200);
    }
    assert.ok(page, "Chrome DevTools не запустился");

    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    const pending = new Map();
    let sequence = 0;
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
    ws.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (!message.id || !pending.has(message.id)) return;
      const task = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) task.reject(new Error(message.error.message));
      else task.resolve(message.result);
    };
    const evaluate = async (expression) => {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || "Ошибка JavaScript");
      return result.result?.value;
    };
    const waitFor = async (expression, timeout = 60000) => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const value = await evaluate(expression);
        if (value) return value;
        await sleep(250);
      }
      throw new Error(`Не выполнено условие: ${expression}`);
    };

    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
    await send("Page.navigate", { url: BASE });
    await waitFor("document.readyState === 'complete'");
    for (let attempt = 0; attempt < 5; attempt++) {
      await evaluate(`(() => {
        const saved = JSON.parse(localStorage.getItem('preferences') || '{}');
        saved.state = saved.state || {};
        saved.state.params = { ...(saved.state.params || {}), experimental: { newPlayer: true } };
        saved.state.flags = { ...(saved.state.flags || {}), showChangelog: false, saveWatchHistory: false };
        localStorage.setItem('preferences', JSON.stringify(saved));
        return true;
      })()`);
      await send("Page.reload");
      await waitFor("document.readyState === 'complete'");
      await sleep(700);
      if (await evaluate("JSON.parse(localStorage.getItem('preferences') || '{}').state?.params?.experimental?.newPlayer === true")) break;
    }
    assert.equal(
      await evaluate("JSON.parse(localStorage.getItem('preferences') || '{}').state?.params?.experimental?.newPlayer === true"),
      true,
      "Новый плеер не включился"
    );

    const results = [];
    for (const viewport of VIEWPORTS) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: Math.round(viewport.width / viewport.zoom),
        height: Math.round(viewport.height / viewport.zoom),
        deviceScaleFactor: viewport.dpi,
        mobile: viewport.touch,
      });
      await send("Emulation.setTouchEmulationEnabled", { enabled: viewport.touch, maxTouchPoints: viewport.touch ? 5 : 1 });
      await send("Page.navigate", { url: `${BASE}${RELEASE}` });
      await waitFor("!!document.querySelector('media-controller')");
      await evaluate("document.querySelector('.md .mb-close')?.click()");
      await waitFor("(() => { const nodes = [...document.querySelectorAll('[class*=media-button]')]; return nodes.some((node) => node.getBoundingClientRect().width > 0); })()", 30000);
      await sleep(900);

      const snapshot = await evaluate(report(evaluate, viewport));
      // Меню настроек и его подменю тоже обязаны влезать в экран
      const menu = await evaluate(`(async () => {
        const measure = (node) => {
          const rect = node.getBoundingClientRect();
          return {
            left: Math.round(rect.left),
            top: Math.round(rect.top),
            right: Math.round(rect.right),
            bottom: Math.round(rect.bottom),
            view: { width: document.documentElement.clientWidth, height: document.documentElement.clientHeight },
          };
        };
        const button = document.querySelector('[class*=media-settings-menu-button]');
        if (!button) return { error: 'нет кнопки настроек' };
        button.click();
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const panel = document.querySelector('media-settings-menu');
        if (!panel) return { error: 'меню не открылось' };
        const main = measure(panel);
        const item = [...panel.querySelectorAll('media-settings-menu-item')].find((node) => node.querySelector('[slot=submenu]'));
        if (!item) return { error: 'нет подменю', main };
        item.click();
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const submenuNode = item.querySelector('[slot=submenu]');
        const submenu = submenuNode && !submenuNode.hasAttribute('hidden') ? measure(submenuNode) : { error: 'подменю не открылось' };
        button.click();
        return { main, submenu };
      })()`);
      results.push({ ...snapshot, menu });
    }

    console.log(JSON.stringify(results, null, 1));

    for (const result of results) {
      const name = result.viewport.name;
      assert.equal(result.overflow, 0, `${name}: переполнение страницы ${result.overflow}px (${result.offenders.join(", ")})`);
      assert.equal(result.offenders.length, 0, `${name}: вылезают ${result.offenders.join(", ")}`);
      assert.ok(result.buttons.length >= 6, `${name}: органов управления ${result.buttons.length}`);
      assert.equal(result.clipped.length, 0, `${name}: обрезаны ${result.clipped.map((b) => b.label).join(", ")}`);
      assert.equal(result.smallButtons.length, 0, `${name}: мелкие цели ${result.smallButtons.map((b) => `${b.label} ${b.width}x${b.height}`).join(", ")}`);
      assert.equal(result.menu.error, undefined, `${name}: ${result.menu.error}`);
      for (const [label, panel] of [["меню", result.menu.main], ["подменю", result.menu.submenu]]) {
        assert.ok(panel, `${name}: ${label} не измерено`);
        if (panel.error) continue;
        assert.ok(panel.left >= 0 && panel.right <= panel.view.width + 1, `${name}: ${label} вылезает по ширине (${panel.left}..${panel.right} из ${panel.view.width})`);
        assert.ok(panel.top >= 0 && panel.bottom <= panel.view.height + 1, `${name}: ${label} вылезает по высоте (${panel.top}..${panel.bottom} из ${panel.view.height})`);
      }
    }
    console.log("Плеер: переполнений нет, цели не мельче порога, меню влезает на всех экранах");
  } finally {
    ws?.close();
    chrome.kill();
    await sleep(700);
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch (error) {
      console.warn(`Не удалось сразу удалить временный профиль: ${error.message}`);
    }
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
