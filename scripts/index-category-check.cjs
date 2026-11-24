// Сбой /filter не должен ронять категорию: начальная загрузка и следующая
// страница показывают сообщение, сохраняют доступные карточки и позволяют повторить запрос.
// Нужен запущенный http://localhost:3000.
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const BASE = process.env.ANIX_URL || "http://localhost:3000";
const PORT = 9391;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const release = (id, title) => ({
  id,
  image: "/images/icons/icon-512x512.png",
  title_ru: title,
  title_original: title,
  grade: 5,
  status: { id: 2, name: "Выходит" },
  category: { name: "Сериал" },
  episodes_released: "1",
  episodes_total: "12",
});

async function main() {
  const health = await fetch(`${BASE}/api/version`, {
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(health.ok, true, "Сначала нужен работающий локальный сервер");

  const profile = mkdtempSync(join(tmpdir(), "anix-index-category-"));
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
    const runtimeErrors = [];
    const filterRequests = [];
    let sequence = 0;
    let mode = "initialError";
    const send = (method, params = {}) =>
      new Promise((resolve, reject) => {
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
      if (message.method === "Runtime.exceptionThrown") {
        runtimeErrors.push(
          message.params.exceptionDetails.exception?.description ||
            message.params.exceptionDetails.text
        );
      }
      if (message.method !== "Fetch.requestPaused") return;

      const { requestId, request } = message.params;
      const pathname = new URL(request.url).pathname;
      if (!pathname.startsWith("/api/proxy/filter/")) {
        send("Fetch.continueRequest", { requestId }).catch(() => {});
        return;
      }

      filterRequests.push({ pathname, mode });
      const isError = mode === "initialError" || mode === "nextError";
      const content =
        mode === "nextSuccess" ?
          [release(9002, "Второй тестовый релиз")]
        : [release(9001, "Первый тестовый релиз")];
      const body =
        isError ?
          { message: "API Returned an Error", code: 500, httpStatus: 500 }
        : { code: 0, content };
      send("Fetch.fulfillRequest", {
        requestId,
        responseCode: isError ? 500 : 200,
        responseHeaders: [
          { name: "Content-Type", value: "application/json" },
        ],
        body: Buffer.from(JSON.stringify(body)).toString("base64"),
      }).catch(() => {});
    };

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
    const waitFor = async (expression, timeout = 45000) => {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        const value = await evaluate(expression);
        if (value) return value;
        await sleep(250);
      }
      throw new Error(`Не выполнено условие: ${expression}`);
    };
    const clickButton = async (text) => {
      await evaluate(`(() => {
        const button = [...document.querySelectorAll('button')]
          .find((item) => item.textContent.trim() === ${JSON.stringify(text)});
        button?.click();
      })()`);
    };

    await send("Runtime.enable");
    await send("Page.enable");
    await send("Fetch.enable", {
      patterns: [{ urlPattern: "*api/proxy/filter/*" }],
    });
    await send("Emulation.setDeviceMetricsOverride", {
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source: `
        if (location.origin === ${JSON.stringify(BASE)}) {
          localStorage.setItem('preferences', JSON.stringify({ state: {
            params: { isFirstLaunch: false, experimental: { newPlayer: false } },
            flags: { showChangelog: false }
          }, version: 2 }));
        }
      `,
    });

    await send("Page.navigate", { url: `${BASE}/home/last` });
    await waitFor(`document.querySelector('[role="alert"]')?.innerText.includes('Не удалось получить список релизов')`);
    assert.equal(
      await evaluate("document.querySelectorAll('nextjs-portal').length"),
      0,
      "Ошибка API не должна открывать Next.js runtime overlay"
    );

    mkdirSync(".shots", { recursive: true });
    const errorShot = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(
      ".shots/index-category-error.png",
      Buffer.from(errorShot.data, "base64")
    );

    mode = "initialSuccess";
    await clickButton("Повторить");
    await waitFor(`document.querySelector('.grid')?.innerText.includes('Первый тестовый релиз')`);
    assert.equal(
      await evaluate("document.querySelectorAll('[role=\"alert\"]').length"),
      0
    );

    mode = "nextError";
    await clickButton("Загрузить ещё");
    await waitFor(`document.querySelector('[role="alert"]')?.innerText.includes('Не удалось загрузить следующую страницу')`);
    assert.equal(
      await evaluate("document.querySelector('.grid')?.innerText.includes('Первый тестовый релиз')"),
      true,
      "Ошибка следующей страницы не должна удалять уже загруженные карточки"
    );

    mode = "nextSuccess";
    await clickButton("Повторить");
    await waitFor("document.querySelectorAll('.rcard').length === 2");
    assert.equal(
      await evaluate("document.querySelector('.grid')?.innerText.includes('Второй тестовый релиз')"),
      true
    );
    assert.deepEqual(
      filterRequests.map((item) => item.pathname),
      [
        "/api/proxy/filter/0",
        "/api/proxy/filter/0",
        "/api/proxy/filter/1",
        "/api/proxy/filter/1",
      ]
    );
    assert.deepEqual(runtimeErrors, [], runtimeErrors.join("\n"));

    const recoveredShot = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(
      ".shots/index-category-recovered.png",
      Buffer.from(recoveredShot.data, "base64")
    );

    console.log("Первая страница: ошибка показана без runtime exception, повтор успешен");
    console.log("Следующая страница: карточки сохранены, повтор запросил тот же page=1");
    console.log("Скриншоты: .shots/index-category-error.png и index-category-recovered.png");
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
      console.warn(`Не удалось удалить временный профиль: ${error.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
