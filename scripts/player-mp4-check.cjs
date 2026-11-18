// Реальный MP4 в новом плеере: свой UI, нативная скорость, никакого Video.js.
// Нужны запущенные http://localhost:3000 и парсер на порту 7000 не требуется.
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { createServer } = require("node:http");
const { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const BASE = process.env.ANIX_URL || "http://localhost:3000";
const PORT = 9351;
const MEDIA_PORT = 9352;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SAMPLE_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

// Локальная раздача образца: свежий профиль без кэша не должен влиять на замер скорости
async function startMedia() {
  const directory = mkdtempSync(join(tmpdir(), "anix-media-"));
  const file = join(directory, "sample.mp4");
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(SAMPLE_URL, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      writeFileSync(file, Buffer.from(await response.arrayBuffer()));
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      await sleep(500);
    }
  }
  if (lastError) throw lastError;

  const size = statSync(file).size;
  const server = createServer((request, response) => {
    const match = /bytes=(\d+)-(\d*)/.exec(request.headers.range || "");
    const headers = { "Content-Type": "video/mp4", "Accept-Ranges": "bytes", "Access-Control-Allow-Origin": "*" };
    if (!match) {
      response.writeHead(200, { ...headers, "Content-Length": size });
      response.end(readFileSync(file));
      return;
    }
    const start = Number(match[1]);
    const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
    response.writeHead(206, {
      ...headers,
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": end - start + 1,
    });
    response.end(readFileSync(file).subarray(start, end + 1));
  });
  await new Promise((resolve) => server.listen(MEDIA_PORT, "127.0.0.1", resolve));
  return { server, directory };
}


async function main() {
  const health = await fetch(`${BASE}/api/version`, { signal: AbortSignal.timeout(10000) });
  assert.equal(health.ok, true, "Сначала нужен работающий локальный сервер");

  const media = await startMedia();
  const catalog = {
    "episode/18439": {
      code: 0,
      types: [{ id: 9, name: "MP4-тест", icon: "", episodes_count: 1, view_count: 0, pinned: false }],
    },
    "episode/18439/9": {
      code: 0,
      sources: [{ id: 9, name: "Прямой MP4", episodes_count: 1 }],
    },
    "episode/18439/9/9": {
      code: 0,
      episodes: [{ position: 1, name: "Тестовая серия", is_watched: false, url: `http://127.0.0.1:${MEDIA_PORT}/sample.mp4` }],
    },
  };

  const profile = mkdtempSync(join(tmpdir(), "anix-player-mp4-"));
  const chrome = spawn(process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
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
    const waitFor = async (expression, timeout = 30000) => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const value = await evaluate(expression);
        if (value) return value;
        await sleep(250);
      }
      throw new Error(`Не выполнено условие: ${expression}`);
    };

    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
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
      await sleep(800);
      const enabled = await evaluate("JSON.parse(localStorage.getItem('preferences') || '{}').state?.params?.experimental?.newPlayer === true");
      if (enabled) break;
    }
    assert.equal(
      await evaluate("JSON.parse(localStorage.getItem('preferences') || '{}').state?.params?.experimental?.newPlayer === true"),
      true,
      "Новый плеер не включился"
    );
    await send("Fetch.enable", { patterns: [{ urlPattern: "*api/proxy/episode*" }] });
    await send("Page.navigate", { url: `${BASE}/release/18439` });
    await waitFor("document.readyState === 'complete'", 45000);
    try {
      await waitFor("!!document.querySelector('#video-element')", 30000);
    } catch (error) {
      const state = await evaluate(`({
        frame: document.querySelector('.player-frame')?.innerText.slice(0, 600),
        prefs: JSON.parse(localStorage.getItem('preferences') || '{}').state?.params?.experimental,
        html: document.querySelector('.player-frame')?.outerHTML.slice(0, 500),
      })`);
      throw new Error(`${error.message}\n${JSON.stringify(state)}`);
    }
    await evaluate("document.querySelector('.md .mb-close')?.click()");
    await waitFor("(() => { const v = document.querySelector('#video-element'); return v && v.readyState >= 1 && Number(v.duration) > 0; })()", 45000);

    const playback = await evaluate(`(async () => {
      const video = document.querySelector('#video-element');
      document.querySelector('media-chrome-menu-item[value="4"]')?.click();
      await new Promise(resolve => setTimeout(resolve, 300));
      video.muted = true;
      video.loop = true;
      video.currentTime = 0;
      await video.play();
      // Ролик короткий и зациклен, поэтому учитываем переход через конец файла
      const wall = performance.now();
      let played = 0;
      let last = video.currentTime;
      while (performance.now() - wall < 2000) {
        await new Promise(resolve => setTimeout(resolve, 50));
        const now = video.currentTime;
        let delta = now - last;
        if (delta < -0.5) delta += video.duration;
        played += delta;
        last = now;
      }
      return {
        tag: video.tagName,
        duration: video.duration,
        controls: video.controls,
        rate: video.playbackRate,
        speed: played / ((performance.now() - wall) / 1000),
        src: video.currentSrc || video.src,
        videoJs: Boolean(document.querySelector('video-js')),
      };
    })()`);
    assert.equal(playback.tag, "VIDEO", "MP4 должен играть напрямую, без Video.js");
    assert.equal(playback.videoJs, false, "Video.js не должен добавляться на страницу");
    assert.equal(playback.controls, false, "Базовый браузерный UI скрыт");
    assert.equal(playback.rate, 4);
    assert.ok(playback.speed > 3, `Скорость воспроизведения была ${playback.speed.toFixed(2)}×`);
    assert.ok(playback.src.includes("sample.mp4"));
    console.log("MP4 нового плеера: собственный <video>, UI media-chrome, нативные 4×", playback);
  } finally {
    ws?.close();
    chrome.kill();
    media.server.close();
    await sleep(700);
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      rmSync(media.directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch (error) {
      console.warn(`Не удалось сразу удалить временные файлы: ${error.message}`);
    }
  }
}

main().catch((error) => { console.error(error); process.exit(1); });
