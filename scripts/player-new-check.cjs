// Новый плеер с локальными медиа: управление, качество, серии, PiP, полный экран и ошибки
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const { startPlayerTestMedia } = require("./player-test-media.cjs");

const PORT = 9431;
const MEDIA_PORT = 9432;
const BASE = process.env.ANIX_URL || "http://localhost:3000";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const health = await fetch(`${BASE}/api/version`, { signal: AbortSignal.timeout(10000) });
  assert.equal(health.ok, true, "нужен запущенный локальный сервер");
  const media = await startPlayerTestMedia(MEDIA_PORT);
  const profile = mkdtempSync(join(tmpdir(), "anix-newplayer-"));
  const chrome = spawn("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--mute-audio", "--autoplay-policy=no-user-gesture-required",
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore" });
  let ws;
  const results = {};
  try {
    let page;
    for (let i = 0; i < 80; i++) {
      try {
        const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
        page = targets.find((t) => t.type === "page");
        if (page) break;
      } catch {}
      await sleep(200);
    }
    assert.ok(page);
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let sequence = 0;
    const pending = new Map();
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
    // Парсер источников подменяется только в сценарии ошибки в конце проверки
    let failParser = false;
    const catalog = {
      "episode/18439": {
        code: 0,
        types: [{ id: 9, name: "Локальный тест", icon: "", episodes_count: 2, view_count: 0, pinned: false }],
      },
      "episode/18439/9": { code: 0, sources: [{ id: 9, name: "Kodik", episodes_count: 2 }] },
      "episode/18439/9/9": {
        code: 0,
        episodes: [
          { position: 1, name: "HLS-серия", url: `http://127.0.0.1:${MEDIA_PORT}/sample.m3u8` },
          { position: 2, name: "MP4-серия", url: `http://127.0.0.1:${MEDIA_PORT}/sample.mp4` },
        ],
      },
      "release/streaming/platform/18439": { code: 0, content: [] },
    };
    ws.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.id && pending.has(message.id)) {
        const task = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) task.reject(new Error(message.error.message));
        else task.resolve(message.result);
        return;
      }
      if (message.method === "Fetch.requestPaused") {
        const { requestId, request } = message.params;
        const url = new URL(request.url);
        if (failParser && url.port === "7000") {
          send("Fetch.fulfillRequest", {
            requestId,
            responseCode: 503,
            responseHeaders: [
              { name: "Content-Type", value: "application/json" },
              { name: "Access-Control-Allow-Origin", value: "*" },
            ],
            body: Buffer.from(JSON.stringify({ message: "KODIK: Тестовый источник недоступен" })).toString("base64"),
          }).catch(() => {});
          return;
        }
        const path = url.pathname.replace(/^\/api\/proxy\//, "");
        if (catalog[path]) {
          send("Fetch.fulfillRequest", {
            requestId,
            responseCode: 200,
            responseHeaders: [{ name: "Content-Type", value: "application/json" }],
            body: Buffer.from(JSON.stringify(catalog[path])).toString("base64"),
          }).catch(() => {});
        } else {
          send("Fetch.continueRequest", { requestId }).catch(() => {});
        }
      }
    };
    const evaluate = async (expression) => {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || "Ошибка JavaScript");
      return result.result?.value;
    };
    const waitFor = async (expression, timeout = 45000) => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const value = await evaluate(expression);
        if (value) return value;
        await sleep(250);
      }
      throw new Error(`Не выполнено условие: ${expression}`);
    };
    const video = `(() => { const h = document.querySelector('#video-element'); return h?.shadowRoot?.querySelector('video') || h; })()`;
    const realClick = async (selector) => {
      const point = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
      assert.ok(point, `кнопка доступна: ${selector}`);
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 });
    };

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Page.navigate", { url: BASE });
    await waitFor("document.readyState === 'complete'");
    await evaluate(`(() => {
      const prefs = JSON.parse(localStorage.getItem('preferences') || '{}');
      prefs.state = prefs.state || {};
      prefs.state.flags = { ...(prefs.state.flags || {}), showChangelog: false, saveWatchHistory: false };
      prefs.state.params = { ...(prefs.state.params || {}), isFirstLaunch: false, experimental: { newPlayer: true } };
      localStorage.setItem('preferences', JSON.stringify(prefs));
      localStorage.removeItem('player-preferences');
      return true;
    })()`);
    await send("Page.reload");
    await waitFor("document.readyState === 'complete'");
    await send("Fetch.enable", { patterns: [{ urlPattern: "*api/proxy/*" }, { urlPattern: "*localhost:7000/*" }] });
    await send("Page.navigate", { url: `${BASE}/release/18439` });
    await waitFor("document.readyState === 'complete'");
    for (let i = 0; i < 20; i++) {
      if (await evaluate(`!!document.querySelector('#video-element')`)) break;
      await evaluate(`[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Принимаю')?.click()`);
      await sleep(500);
    }
    // Ждём, пока плеер смонтируется (видео ещё может быть в состоянии ошибки)
    await waitFor(`!!document.querySelector('.player-frame media-controller')`, 60000);
    await evaluate(`new Promise((r) => setTimeout(r, 1500))`);
    // Как только каталог отдан, новый плеер показывает поверх кадра меню выбора
    // источника (скрытое, пока нет курсора). Закрываем его кнопкой настроек
    // настоящим кликом мыши — так же, как это делает человек
    await evaluate(`document.querySelector('.player-frame')?.scrollIntoView({ block: 'center' })`);
    await sleep(500);
    const buttonPoint = await evaluate(`(() => { const b = document.querySelector('[class*=media-settings-menu-button]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
    if (buttonPoint) {
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: buttonPoint.x, y: buttonPoint.y });
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x: buttonPoint.x, y: buttonPoint.y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: buttonPoint.x, y: buttonPoint.y, button: "left", clickCount: 1 });
    }
    await sleep(800);
    // Диалог выбора озвучки открыт поверх кадра: выбираем озвучку, как человек
    // (её может и не быть — тогда каталог уже собрался сам)
    await evaluate(`(() => {
      const dialog = document.querySelector('#source');
      const button = dialog && [...dialog.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Локальный тест'));
      button?.click();
      return Boolean(button);
    })()`);
    await sleep(1200);
    // Ссылка на поток приходит через парсер: ждём готовое видео, а не элемент
    await waitFor(`(() => { const v = ${video}; return v && v.readyState >= 1; })()`, 90000);
    results.media = await evaluate(`(() => {
      const h = document.querySelector('#video-element');
      return h ? h.tagName : null;
    })()`);
    assert.ok(results.media, "видео-элемент смонтирован и ссылка на поток получена");

    // Полоса управления появляется, когда курсор над кадром
    const framePoint = await evaluate(`(() => { const f = document.querySelector('.player-frame'); f.scrollIntoView({ block: 'center' }); const r = f.getBoundingClientRect(); return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: framePoint.x, y: framePoint.y });
    await sleep(400);
    await evaluate(`(() => { const v = ${video}; v.muted = true; return true })()`);

    // 1. Воспроизведение и пауза кнопкой
    await evaluate(`document.querySelector('media-play-button')?.click()`);
    await waitFor(`(() => ${video}?.paused === false)()`, 10000);
    await sleep(1500);
    const playedTo = await evaluate(`${video}.currentTime`);
    assert.ok(playedTo > 0.3, `видео играет (${playedTo})`);
    await evaluate(`document.querySelector('media-play-button')?.click()`);
    await waitFor(`(() => ${video}?.paused === true)()`, 10000);
    results.play = { playedTo: Math.round(playedTo * 10) / 10 };

    // 2. Перемотка кнопками
    await evaluate(`(() => { ${video}.currentTime = 30; return true })()`);
    await sleep(400);
    await evaluate(`document.querySelector('media-seek-forward-button')?.click()`);
    await sleep(800);
    const forward = await evaluate(`${video}.currentTime`);
    assert.ok(forward > 31, `вперёд: 30 → ${forward}`);
    await evaluate(`document.querySelector('media-seek-backward-button')?.click()`);
    await sleep(800);
    const backward = await evaluate(`${video}.currentTime`);
    assert.ok(backward < forward, `назад: ${forward} → ${backward}`);
    results.seek = { forward: Math.round(forward), backward: Math.round(backward) };

    // 3. Громкость и звук
    await evaluate(`(() => { ${video}.volume = 0.5; ${video}.muted = false; return true })()`);
    const volume = await evaluate(`${video}.volume`);
    assert.equal(volume, 0.5);
    await evaluate(`document.querySelector('media-mute-button')?.click()`);
    await waitFor(`(() => ${video}?.muted === true)()`, 5000);
    await evaluate(`document.querySelector('media-mute-button')?.click()`);
    await waitFor(`(() => ${video}?.muted === false)()`, 5000);
    results.volume = { volume };

    // 4. Скорость через меню настроек
    const openMenu = async (label) => {
      if (await evaluate(`document.querySelector('#settings')?.hasAttribute('hidden')`)) {
        await evaluate(`document.querySelector('[class*=media-settings-menu-button]')?.click()`);
      }
      await waitFor(`(() => { const m = document.querySelector('#settings'); return m && !m.hasAttribute('hidden'); })()`, 8000);
      const clicked = await evaluate(`(() => {
        const item = [...document.querySelectorAll('#settings media-settings-menu-item')]
          .find((i) => (i.textContent || '').includes(${JSON.stringify(label)}));
        item?.click();
        return !!item;
      })()`);
      assert.ok(clicked, `в меню есть пункт «${label}»`);
      await sleep(600);
    };
    await openMenu("Скорость");
    const rate = await evaluate(`(() => {
      const sub = document.querySelector('#settings [slot=submenu]:not([hidden])');
      const items = [...sub.querySelectorAll('media-chrome-menu-item')];
      const target = items.find((i) => i.textContent.trim() === '1.5×');
      target?.click();
      return target ? target.textContent.trim() : null;
    })()`);
    assert.equal(rate, "1.5×", "выбрана скорость 1.5×");
    await sleep(800);
    const appliedRate = await evaluate(`${video}.playbackRate`);
    assert.ok(Math.abs(appliedRate - 1.5) < 0.01, `скорость применена к видео (${appliedRate})`);
    const storedRate = await evaluate(`JSON.parse(localStorage.getItem('player-preferences')).state.playbackRate`);
    assert.ok(Math.abs(storedRate - 1.5) < 0.01, `скорость сохранена (${storedRate})`);
    results.rate = { storedRate };

    // 5. Качество: у HLS есть уровни, выбор любого не ломает воспроизведение
    await openMenu("Качество");
    const qualities = await evaluate(`(() => { const sub = document.querySelector('#settings media-rendition-menu:not([hidden])'); return [...(sub?.shadowRoot?.querySelectorAll('media-chrome-menu-item') || [])].map((i) => i.textContent.trim()); })()`);
    results.qualities = qualities;
    assert.ok(qualities.length >= 2, `в меню качества есть варианты: ${qualities.join(", ")}`);
    const low = qualities.find((q) => /^180p$/.test(q)) || qualities.find((q) => /^\d+p$/.test(q));
    assert.ok(low, "в меню есть конкретное разрешение");
    await evaluate(`(() => {
      const sub = document.querySelector('#settings media-rendition-menu:not([hidden])');
      [...(sub?.shadowRoot?.querySelectorAll('media-chrome-menu-item') || [])].find((i) => i.textContent.trim() === ${JSON.stringify(low)})?.click();
      return true;
    })()`);
    await sleep(2500);
    const afterQuality = await evaluate(`(() => { const h = document.querySelector('#video-element'); const v = ${video}; return { height: v.videoHeight, error: v.error?.code || 0, nextLevel: h.api?.nextLevel, selected: h.videoRenditions?.selectedIndex }; })()`);
    assert.equal(afterQuality.error, 0, "после смены качества видео без ошибки");
    assert.equal(afterQuality.nextLevel, 0, "HLS переключён на выбранный уровень 180p");
    results.quality = { low, ...afterQuality };
    const menuHidden = await evaluate(`document.querySelector('#settings')?.hasAttribute('hidden')`);
    assert.equal(menuHidden, true, "меню закрывается после выбора");

    // 6. Переключение серии: HLS → MP4
    if (!(await evaluate(`(() => { const v = ${video}; return v.paused; })()`))) {
      await evaluate(`document.querySelector('media-play-button')?.click()`);
    }
    await evaluate(`[...document.querySelectorAll('media-control-bar button, media-control-bar [class*=media-button]')].find((b) => (b.getAttribute('aria-label') || '').includes('Следующая'))?.click()`);
    await waitFor(`document.querySelector('#video-element')?.tagName === 'VIDEO' && document.querySelector('#video-element').readyState >= 2`, 30000);
    const mp4 = await evaluate(`document.querySelector('#video-element').currentSrc`);
    assert.match(mp4, /sample\.mp4$/);
    results.next = { mp4: mp4.split("/").pop() };

    // 7. PiP и полный экран: кликаем мышью, чтобы браузер видел жест пользователя
    await evaluate(`document.querySelector('.player-frame')?.scrollIntoView({ block: 'center' })`);
    if (await evaluate(`document.pictureInPictureEnabled && !!document.querySelector('media-pip-button')`)) {
      await realClick("media-pip-button");
      await sleep(1200);
      const on = await evaluate(`Boolean(document.pictureInPictureElement)`);
      assert.equal(on, true, "PiP включается кнопкой");
      await evaluate(`document.exitPictureInPicture()`);
      await waitFor(`!document.pictureInPictureElement`, 5000);
      results.pip = "включается и выключается";
    } else {
      results.pip = "браузер без PiP";
    }
    if (await evaluate(`document.fullscreenEnabled && !!document.querySelector('media-fullscreen-button')`)) {
      await realClick("media-fullscreen-button");
      await waitFor(`Boolean(document.fullscreenElement)`, 5000);
      const bounds = await evaluate(`(() => { const r = document.querySelector('media-controller').getBoundingClientRect(); return { width: r.width, height: r.height, vw: innerWidth, vh: innerHeight }; })()`);
      assert.equal(bounds.width, bounds.vw, "полный экран занимает всю ширину");
      assert.equal(bounds.height, bounds.vh, "полный экран занимает всю высоту");
      await evaluate(`document.exitFullscreen()`);
      results.fullscreen = "включается и выключается на весь экран";
    } else {
      results.fullscreen = "браузер без полного экрана";
    }

    // 8. Ошибка парсера остаётся на экране, а «Повторить» после восстановления
    // источника убирает её и запускает видео
    failParser = true;
    catalog["episode/18439/9/9"].episodes[0].url = "https://kodik.info/test-unavailable";
    await send("Page.reload");
    await waitFor("document.readyState === 'complete'");
    await waitFor(`(() => (document.querySelector('.player-frame')?.textContent || '').includes('Источник не отдал видео'))()`, 60000);
    await sleep(2500);
    assert.ok(await evaluate(`(document.querySelector('.player-frame')?.textContent || '').includes('Источник не отдал видео')`), "ошибка источника не исчезает при перестройке каталога");
    await evaluate(`[...document.querySelectorAll('.player-frame button')].find((b) => b.textContent.trim() === 'Подробнее')?.click()`);
    await waitFor(`(() => (document.querySelector('.player-frame')?.textContent || '').includes('KODIK: Тестовый источник недоступен'))()`, 5000);
    results.error = "причина видна и не исчезает";

    failParser = false;
    catalog["episode/18439/9/9"].episodes[0].url = `http://127.0.0.1:${MEDIA_PORT}/sample.m3u8`;
    await evaluate(`[...document.querySelectorAll('.player-frame button')].find((b) => b.textContent.trim() === 'Повторить')?.click()`);
    await waitFor(`(() => { const v = ${video}; return v && v.readyState >= 1; })()`, 60000);
    assert.ok(await evaluate(`!(document.querySelector('.player-frame')?.textContent || '').includes('Источник не отдал видео')`), "после успешного повтора ошибка закрывается");
    results.retry = "воспроизведение восстановлено";

    console.log(JSON.stringify(results, null, 1));
    console.log("Новый плеер: медиа, настройки, серии и восстановление после ошибки проверены");
  } finally {
    ws?.close();
    chrome.kill();
    media.server.close();
    await sleep(600);
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      rmSync(media.directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {}
  }
}
main().catch((error) => { console.error(error); process.exit(1); });