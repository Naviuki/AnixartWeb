// Редактирование коллекции: временные ошибки API не должны ронять форму,
// а после успешной загрузки должны восстанавливаться поля и список релизов.
// Запуск: node scripts/collection-edit-check.cjs
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const BASE = process.env.ANIX_URL || "http://localhost:3000";
const PORT = 9364;
const USER_ID = 4929110;
const COLLECTION_ID = 365962;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const health = await fetch(`${BASE}/api/version`, {
    signal: AbortSignal.timeout(10000),
  });
  assert.ok(health.ok, "Сначала нужен работающий локальный сервер");

  const releaseResponse = await fetch(`${BASE}/api/proxy/release/2013`, {
    signal: AbortSignal.timeout(20000),
  });
  assert.ok(releaseResponse.ok, "Не удалось получить структуру тестового релиза");
  const releasePayload = await releaseResponse.json();

  const profile = mkdtempSync(join(tmpdir(), "anix-collection-edit-"));
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
    let mode = "infoFailure";
    const collection = {
      id: COLLECTION_ID,
      creator: { id: USER_ID, login: "Тестовый профиль", avatar: "" },
      title: "Тестовая коллекция",
      description: "Описание тестовой коллекции",
      is_private: true,
      is_favorite: false,
      image: "",
      creation_date: 0,
      last_update_date: 0,
    };
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
        if (await evaluate(expression)) return;
        await sleep(200);
      }
      throw new Error(`Не выполнено условие: ${expression}`);
    };
    const fulfill = (requestId, body, responseCode = 200) =>
      send("Fetch.fulfillRequest", {
        requestId,
        responseCode,
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

      if (pathname === `/api/proxy/profile/${USER_ID}`) {
        fulfill(requestId, {
          code: 0,
          is_my_profile: true,
          profile: { id: USER_ID, login: "Тестовый профиль", avatar: "" },
        });
        return;
      }
      if (pathname === `/api/proxy/collection/${COLLECTION_ID}`) {
        if (mode === "infoFailure") {
          fulfill(requestId, { message: "Временный сбой" }, 500);
        } else {
          fulfill(requestId, { code: 0, collection, watching_count: 0 });
        }
        return;
      }
      if (pathname.startsWith(`/api/proxy/collection/${COLLECTION_ID}/releases/`)) {
        if (mode === "releaseFailure") {
          fulfill(requestId, { message: "Временный сбой" }, 500);
        } else {
          const pageIndex = Number(pathname.split("/").at(-1));
          fulfill(requestId, {
            code: 0,
            content: pageIndex === 0 ? [releasePayload.release] : [],
            total_count: 1,
          });
        }
        return;
      }
      if (pathname === `/api/proxy/collection/comment/all/${COLLECTION_ID}/0`) {
        fulfill(requestId, { code: 0, content: [], total_count: 0 });
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

    const editUrl = `${BASE}/collections/create?mode=edit&id=${COLLECTION_ID}`;
    await send("Page.navigate", { url: editUrl });
    await waitFor(`document.body?.innerText.includes('Не удалось загрузить коллекцию. Попробуйте ещё раз.')`);
    await waitFor(`location.pathname === '/collection/${COLLECTION_ID}'`);

    mode = "releaseFailure";
    await send("Page.navigate", { url: editUrl });
    await waitFor(`document.body?.innerText.includes('Не удалось загрузить коллекцию. Попробуйте ещё раз.')`);
    await waitFor(`location.pathname === '/collection/${COLLECTION_ID}'`);

    mode = "success";
    await send("Page.navigate", { url: editUrl });
    await waitFor(`document.querySelector('#title')?.value === 'Тестовая коллекция'`);
    await waitFor(`document.body?.innerText.includes('Релизов в коллекции: 1/100')`);
    const loaded = await evaluate(`({
      title: document.querySelector('#title')?.value,
      description: document.querySelector('#description')?.value,
      isPrivate: document.querySelector('input[name="private"]')?.checked,
      hasRelease: document.body?.innerText.includes('Форма голоса'),
      updateDisabled: [...document.querySelectorAll('form.form button')].find((button) => button.textContent.trim() === 'Обновить')?.disabled
    })`);
    assert.deepEqual(loaded, {
      title: "Тестовая коллекция",
      description: "Описание тестовой коллекции",
      isPrivate: true,
      hasRelease: true,
      updateDisabled: false,
    });

    console.log("Ошибка информации: сообщение и возврат к коллекции, без исключения");
    console.log("Ошибка списка релизов: сообщение и возврат к коллекции");
    console.log("Успешная загрузка:", loaded);
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
