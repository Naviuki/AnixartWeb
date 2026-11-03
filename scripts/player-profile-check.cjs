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
  // Настоящий клик мышью: синтетический .click() не всегда открывает меню Flowbite
  const clickBy = async (finder) => {
    const point = await evalJs(`(() => {
      const el = ${finder};
      if (!el) return null;
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
    })()`);
    if (!point) return false;
    for (const type of ["mousePressed", "mouseReleased"]) {
      await send("Input.dispatchMouseEvent", {
        type, x: point.x, y: point.y, button: "left", clickCount: 1,
      });
    }
    return true;
  };
  const clickChip = () =>
    clickBy(`Array.from(document.querySelectorAll('button')).find(b => /^Скорость:/.test(b.innerText.trim()))`);
  const clickRateItem = (label) =>
    clickBy(`Array.from(document.querySelectorAll('[role=menuitem]')).find(x => x.innerText.trim() === ${JSON.stringify(label)})`);

  const go = async (route, settle = 4000) => {
    await send("Page.navigate", { url: BASE + route });
    await sleep(800);
    for (let i = 0; i < 25; i++) {
      const ready = await evalJs(`Boolean(document.querySelector('.app main') && (document.querySelector('.app main').innerText || '').trim().length > 40)`);
      if (ready === true) break;
      await sleep(400);
    }
    await sleep(settle);
    // Журнал изменений перекрывает страницу: закрываем, иначе клик мышью не дойдёт
    await evalJs(`(() => { const b = document.querySelector('.md .mb-close'); if (b) b.click(); return true; })()`);
    await sleep(500);
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
    // Замер темпа начинаем с 1×, иначе сравнение с 2.5× ничего не покажет
    localStorage.setItem('player-preferences', JSON.stringify({ state: { voiceover: {}, player: {}, playbackRate: 1, rememberPlaybackRate: true, version: 1 }, version: 0 }));
    return true;
  })()`);
  await go("/release/18439", 5000);

  const ratesOpened = await clickChip();
  await sleep(700);
  const rates = await evalJs(`Array.from(document.querySelectorAll('[role=menuitem]'))
      .map(x => x.innerText.trim()).filter(t => /×$/.test(t))`);
  check(
    "обычный плеер: скорости до 4×",
    ratesOpened && Array.isArray(rates) && rates.includes("2.25×") && rates.includes("4×") && rates.length === 16,
    Array.isArray(rates) ? `${rates.length} вариантов, есть 2.25×: ${rates.includes("2.25×")}` : String(rates)
  );

  // Скорость меняется по-настоящему: клик мышью по меню -> playbackRate и темп
  // Меню после проверки списка осталось открытым — закрываем повторным кликом
  await clickChip();
  await sleep(600);

  // Ждём прямой поток: только в своём <video> скорость реально работает
  let direct = null;
  for (let i = 0; i < 30; i++) {
    direct = await evalJs(`(() => {
      const v = document.querySelector('.player-frame video');
      return v
        ? { native: true, duration: Number(v.duration) || 0, ready: v.readyState }
        : { native: false, iframe: Boolean(document.querySelector('.player-frame iframe')) };
    })()`);
    if (direct && direct.native && direct.duration > 0) break;
    await sleep(1000);
  }
  check(
    "обычный плеер играет прямой поток своим <video>",
    direct && direct.native && direct.duration > 0,
    JSON.stringify(direct)
  );

  if (direct && direct.native) {
    // Воспроизводим без звука и замеряем темп на 1×, затем на 2.5×
    const baseline = await evalJs(`(async () => {
      const v = document.querySelector('.player-frame video');
      v.muted = true;
      try { await v.play(); } catch {}
      await new Promise(r => setTimeout(r, 1500));
      const wall = performance.now();
      const t1 = v.currentTime;
      await new Promise(r => setTimeout(r, 2500));
      const elapsed = (performance.now() - wall) / 1000;
      return {
        effective: Math.round(((v.currentTime - t1) / elapsed) * 100) / 100,
        advanced: Math.round((v.currentTime - t1) * 100) / 100,
        rate: v.playbackRate,
      };
    })()`);

    const opened = await clickChip();
    await sleep(800);
    const picked = await clickRateItem("2.5×");
    await sleep(1500);

    const after = await evalJs(`(async () => {
      const v = document.querySelector('.player-frame video');
      const wall = performance.now();
      const t1 = v.currentTime;
      await new Promise(r => setTimeout(r, 3000));
      const elapsed = (performance.now() - wall) / 1000;
      const stored = JSON.parse(localStorage.getItem('player-preferences') || '{}').state?.playbackRate;
      return {
        effective: Math.round(((v.currentTime - t1) / elapsed) * 100) / 100,
        advanced: Math.round((v.currentTime - t1) * 100) / 100,
        rate: v.playbackRate,
        stored,
        chip: (Array.from(document.querySelectorAll('button')).find(b => /^Скорость:/.test(b.innerText.trim())) || {}).innerText,
      };
    })()`);

    check(
      "скорость 2.5× реально ускоряет видео",
      opened && picked && after && after.rate === 2.5 && after.stored === 2.5 &&
        after.effective > 1.8 && baseline && baseline.effective < 1.4,
      JSON.stringify({ baseline, opened, picked, after })
    );
  }

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

  // Флаг страны в «О тайтле»: он стоит в плашке слева, а не в строке значения
  const flag = await evalJs(`(() => {
    const badge = document.querySelector('.infocell .infocell-ic svg');
    const inValue = document.querySelector('.infocell .infocell-v svg');
    const rect = badge && badge.getBoundingClientRect();
    return {
      inBadge: Boolean(badge),
      inValue: Boolean(inValue),
      w: rect && Math.round(rect.width),
      h: rect && Math.round(rect.height),
    };
  })()`);
  check(
    "в «О тайтле» флаг стоит в плашке слева",
    flag && flag.inBadge && !flag.inValue && flag.w >= 14 && flag.h >= 10,
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
  // Ждём, пока плеер получит ответ парсера: видео или понятную ошибку
  let builtIn = null;
  for (let i = 0; i < 30; i++) {
    builtIn = await evalJs(`(async () => {
      const ctrl = document.querySelector('media-controller');
      if (!ctrl) return { hasPlayer: false, text: '', playing: false };
      const more = Array.from(document.querySelectorAll('button')).find(b => /Подробнее/.test(b.innerText));
      if (more) { more.click(); await new Promise(r => setTimeout(r, 300)); }
      const video = ctrl.querySelector('video, hls-video, video-js');
      return {
        hasPlayer: true,
        video: Boolean(video),
        duration: video ? Number(video.duration) || 0 : 0,
        src: video ? String(video.currentSrc || video.src || '').slice(0, 70) : null,
        text: ctrl.innerText.replace(/\\s+/g, ' ').slice(0, 200),
      };
    })()`);
    if (builtIn && (builtIn.duration > 0 || /Источник не отдал видео|KODIK|SIBNET|LIBRIA/.test(builtIn.text))) break;
    await sleep(1000);
  }
  check(
    "встроенный плеер: играет поток или объясняет отказ",
    builtIn && builtIn.hasPlayer &&
      (builtIn.duration > 0 || /Источник не отдал видео|KODIK|SIBNET|LIBRIA/.test(builtIn.text)),
    JSON.stringify(builtIn && { video: builtIn.video, duration: builtIn.duration, src: builtIn.src, text: builtIn.text })
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
