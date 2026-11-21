// Синхронизация уведомлений читает профиль владельца, а не несуществующий /profile.
// Запуск: node scripts/notifications-sync-check.cjs
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const BASE = process.env.ANIX_URL || "http://localhost:3000";
const PORT = 9362;
const USER_ID = 4929110;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const remoteStatus =
  "anix_seasons_v1 " +
  JSON.stringify({
    version: 1,
    updated_at: "2026-11-21T00:00:00.000Z",
    subs: {
      2458: {
        title: "Тестовый тайтл",
        relatedId: 2458,
        since: 1,
        lastRelatedCount: 1,
      },
    },
  });

async function main() {
  const health = await fetch(`${BASE}/api/version`, {
    signal: AbortSignal.timeout(10000),
  });
  assert.ok(health.ok, "Сначала нужен работающий локальный сервер");

  const profile = mkdtempSync(join(tmpdir(), "anix-notifications-sync-"));
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
    const requests = [];
    let sequence = 0;
    let statusUpdates = 0;
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
    const fulfill = (requestId, body) =>
      send("Fetch.fulfillRequest", {
        requestId,
        responseCode: 200,
        responseHeaders: [
          { name: "Content-Type", value: "application/json" },
        ],
        body: Buffer.from(JSON.stringify(body)).toString("base64"),
      }).catch(() => {});

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
      requests.push(pathname);

      if (pathname === `/api/proxy/profile/${USER_ID}`) {
        fulfill(requestId, {
          code: 0,
          is_my_profile: true,
          profile: {
            id: USER_ID,
            login: "Тестовый профиль",
            avatar: "",
            status: remoteStatus,
          },
        });
        return;
      }
      if (pathname === "/api/proxy/related/2458/0") {
        fulfill(requestId, {
          code: 0,
          content: [{ id: 2013, category: { name: "Сериал" } }],
        });
        return;
      }
      if (pathname === "/api/proxy/profile/preference/status/edit") {
        statusUpdates += 1;
        fulfill(requestId, { code: 0 });
        return;
      }
      send("Fetch.continueRequest", { requestId }).catch(() => {});
    };

    await send("Page.enable");
    await send("Runtime.enable");
    await send("Fetch.enable", {
      patterns: [{ urlPattern: "*api/proxy/*" }],
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
    const start = Date.now();
    let stored = {};
    while (Date.now() - start < 30000) {
      stored = await evaluate(`JSON.parse(localStorage.getItem('notifications') || '{}').state?.subs || {}`);
      if (stored[2458]?.title === "Тестовый тайтл" && statusUpdates > 0) break;
      await sleep(200);
    }

    assert.equal(stored[2458]?.title, "Тестовый тайтл", "Подписка из профиля не восстановлена");
    assert.ok(
      requests.filter((path) => path === `/api/proxy/profile/${USER_ID}`).length >= 2,
      "Профиль владельца не запрошен для синхронизации"
    );
    assert.equal(
      requests.includes("/api/proxy/profile"),
      false,
      "Выполнен запрос к /profile без id"
    );
    assert.ok(statusUpdates > 0, "Объединённое состояние не отправлено обратно");

    console.log("Подписка восстановлена из профиля:", stored[2458]);
    console.log("Запрос к /profile без id: отсутствует");
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
