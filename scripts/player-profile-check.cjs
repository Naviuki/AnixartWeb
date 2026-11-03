// Проверки плеера и профиля: скорости, флаги, комментарии.
// node scripts/player-profile-check.cjs
const { spawn } = require("node:child_process");
const { join } = require("node:path");

const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.ANIX_URL || "http://localhost:3000";
const PARSER = process.env.NEXT_PUBLIC_PLAYER_PARSER_URL || "http://localhost:7000";
const PORT = 9343;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const chrome = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${join(process.env.TEMP || "C:\\Windows\\Temp", "anix-player")}`,
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
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  };
  const send = (method, params = {}) => new Promise((res) => {
    const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params }));
  });
  const evalJs = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) return { __error: String(r.exceptionDetails.exception?.description).slice(0, 200) };
    return r.result?.value;
  };
  const go = async (route, settle = 4000) => {
    await send("Page.navigate", { url: BASE + route });
    await sleep(800);
    for (let i = 0; i < 25; i++) {
      const ready = await evalJs(`Boolean(document.querySelector('.app main') && (document.querySelector('.app main').innerText || '').trim().length > 40)`);
      if (ready === true) break;
      await sleep(400);
    }
    await sleep(settle);
  };

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

  const results = [];
  const check = (name, ok, detail) => results.push({ name, ok: Boolean(ok), detail });

  // Обычный плеер: полный набор скоростей
  await go("/");
  await evalJs(`(() => {
    const p = JSON.parse(localStorage.getItem('preferences') || '{}');
    p.state = p.state || {};
    p.state.params = { ...(p.state.params || {}), isFirstLaunch: false, experimental: { newPlayer: false } };
    localStorage.setItem('preferences', JSON.stringify(p));
    return true;
  })()`);
  await go("/release/18439", 5000);

  const rates = await evalJs(`(async () => {
    const chip = Array.from(document.querySelectorAll('button')).find(b => /^Скорость:/.test(b.innerText.trim()));
    if (!chip) return null;
    chip.click();
    await new Promise(r => setTimeout(r, 700));
    return Array.from(document.querySelectorAll('[role=menuitem]'))
      .map(x => x.innerText.trim()).filter(t => /×$/.test(t));
  })()`);
  check(
    "обычный плеер: скорости до 4×",
    Array.isArray(rates) && rates.includes("2.25×") && rates.includes("4×") && rates.length === 16,
    Array.isArray(rates) ? `${rates.length} вариантов, есть 2.25×: ${rates.includes("2.25×")}` : String(rates)
  );

  // Сохранение скорости выше 2×
  const saved = await evalJs(`(() => {
    localStorage.setItem('player-preferences', JSON.stringify({ state: { voiceover: {}, player: {}, playbackRate: 2.25, rememberPlaybackRate: true, version: 1 }, version: 0 }));
    return true;
  })()`);
  await go("/release/18439", 4500);
  const applied = await evalJs(`(() => {
    const chip = Array.from(document.querySelectorAll('button')).find(b => /^Скорость:/.test(b.innerText.trim()));
    const stored = JSON.parse(localStorage.getItem('player-preferences') || '{}').state.playbackRate;
    return { chip: chip && chip.innerText.trim(), stored };
  })()`);
  check(
    "скорость 2.25× применяется и хранится",
    applied && applied.stored === 2.25 && applied.chip === "Скорость: 2.25×",
    JSON.stringify(applied)
  );

  // Флаг страны в «О тайтле»
  const flag = await evalJs(`(() => {
    const svg = document.querySelector('.infocell .infocell-v svg');
    const rect = svg && svg.getBoundingClientRect();
    return { exists: Boolean(svg), w: rect && Math.round(rect.width), h: rect && Math.round(rect.height) };
  })()`);
  check(
    "в «О тайтле» виден флаг (SVG)",
    flag && flag.exists && flag.w >= 14 && flag.h >= 10,
    JSON.stringify(flag)
  );

  // Комментарии в профиле
  const comments = await evalJs(`(async () => {
    location.href = '/profile/4893262';
    return true;
  })()`);
  await sleep(6000);
  const commentState = await evalJs(`(async () => {
    const tab = Array.from(document.querySelectorAll('button')).find(b => /Комментарии/.test(b.innerText));
    if (tab) tab.click();
    await new Promise(r => setTimeout(r, 700));
    return {
      count: document.querySelectorAll('.comment').length,
      first: (document.querySelector('.comment')?.innerText || '').replace(/\\s+/g, ' ').slice(0, 40),
    };
  })()`);
  check(
    "комментарии в профиле видны",
    commentState && commentState.count > 0,
    JSON.stringify(commentState)
  );

  // Встроенный плеер: парсер отвечает и ошибка объясняет причину
  await evalJs(`(() => {
    const p = JSON.parse(localStorage.getItem('preferences') || '{}');
    p.state.params = { ...(p.state.params || {}), experimental: { newPlayer: true } };
    localStorage.setItem('preferences', JSON.stringify(p));
    return true;
  })()`);
  await go("/release/18439", 6000);
  // Ждём, пока плеер получит ответ парсера (успех или понятную ошибку)
  let builtIn = null;
  for (let i = 0; i < 25; i++) {
    builtIn = await evalJs(`(async () => {
      const ctrl = document.querySelector('media-controller');
      if (!ctrl) return { hasPlayer: false, text: '' };
      const more = Array.from(document.querySelectorAll('button')).find(b => /Подробнее/.test(b.innerText));
      if (more) { more.click(); await new Promise(r => setTimeout(r, 300)); }
      return {
        hasPlayer: true,
        text: ctrl.innerText.replace(/\\s+/g, ' ').slice(0, 200),
      };
    })()`);
    if (builtIn && /Источник не отдал видео|KODIK|SIBNET|LIBRIA/.test(builtIn.text)) break;
    await sleep(1000);
  }
  check(
    "встроенный плеер: причина ошибки понятна",
    builtIn &&
      builtIn.hasPlayer &&
      /Источник не отдал видео|KODIK|SIBNET|LIBRIA/.test(builtIn.text),
    builtIn && builtIn.text
  );

  let parserAlive = false;
  try {
    const r = await fetch(`${PARSER}/?player=kodik`, { signal: AbortSignal.timeout(5000) });
    parserAlive = r.status === 400;
  } catch {
    parserAlive = false;
  }
  check("парсер источников запущен", parserAlive, PARSER);

  console.log(JSON.stringify({ results }, null, 1));
  ws.close();
  chrome.kill();
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
