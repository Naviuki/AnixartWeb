// Сеанс не должен пропадать из-за временной ошибки проверки профиля.
// Настоящий неверный токен по-прежнему обязан завершать авторизацию.
// Запуск: node scripts/auth-session-check.cjs
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const BASE = process.env.ANIX_URL || "http://localhost:3000";
const PORT = 9361;
const USER_ID = 4929110;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const health = await fetch(`${BASE}/api/version`, {
    signal: AbortSignal.timeout(10000),
  });
  assert.ok(health.ok, "Сначала нужен работающий локальный сервер");

  const profile = mkdtempSync(join(tmpdir(), "anix-auth-session-"));
  const chrome = spawn(
    process.env.CHROME_PATH ||
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let ws;
  try {
    let page;
    for (let attempt = 0; attempt < 80; attempt++) {
      try {
        const targets = await (
          await fetch(`http://127.0.0.1:${PORT}/json/list`)
        ).json();
        page = targets.find((target) => target.type === "page");
        if (page) break;
      } catch {}
      await sleep(200);
    }
    assert.ok(page, "Chrome DevTools не запустился");

    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });
    const pending = new Map();
    let sequence = 0;
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++sequence;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    const evaluate = async (expression) => {
      const result = await send("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (result.exceptionDetails) {
        throw new Error(
          result.exceptionDetails.exception?.description || "Ошибка JavaScript"
        );
      }
      return result.result?.value;
    };
    const waitFor = async (expression, timeout = 30000) => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const value = await evaluate(expression);
        if (value) return value;
        await sleep(200);
      }
      throw new Error(`Не выполнено условие: ${expression}`);
    };

    let mode = "failure";
    ws.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (message.id && pending.has(message.id)) {
        const task = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) task.reject(new Error(message.error.message));
        else task.resolve(message.result);
        return;
      }
      if (message.method !== "Fetch.requestPaused") return;
      const { requestId, request } = message.params;
      const pathname = new URL(request.url).pathname;
      if (pathname !== `/api/proxy/profile/${USER_ID}`) {
        send("Fetch.continueRequest", { requestId }).catch(() => {});
        return;
      }
      const response =
        mode === "failure" ? { status: 500, body: {} }
        : mode === "rejected" ?
          {
            status: 500,
            body: {
              message: "API Returned an Error",
              code: 2,
              httpStatus: 200,
            },
          }
        : mode === "forbidden" ?
          {
            status: 500,
            body: {
              message: "API Returned an Error",
              code: 500,
              httpStatus: 403,
            },
          }
        : {
            status: 200,
            body: {
              code: 0,
              is_my_profile: mode === "valid",
              profile: {
                id: USER_ID,
                login: mode === "valid" ? "Тестовый профиль" : "Другой профиль",
                avatar: "",
              },
            },
          };
      send("Fetch.fulfillRequest", {
        requestId,
        responseCode: response.status,
        responseHeaders: [
          { name: "Content-Type", value: "application/json" },
        ],
        body: Buffer.from(JSON.stringify(response.body)).toString("base64"),
      }).catch(() => {});
    };

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Fetch.enable", {
      patterns: [{ urlPattern: `*api/proxy/profile/${USER_ID}*` }],
    });
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `
        if (location.origin === ${JSON.stringify(BASE)}) {
          localStorage.setItem('JWT', JSON.stringify({ user_id: ${USER_ID}, jwt: 'test-token' }));
          localStorage.setItem('preferences', JSON.stringify({
            state: { params: { isFirstLaunch: false }, flags: { showChangelog: false } },
            version: 0
          }));
        }
      `,
    });

    await send("Page.navigate", { url: `${BASE}/` });
    await waitFor("!!document.querySelector('.nav-name')");
    await waitFor("document.querySelector('.nav-name').textContent.trim() !== ''");
    const failure = await evaluate(`({
      jwt: !!localStorage.getItem('JWT'),
      name: document.querySelector('.nav-name')?.textContent.trim(),
      bookmarks: [...document.querySelectorAll('.nav-item')].some((node) => node.textContent.includes('Закладки'))
    })`);
    assert.equal(failure.jwt, true, "Ошибка 500 удалила сохранённый JWT");
    assert.equal(failure.bookmarks, true, "Ошибка 500 завершила сеанс");
    assert.equal(failure.name, "Аккаунт");

    mode = "valid";
    await send("Page.navigate", { url: `${BASE}/` });
    await waitFor("document.querySelector('.nav-name')?.textContent.includes('Тестовый профиль')");
    assert.equal(await evaluate("!!localStorage.getItem('JWT')"), true);

    mode = "invalid";
    await send("Page.navigate", { url: `${BASE}/` });
    await waitFor("!localStorage.getItem('JWT')");
    await waitFor("document.querySelector('.nav-name')?.textContent.trim() === 'Аноним'");

    mode = "rejected";
    await send("Page.navigate", { url: `${BASE}/` });
    await waitFor("!localStorage.getItem('JWT')");
    await waitFor("document.querySelector('.nav-name')?.textContent.trim() === 'Аноним'");

    mode = "valid";
    await send("Page.navigate", { url: `${BASE}/` });
    await waitFor("document.querySelector('.nav-name')?.textContent.includes('Тестовый профиль')");

    mode = "forbidden";
    await send("Page.navigate", { url: `${BASE}/` });
    await waitFor("!localStorage.getItem('JWT')");
    await waitFor("document.querySelector('.nav-name')?.textContent.trim() === 'Аноним'");

    console.log("Временный 500:", failure);
    console.log("Успешная проверка: профиль восстановлен");
    console.log("Неверный токен: JWT удалён, выполнен выход");
    console.log("Код ошибки API и HTTP 403: сохранённый JWT не принят за временный сбой");
  } finally {
    ws?.close();
    chrome.kill();
    await sleep(700);
    try {
      rmSync(profile, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 200,
      });
    } catch (error) {
      console.warn(`Не удалось сразу удалить временный профиль: ${error.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
