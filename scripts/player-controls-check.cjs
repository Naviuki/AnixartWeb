// Интервалы и горячие клавиши нового плеера на локальных HLS и MP4.
// Нужны http://localhost:3000 и ffmpeg; внешние видео и парсер не требуются.
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");
const { startPlayerTestMedia } = require("./player-test-media.cjs");

const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.ANIX_URL || "http://localhost:3000";
const PORT = 9360;
const MEDIA_PORT = 9361;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const health = await fetch(`${BASE}/api/version`, { signal: AbortSignal.timeout(10000) });
  assert.equal(health.ok, true, "Сначала нужен работающий локальный сервер");
  const media = await startPlayerTestMedia(MEDIA_PORT);
  const profile = mkdtempSync(join(tmpdir(), "anix-player-controls-"));
  const chrome = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
    "--autoplay-policy=no-user-gesture-required",
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
    const catalog = {
      "episode/18439": {
        code: 0,
        types: [{ id: 9, name: "Локальный тест", icon: "", episodes_count: 2, view_count: 0, pinned: false }],
      },
      "episode/18439/9": {
        code: 0,
        sources: [{ id: 9, name: "HLS и MP4", episodes_count: 2 }],
      },
      "episode/18439/9/9": {
        code: 0,
        episodes: [
          { position: 1, name: "HLS-серия", is_watched: false, url: `http://127.0.0.1:${MEDIA_PORT}/sample.m3u8` },
          { position: 2, name: "MP4-серия", is_watched: false, url: `http://127.0.0.1:${MEDIA_PORT}/sample.mp4` },
        ],
      },
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
        const path = new URL(request.url).pathname.replace(/^\/api\/proxy\//, "");
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
        await sleep(200);
      }
      throw new Error(`Не выполнено условие: ${expression}`);
    };
    const press = async (code, key, vk, modifiers = 0, autoRepeat = false) => {
      await send("Input.dispatchKeyEvent", { type: "keyDown", code, key, windowsVirtualKeyCode: vk, modifiers, autoRepeat });
      await send("Input.dispatchKeyEvent", { type: "keyUp", code, key, windowsVirtualKeyCode: vk, modifiers });
      await sleep(180);
    };
    const activate = async () => {
      await evaluate(`(() => {
        document.activeElement?.blur();
        const frame = document.querySelector('.player-frame');
        frame.scrollIntoView({ block: 'center' });
        return true;
      })()`);
      const point = await evaluate(`(() => {
        const r = document.querySelector('.player-frame').getBoundingClientRect();
        return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
      })()`);
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 3, y: 3 });
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y });
      await sleep(250);
      await evaluate(`(() => { const h = document.querySelector('#video-element'); const v = h?.shadowRoot?.querySelector('video') || h; v.muted = true; return true })()`);
    };
    const openSettings = async () => {
      const visible = await evaluate(`!document.querySelector('#settings')?.hidden`);
      if (!visible) await evaluate(`document.querySelector('[class*=media-settings-menu-button]').click()`);
      await waitFor(`document.querySelector('#settings') && !document.querySelector('#settings').hidden`);
      await sleep(300);
    };
    const closeSettings = async () => {
      if (await evaluate(`document.querySelector('#settings') && !document.querySelector('#settings').hidden`)) {
        await evaluate(`document.querySelector('[class*=media-settings-menu-button]').click()`);
        await waitFor(`document.querySelector('#settings').hidden`);
      }
      await activate();
    };
    const pick = async (itemIndex, value) => {
      if (await evaluate(`document.querySelector('#settings') && !document.querySelector('#settings').hidden`)) {
        await evaluate(`document.querySelector('[class*=media-settings-menu-button]').click()`);
        await waitFor(`document.querySelector('#settings').hidden`);
      }
      await openSettings();
      await evaluate(`document.querySelectorAll('#settings > media-settings-menu-item')[${itemIndex}].click()`);
      await waitFor(`(() => { const item = document.querySelectorAll('#settings > media-settings-menu-item')[${itemIndex}]; const menu = item.querySelector('[slot=submenu]'); return menu && !menu.hidden; })()`);
      await evaluate(`(() => {
        const item = document.querySelectorAll('#settings > media-settings-menu-item')[${itemIndex}];
        const row = [...item.querySelectorAll('[slot=submenu] > media-chrome-menu-item')]
          .find((node) => node.getAttribute('value') === ${JSON.stringify(String(value))});
        if (!row) throw new Error('Не найден пункт настройки ${value}');
        row.click();
        return true;
      })()`);
      await sleep(250);
    };
    const videoTime = () => evaluate(`(() => { const h = document.querySelector('#video-element'); const v = h?.shadowRoot?.querySelector('video') || h; return v.currentTime })()`);
    const setTime = async (seconds) => {
      await evaluate(`(() => { const h = document.querySelector('#video-element'); const v = h?.shadowRoot?.querySelector('video') || h; v.pause(); v.currentTime = ${seconds}; return true })()`);
      await sleep(350);
    };
    const checkSeek = async (start, expected, code, key, vk, modifiers = 0) => {
      await setTime(start);
      await press(code, key, vk, modifiers);
      try {
        await waitFor(`Math.abs((() => { const h = document.querySelector('#video-element'); const v = h?.shadowRoot?.querySelector('video') || h; return v.currentTime })() - ${expected}) < 0.8`, 10000);
      } catch (error) {
        const state = await evaluate(`({ time: (() => { const h = document.querySelector('#video-element'); const v = h?.shadowRoot?.querySelector('video') || h; return v?.currentTime })(), active: document.activeElement?.tagName, hover: document.querySelector('.player-frame')?.matches(':hover') })`);
        console.error("Состояние после перемотки:", state);
        throw error;
      }
      console.log(`Перемотка ${code}: ${start} → ${await videoTime()} секунд`);
    };

    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: BASE });
    await waitFor("document.readyState === 'complete'");
    await evaluate(`(() => {
      const saved = JSON.parse(localStorage.getItem('preferences') || '{}');
      saved.state = saved.state || {};
      saved.state.params = { ...(saved.state.params || {}), experimental: { newPlayer: true } };
      saved.state.flags = { ...(saved.state.flags || {}), showChangelog: false, saveWatchHistory: false };
      localStorage.setItem('preferences', JSON.stringify(saved));
      localStorage.removeItem('player-preferences');
      return true;
    })()`);
    await send("Page.reload");
    await waitFor("document.readyState === 'complete'");
    await send("Fetch.enable", { patterns: [{ urlPattern: "*api/proxy/episode*" }] });
    await send("Page.navigate", { url: `${BASE}/release/18439` });
    await waitFor("(() => { const h = document.querySelector('#video-element'); const v = h?.shadowRoot?.querySelector('video') || h; return v && v.readyState >= 2 && v.duration >= 179; })()", 60000);
    await evaluate("document.querySelector('.md .mb-close')?.click()");
    assert.equal(await evaluate(`document.querySelector('#video-element').tagName`), "HLS-VIDEO");
    await activate();

    // Умолчания и настоящий шаг клавиш внутри HLS shadow root
    await checkSeek(50, 60, "ArrowRight", "ArrowRight", 39);
    await checkSeek(50, 40, "ArrowLeft", "ArrowLeft", 37);
    await checkSeek(30, 120, "ArrowRight", "ArrowRight", 39, 8);

    // Пользовательские шаги применяются и к клавишам, и кнопкам
    await pick(2, 5);
    await pick(3, 15);
    await pick(4, 45);
    const offsets = await evaluate(`[...document.querySelectorAll('media-seek-backward-button, media-seek-forward-button')].map(b => b.getAttribute('seekoffset'))`);
    assert.deepEqual(offsets, ["5", "15", "45"]);
    await closeSettings();
    await checkSeek(100, 95, "ArrowLeft", "ArrowLeft", 37);
    await checkSeek(100, 115, "ArrowRight", "ArrowRight", 39);
    await checkSeek(100, 145, "ArrowRight", "ArrowRight", 39, 8);

    const volume = await evaluate(`(() => { const h = document.querySelector('#video-element'); const v = h?.shadowRoot?.querySelector('video') || h; v.volume = 0.5; return v.volume })()`);
    assert.equal(volume, 0.5);
    await press("ArrowUp", "ArrowUp", 38);
    assert.equal(await evaluate(`(() => { const h = document.querySelector('#video-element'); const v = h?.shadowRoot?.querySelector('video') || h; return v.volume })()`), 0.6);
    await press("ArrowDown", "ArrowDown", 40);
    assert.equal(await evaluate(`(() => { const h = document.querySelector('#video-element'); const v = h?.shadowRoot?.querySelector('video') || h; return v.volume })()`), 0.5);
    await press("KeyM", "m", 77);
    assert.equal(await evaluate(`(() => { const h = document.querySelector('#video-element'); const v = h?.shadowRoot?.querySelector('video') || h; return v.muted })()`), true);
    await press("KeyM", "m", 77);
    assert.equal(await evaluate(`(() => { const h = document.querySelector('#video-element'); const v = h?.shadowRoot?.querySelector('video') || h; return v.muted })()`), false);

    await press("Space", " ", 32);
    await waitFor(`(() => { const h = document.querySelector('#video-element'); const v = h?.shadowRoot?.querySelector('video') || h; return !v.paused })()`);
    await press("Space", " ", 32);
    await waitFor(`(() => { const h = document.querySelector('#video-element'); const v = h?.shadowRoot?.querySelector('video') || h; return v.paused })()`);
    await press("Space", " ", 32, 0, true);
    assert.equal(await evaluate(`(() => { const h = document.querySelector('#video-element'); const v = h?.shadowRoot?.querySelector('video') || h; return v.paused })()`), true, "Удержание пробела не должно снова запускать видео");

    // Смена серии клавишами: HLS -> MP4 -> HLS, без потери собственного UI
    await press("KeyN", "n", 78);
    await waitFor(`document.querySelector('#video-element')?.tagName === 'VIDEO' && document.querySelector('#video-element').readyState >= 2`);
    assert.match(await evaluate(`document.querySelector('#video-element').currentSrc`), /sample\.mp4$/);
    assert.equal(await evaluate(`document.querySelector('#video-element').controls`), false);
    await press("KeyB", "b", 66);
    await waitFor(`(() => { const h = document.querySelector('#video-element'); const v = h?.shadowRoot?.querySelector('video') || h; return h?.tagName === 'HLS-VIDEO' && v?.readyState >= 2; })()`);
    await evaluate(`(() => { const h = document.querySelector('#video-element'); const v = h?.shadowRoot?.querySelector('video') || h; v.volume = 0.5; v.muted = true; return true })()`);

    if (await evaluate(`document.fullscreenEnabled`)) {
      await press("KeyF", "f", 70);
      await waitFor(`Boolean(document.fullscreenElement)`);
      await press("KeyF", "f", 70);
      await waitFor(`!document.fullscreenElement`);
    }
    let pip = "не поддерживается этим headless Chrome";
    if (await evaluate(`document.pictureInPictureEnabled`)) {
      await press("KeyP", "p", 80);
      await waitFor(`Boolean(document.pictureInPictureElement)`, 8000);
      await press("KeyP", "p", 80);
      await waitFor(`!document.pictureInPictureElement`, 8000);
      pip = "входит и выходит клавишей P";
    }

    // Назначение клавиши, запрет дублей, отмена Escape и сброс
    await openSettings();
    await evaluate(`document.querySelectorAll('#settings > media-settings-menu-item')[5].click()`);
    await sleep(300);
    await evaluate(`[...document.querySelectorAll('#settings > media-settings-menu-item')[5].querySelectorAll('[slot=submenu] > media-chrome-menu-item')][5].click()`);
    await press("KeyJ", "j", 74);
    let stored = await evaluate(`JSON.parse(localStorage.getItem('player-preferences')).state`);
    assert.equal(stored.keys.volumeDown, "KeyJ");
    await evaluate(`[...document.querySelectorAll('#settings > media-settings-menu-item')[5].querySelectorAll('[slot=submenu] > media-chrome-menu-item')][6].click()`);
    await press("ArrowUp", "ArrowUp", 38);
    stored = await evaluate(`JSON.parse(localStorage.getItem('player-preferences')).state`);
    assert.equal(stored.keys.mute, "ArrowUp");
    assert.equal(stored.keys.volumeUp, "");
    await evaluate(`[...document.querySelectorAll('#settings > media-settings-menu-item')[5].querySelectorAll('[slot=submenu] > media-chrome-menu-item')][1].click()`);
    await press("Escape", "Escape", 27);
    stored = await evaluate(`JSON.parse(localStorage.getItem('player-preferences')).state`);
    assert.equal(stored.keys.back, "ArrowLeft");
    await evaluate(`[...document.querySelectorAll('#settings > media-settings-menu-item')[5].querySelectorAll('[slot=submenu] > media-chrome-menu-item')].at(-1).click()`);
    stored = await evaluate(`JSON.parse(localStorage.getItem('player-preferences')).state`);
    assert.equal(stored.keys.volumeDown, "ArrowDown");
    await closeSettings();
    await press("KeyJ", "j", 74);
    assert.equal(await evaluate(`(() => { const h = document.querySelector('#video-element'); const v = h?.shadowRoot?.querySelector('video') || h; return v.volume })()`), 0.5, "После сброса старая клавиша не действует");

    // Снова назначаем свою клавишу и оставляем её для проверки после перезагрузки
    await openSettings();
    await evaluate(`document.querySelectorAll('#settings > media-settings-menu-item')[5].click()`);
    await sleep(300);
    await evaluate(`[...document.querySelectorAll('#settings > media-settings-menu-item')[5].querySelectorAll('[slot=submenu] > media-chrome-menu-item')][5].click()`);
    await press("KeyJ", "j", 74);
    await closeSettings();
    await press("KeyJ", "j", 74);
    assert.equal(await evaluate(`(() => { const h = document.querySelector('#video-element'); const v = h?.shadowRoot?.querySelector('video') || h; return v.volume })()`), 0.4);

    // Вне плеера стрелки не перематывают видео и не блокируют страницу
    await setTime(60);
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 3, y: 3 });
    await evaluate(`document.activeElement?.blur()`);
    // Ждём React onMouseLeave: проверяем состояние после реального ухода курсора
    await waitFor(`!document.querySelector('.player-frame').matches(':hover')`);
    await sleep(250);
    await press("ArrowRight", "ArrowRight", 39);
    const outsideTime = await videoTime();
    assert.ok(Math.abs(outsideTime - 60) < 0.2, `Вне плеера стрелка изменила время на ${outsideTime}`);

    // Сохранённые интервалы переживают перезагрузку; испорченные значения лечатся
    await send("Page.reload");
    await waitFor("(() => { const h = document.querySelector('#video-element'); const v = h?.shadowRoot?.querySelector('video') || h; return v && v.readyState >= 2 && v.duration >= 179; })()", 60000);
    stored = await evaluate(`JSON.parse(localStorage.getItem('player-preferences')).state`);
    assert.deepEqual(stored.seek, { back: 5, forward: 15, jump: 45 });
    assert.equal(stored.keys.volumeDown, "KeyJ");
    await evaluate(`(() => {
      const saved = JSON.parse(localStorage.getItem('player-preferences'));
      saved.state.seek = { back: 'сломано', forward: 1000, jump: 3 };
      saved.state.keys = { back: 42, forward: 'KeyL' };
      localStorage.setItem('player-preferences', JSON.stringify(saved));
      return true;
    })()`);
    await send("Page.reload");
    await waitFor("(() => { const h = document.querySelector('#video-element'); const v = h?.shadowRoot?.querySelector('video') || h; return v && v.readyState >= 2 && v.duration >= 179; })()", 60000);
    const repairedOffsets = await evaluate(`[...document.querySelectorAll('media-seek-backward-button, media-seek-forward-button')].map(b => b.getAttribute('seekoffset'))`);
    assert.deepEqual(repairedOffsets, ["10", "600", "3"]);
    await activate();
    await checkSeek(20, 10, "ArrowLeft", "ArrowLeft", 37);
    // Клавиша «вперёд» после починки осталась рабочей: шаг 600 с упирается в конец ролика
    await setTime(20);
    await press("KeyL", "l", 76);
    await waitFor(`(() => { const h = document.querySelector('#video-element'); const v = h?.shadowRoot?.querySelector('video') || h; return v.currentTime >= 178 })()`, 10000);
    console.log(`Перемотка KeyL: 20 → ${Math.round(await videoTime())} секунд (конец ролика)`);

    console.log("Клавиши: перемотка, пауза, громкость, звук, полный экран, PiP и серии проверены", { pip });
    console.log("Интервалы меняются, сохраняются и восстанавливаются после повреждения хранилища");
  } finally {
    ws?.close();
    chrome.kill();
    media.server.close();
    await sleep(600);
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      rmSync(media.directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch (error) {
      console.warn(`Не удалось сразу удалить временные файлы: ${error.message}`);
    }
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
