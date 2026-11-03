// Разбор меню скорости в обычном плеере: где пункты и куда попадает клик.
// node scripts/speed-ui-probe.cjs
const { spawn } = require("node:child_process");
const { join } = require("node:path");

const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.ANIX_URL || "http://localhost:3000";
const PORT = 9347;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${join(process.env.TEMP || ".", "anix-speed-ui")}`,
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let targets = null;
  for (let i = 0; i < 60; i++) {
    try {
      targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      if (targets?.length) break;
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
  const evalJs = async (expression) => {
    const r = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails)
      return { __error: String(r.exceptionDetails.exception?.description).slice(0, 200) };
    return r.result?.value;
  };
  const click = async (point) => {
    if (!point) return false;
    for (const type of ["mousePressed", "mouseReleased"]) {
      await send("Input.dispatchMouseEvent", {
        type, x: point.x, y: point.y, button: "left", clickCount: 1,
      });
    }
    return true;
  };

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
  });

  await send("Page.navigate", { url: BASE + "/" });
  await sleep(1200);
  await evalJs(`(() => {
    const p = JSON.parse(localStorage.getItem('preferences') || '{}');
    p.state = p.state || {};
    p.state.params = { ...(p.state.params || {}), isFirstLaunch: false, experimental: { newPlayer: false } };
    localStorage.setItem('preferences', JSON.stringify(p));
    localStorage.setItem('player-preferences', JSON.stringify({ state: { voiceover: {}, player: {}, playbackRate: 1, rememberPlaybackRate: true, version: 1 }, version: 0 }));
    return true;
  })()`);
  await send("Page.navigate", { url: BASE + "/release/18439" });
  await sleep(7000);

  const before = await evalJs(`(() => {
    const chip = Array.from(document.querySelectorAll('button')).find(b => /^Скорость:/.test(b.innerText.trim()));
    const r = chip && chip.getBoundingClientRect();
    const hit = r ? document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) : null;
    return {
      chip: chip && chip.innerText.trim(),
      expanded: chip && chip.getAttribute('aria-expanded'),
      rect: r && { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      modal: Boolean(document.querySelector('.md')),
      hit: hit ? (hit.tagName + '.' + String(hit.className).slice(0, 40)) : null,
    };
  })()`);

  // Журнал изменений перекрывает страницу: закрываем, иначе клик мышью не доходит
  if (before?.modal) {
    await evalJs(`(() => { const b = document.querySelector('.md .mb-close'); if (b) b.click(); return true; })()`);
    await sleep(700);
  }

  // Клик по чипу настоящей мышью
  const chipPoint = before?.rect && {
    x: Math.round(before.rect.x + before.rect.w / 2),
    y: Math.round(before.rect.y + before.rect.h / 2),
  };
  const clickedChip = await click(chipPoint);
  await sleep(900);

  const opened = await evalJs(`(() => {
    const chip = Array.from(document.querySelectorAll('button')).find(b => /^Скорость:/.test(b.innerText.trim()));
    const items = Array.from(document.querySelectorAll('[role=menuitem]'));
    const menus = Array.from(document.querySelectorAll('[role=menu]'));
    return {
      expanded: chip && chip.getAttribute('aria-expanded'),
      menuCount: menus.length,
      items: items.length,
      sample: items.slice(0, 4).map(x => {
        const r = x.getBoundingClientRect();
        return { text: x.innerText.trim(), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
      }),
    };
  })()`);

  let picked = null;
  const item = await evalJs(`(() => {
    const el = Array.from(document.querySelectorAll('[role=menuitem]')).find(x => x.innerText.trim() === '2.5×');
    if (!el) return null;
    el.scrollIntoView({ block: 'center' });
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) };
  })()`);
  if (item) {
    picked = await click({ x: item.x, y: item.y });
    await sleep(1200);
  }

  const after = await evalJs(`(() => {
    const v = document.querySelector('.player-frame video');
    const chip = Array.from(document.querySelectorAll('button')).find(b => /^Скорость:/.test(b.innerText.trim()));
    return {
      rate: v && v.playbackRate,
      stored: JSON.parse(localStorage.getItem('player-preferences') || '{}').state?.playbackRate,
      chip: chip && chip.innerText.trim(),
      itemsNow: document.querySelectorAll('[role=menuitem]').length,
    };
  })()`);

  console.log(JSON.stringify({ before, clickedChip, opened, item, picked, after }, null, 1));
  ws.close();
  chrome.kill();
})().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
