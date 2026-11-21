// Жизненный цикл комментария в интерфейсе: ошибка отправки, создание,
// обновление полного списка, редактирование и удаление. API подменяется.
// Запуск: node scripts/comments-check.cjs
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdtempSync, rmSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const BASE = process.env.ANIX_URL || "http://localhost:3000";
const PORT = 9363;
const USER_ID = 4929110;
const RELEASE_ID = 2013;
const COLLECTION_ID = 365963;
const COMMENT_ID = 15370000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const health = await fetch(`${BASE}/api/version`, {
    signal: AbortSignal.timeout(10000),
  });
  assert.ok(health.ok, "Сначала нужен работающий локальный сервер");

  const releaseResponse = await fetch(`${BASE}/api/proxy/release/${RELEASE_ID}`, {
    signal: AbortSignal.timeout(20000),
  });
  assert.ok(releaseResponse.ok, "Не удалось получить структуру тестового релиза");
  const releasePayload = await releaseResponse.json();
  releasePayload.release.comments = [];
  releasePayload.release.status = null;

  const profile = mkdtempSync(join(tmpdir(), "anix-comments-"));
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
    let addMayFail = true;
    let comments = [];
    let collectionComment = null;
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
      const url = new URL(request.url);
      const pathname = url.pathname;

      if (pathname === `/api/proxy/profile/${USER_ID}`) {
        fulfill(requestId, {
          code: 0,
          is_my_profile: true,
          profile: { id: USER_ID, login: "Тестовый профиль", avatar: "" },
        });
        return;
      }
      if (pathname === `/api/proxy/collection/${COLLECTION_ID}`) {
        fulfill(requestId, {
          code: 0,
          collection: {
            id: COLLECTION_ID,
            title: "Тестовая коллекция",
            description: "Описание",
            image: "",
            creator: { id: USER_ID, login: "Тестовый профиль", avatar: "" },
            is_private: true,
            is_favorite: false,
            creation_date: 0,
            last_update_date: 0,
          },
          completed_count: 0,
          plan_count: 0,
          dropped_count: 0,
          hold_on_count: 0,
          watching_count: 0,
        });
        return;
      }
      if (pathname.startsWith(`/api/proxy/collection/${COLLECTION_ID}/releases/`)) {
        fulfill(requestId, { code: 0, content: [], total_count: 0 });
        return;
      }
      if (pathname.startsWith(`/api/proxy/collection/comment/all/${COLLECTION_ID}/`)) {
        // Список намеренно остаётся старым: локальный комментарий не должен
        // исчезнуть до успешной ревалидации SWR.
        fulfill(requestId, { code: 0, content: [], total_count: 0 });
        return;
      }
      if (pathname === `/api/proxy/collection/comment/add/${COLLECTION_ID}`) {
        const payload = JSON.parse(request.postData || "{}");
        collectionComment = {
          id: COMMENT_ID + 1,
          profile: { id: USER_ID, login: "Тестовый профиль", avatar: "" },
          message: payload.message,
          timestamp: Math.floor(Date.now() / 1000),
          reply_count: 0,
          likes_count: 0,
          vote: 0,
          is_spoiler: payload.spoiler,
          is_edited: false,
          is_deleted: false,
        };
        fulfill(requestId, { code: 0, comment: collectionComment });
        return;
      }
      if (pathname === `/api/proxy/release/${RELEASE_ID}`) {
        fulfill(requestId, releasePayload);
        return;
      }
      if (pathname.startsWith(`/api/proxy/release/comment/all/${RELEASE_ID}/`)) {
        const pageIndex = Number(pathname.split("/").at(-1));
        fulfill(requestId, {
          code: 0,
          content: pageIndex === 0 ? comments : [],
          total_count: comments.length,
        });
        return;
      }
      if (pathname === `/api/proxy/release/comment/add/${RELEASE_ID}`) {
        if (addMayFail) {
          fulfill(requestId, { code: 2, message: "Тестовый отказ" });
          return;
        }
        const payload = JSON.parse(request.postData || "{}");
        comments = [
          {
            id: COMMENT_ID,
            profile: { id: USER_ID, login: "Тестовый профиль", avatar: "" },
            message: payload.message,
            timestamp: Math.floor(Date.now() / 1000),
            reply_count: 0,
            likes_count: 0,
            vote: 0,
            is_spoiler: payload.spoiler,
            is_edited: false,
            is_deleted: false,
          },
        ];
        fulfill(requestId, { code: 0, comment: comments[0] });
        return;
      }
      if (pathname === `/api/proxy/release/comment/edit/${COMMENT_ID}`) {
        const payload = JSON.parse(request.postData || "{}");
        comments[0] = {
          ...comments[0],
          message: payload.message,
          is_spoiler: payload.spoiler,
          is_edited: true,
        };
        fulfill(requestId, { code: 0 });
        return;
      }
      if (pathname === `/api/proxy/release/comment/delete/${COMMENT_ID}`) {
        comments = [];
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

    const commentSection = `[...document.querySelectorAll('.box')].find((node) => node.querySelector('h2')?.textContent.trim() === 'Комментарии' && node.offsetParent !== null)`;
    await send("Page.navigate", { url: `${BASE}/release/${RELEASE_ID}` });
    await waitFor(`!!${commentSection}`);
    await evaluate(`(() => {
      [...${commentSection}.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Оставить комментарий')?.click();
    })()`);
    await waitFor(`!!document.querySelector('[role="dialog"][aria-label="Новый комментарий"] textarea')`);
    await evaluate(`(() => {
      const textarea = document.querySelector('[role="dialog"][aria-label="Новый комментарий"] textarea');
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, 'Тестовый комментарий');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);

    await evaluate(`document.querySelector('[role="dialog"][aria-label="Новый комментарий"] form')?.requestSubmit()`);
    await waitFor(`document.body.innerText.includes('Не удалось отправить комментарий. Попробуйте ещё раз.')`);
    assert.equal(
      await evaluate(`document.querySelector('[role="dialog"][aria-label="Новый комментарий"] textarea')?.value`),
      "Тестовый комментарий",
      "Ошибка API очистила или закрыла форму"
    );
    assert.equal(comments.length, 0, "Неудачный запрос создал комментарий в стенде");

    addMayFail = false;
    await evaluate(`document.querySelector('[role="dialog"][aria-label="Новый комментарий"] form')?.requestSubmit()`);
    await waitFor(`!document.querySelector('[role="dialog"][aria-label="Новый комментарий"]')`);
    await waitFor(`${commentSection}?.innerText.includes('Тестовый комментарий')`);
    assert.equal(comments.length, 1);

    await evaluate(`(() => {
      [...${commentSection}.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Показать все')?.click();
    })()`);
    await waitFor(`[...document.querySelectorAll('.md')].some((node) => node.querySelector('h3')?.textContent.trim() === 'Все комментарии' && node.innerText.includes('Тестовый комментарий'))`);
    await evaluate(`(() => {
      [...document.querySelectorAll('.md')].find((node) => node.querySelector('h3')?.textContent.trim() === 'Все комментарии')?.querySelector('.mb-close')?.click();
    })()`);

    await evaluate(`(() => {
      const article = ${commentSection}.querySelector('article.comment');
      article?.querySelector('button[aria-label="Действия с комментарием"]')?.click();
    })()`);
    await waitFor(`[...document.querySelectorAll('[role="menu"] button')].some((button) => button.textContent.trim() === 'Редактировать')`);
    await evaluate(`[...document.querySelectorAll('[role="menu"] button')].find((button) => button.textContent.trim() === 'Редактировать')?.click()`);
    await waitFor(`!!document.querySelector('[role="dialog"][aria-label="Редактирование комментария"] textarea')`);
    await evaluate(`(() => {
      const textarea = document.querySelector('[role="dialog"][aria-label="Редактирование комментария"] textarea');
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, 'Изменённый комментарий');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await evaluate(`document.querySelector('[role="dialog"][aria-label="Редактирование комментария"] form')?.requestSubmit()`);
    await waitFor(`!document.querySelector('[role="dialog"][aria-label="Редактирование комментария"]')`);
    await waitFor(`${commentSection}?.innerText.includes('Изменённый комментарий')`);
    assert.equal(comments[0].message, "Изменённый комментарий");

    await evaluate(`(() => {
      const menuDelete = [...document.querySelectorAll('[role="menu"] button')].find((button) => button.textContent.trim() === 'Удалить');
      if (menuDelete) return;
      ${commentSection}.querySelector('article.comment button[aria-label="Действия с комментарием"]')?.click();
    })()`);
    await waitFor(`[...document.querySelectorAll('[role="menu"] button')].some((button) => button.textContent.trim() === 'Удалить')`);
    await evaluate(`[...document.querySelectorAll('[role="menu"] button')].find((button) => button.textContent.trim() === 'Удалить')?.click()`);
    await waitFor(`${commentSection}?.querySelector('article.comment')?.innerText.includes('Комментарий был удалён.')`);
    assert.equal(comments.length, 0);
    assert.equal(
      await evaluate(`!!${commentSection}.querySelector('article.comment button[aria-label="Действия с комментарием"]')`),
      false,
      "Удалённый комментарий оставил действия владельца"
    );

    await send("Page.navigate", { url: `${BASE}/collection/${COLLECTION_ID}` });
    await waitFor(`!!${commentSection}`);
    await evaluate(`(() => {
      [...${commentSection}.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Оставить комментарий')?.click();
    })()`);
    await waitFor(`!!document.querySelector('[role="dialog"][aria-label="Новый комментарий"] textarea')`);
    await evaluate(`(() => {
      const textarea = document.querySelector('[role="dialog"][aria-label="Новый комментарий"] textarea');
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(textarea, 'Комментарий коллекции');
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await evaluate(`document.querySelector('[role="dialog"][aria-label="Новый комментарий"] form')?.requestSubmit()`);
    await waitFor(`!document.querySelector('[role="dialog"][aria-label="Новый комментарий"]')`);
    await waitFor(`${commentSection}?.innerText.includes('Комментарий коллекции')`);

    // slice(0, 2) на странице коллекции создаёт новый props-массив при
    // каждом рендере. Скролл вызывает такой рендер без нового ответа API.
    await evaluate(`(() => {
      document.body.style.minHeight = '2200px';
      window.scrollTo(0, 300);
    })()`);
    await waitFor("window.scrollY >= 200");
    await sleep(500);
    assert.equal(
      await evaluate(`${commentSection}?.innerText.includes('Комментарий коллекции')`),
      true,
      "Повторный рендер коллекции стёр локально добавленный комментарий"
    );
    assert.ok(collectionComment);

    console.log("Ошибка API: форма осталась открытой, текст сохранён");
    console.log("Создание: комментарий появился в превью и полном списке");
    console.log("Редактирование: карточка обновилась");
    console.log("Удаление: карточка помечена, тестовые данные очищены");
    console.log("Коллекция: новый комментарий пережил повторный рендер и скролл");
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
