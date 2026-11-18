// Премьера у анонса: пустая дата не должна превращаться в 1970 год.
// Проверяются оба честных варианта — известный год и «Скоро».
// Нужен запущенный http://localhost:3000.
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const BASE = process.env.ANIX_URL || "http://localhost:3000";
const PORT = 9354;
const RELEASE = 18439;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const health = await fetch(`${BASE}/api/version`, { signal: AbortSignal.timeout(10000) });
  assert.equal(health.ok, true, "Сначала нужен работающий локальный сервер");

  const original = await fetch(`${BASE}/api/proxy/release/${RELEASE}`, { signal: AbortSignal.timeout(20000) });
  assert.equal(original.ok, true, "Не удалось получить данные релиза");
  const payload = await original.json();
  assert.ok(payload.release, "В ответе нет релиза");



  // Два случая: год известен и год неизвестен. Оба обязаны обойтись без 1970.
  const announcement = (year) => ({
    ...payload,
    release: { ...payload.release, status: { id: 1, name: "анонс" }, aired_on_date: null, season: 0, year },
  });
  const announcements = [announcement(2027), announcement(null)];
  let variant = 0;

  const profile = mkdtempSync(join(tmpdir(), "anix-release-info-"));
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
        if (new URL(request.url).pathname === `/api/proxy/release/${RELEASE}`) {
          const body = announcements[variant];
          send("Fetch.fulfillRequest", {
            requestId,
            responseCode: 200,
            responseHeaders: [{ name: "Content-Type", value: "application/json" }],
            body: Buffer.from(JSON.stringify(body)).toString("base64"),
          }).catch(() => {});
          return;
        }
        send("Fetch.continueRequest", { requestId }).catch(() => {});
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

    await send("Page.enable");
    await send("Fetch.enable", { patterns: [{ urlPattern: `*api/proxy/release/${RELEASE}*` }] });
    await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: `${BASE}/release/${RELEASE}` });
    await waitFor("document.readyState === 'complete'");

    const premiere = `(() => {
      const cell = [...document.querySelectorAll('.infocell')]
        .find((node) => node.querySelector('.infocell-k')?.textContent?.trim() === 'Премьера');
      return cell ? (cell.querySelector('.infocell-v')?.textContent || '').trim() : null;
    })()`;

    await waitFor(`(${premiere}) !== null`);
    const withYear = await evaluate(premiere);
    assert.ok(!withYear.includes("1970"), `Пустая дата показана как 1970: «${withYear}»`);
    assert.match(withYear, /2027/, `Ожидался год премьеры, получено «${withYear}»`);

    // Второй ответ без года: должна остаться подпись «Скоро»
    variant = 1;
    await send("Page.navigate", { url: `${BASE}/release/${RELEASE}` });
    await waitFor("document.readyState === 'complete'");
    await waitFor(`(${premiere}) !== null`);
    const withoutYear = await evaluate(premiere);
    assert.ok(!withoutYear.includes("1970"), `Пустая дата показана как 1970: «${withoutYear}»`);
    assert.equal(withoutYear, "Скоро", `Без года ожидалось «Скоро», получено «${withoutYear}»`);

    console.log("Премьера анонса без даты:", { withYear, withoutYear });
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
