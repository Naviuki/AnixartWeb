// Обложки коллекций: пустой URL не должен превращаться в img с пустым src.
// Запуск: node scripts/collection-image-check.cjs
const { spawn } = require("node:child_process");
const { join } = require("node:path");

const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.ANIX_URL || "http://localhost:3000";
const PORT = 9346;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  let list = null;
  let lastResponse = null;
  for (let attempt = 0; attempt < 3 && !Array.isArray(list?.content); attempt++) {
    const response = await fetch(`${BASE}/api/proxy/collection/all/0`, { signal: AbortSignal.timeout(30000) });
    const text = await response.text();
    lastResponse = { status: response.status, body: text.slice(0, 300) };
    try { list = JSON.parse(text); } catch {}
    if (!Array.isArray(list?.content)) await sleep(1500);
  }
  const withoutImage = list?.content?.find((collection) => !collection.image);
  if (!withoutImage) throw new Error(`В живом списке нет коллекции без обложки для регрессии: ${JSON.stringify(lastResponse)}`);

  const chrome = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-sandbox",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${join(process.env.TEMP || "C:\\Windows\\Temp", "anix-collection-image")}`,
    "about:blank",
  ], { stdio: "ignore" });
  try {
    let targets = null;
    for (let i = 0; i < 60; i++) {
      try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (targets?.length) break; } catch {}
      await sleep(300);
    }
    const ws = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve) => (ws.onopen = resolve));
    let sequence = 0;
    let route = "";
    const pending = new Map();
    const errors = [];
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        pending.get(message.id)(message.result);
        pending.delete(message.id);
        return;
      }
      if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
        const text = (message.params.args || []).map((arg) => arg.value ?? arg.description ?? "").join(" ");
        if (/missing required "src"/i.test(text)) errors.push({ route, text });
      }
    };
    const send = (method, params = {}) => new Promise((resolve) => {
      const id = ++sequence;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true })).result?.value;
    await send("Runtime.enable");
    await send("Page.enable");
    await send("Network.enable");
    await send("Network.setCacheDisabled", { cacheDisabled: true });
    await send("Fetch.enable", { patterns: [{ urlPattern: "*api/proxy/collection/*", requestStage: "Request" }] });
    const mocked = [];
    const fulfill = async (requestId, body) => {
      mocked.push({ route, kind: body === detail ? "detail" : body.content ? "list" : "other" });
      await send("Fetch.fulfillRequest", {
        requestId,
        responseCode: 200,
        responseHeaders: [{ name: "Content-Type", value: "application/json; charset=utf-8" }],
        body: Buffer.from(JSON.stringify({ code: 0, ...body })).toString("base64"),
      });
    };
    // Список с живыми обложками сохраняем живым. Деталь без обложки проверяем
    // контролируемым ответом: внешняя ошибка не должна решать исход UI-регрессии.
    const detail = {
      collection: {
        id: withoutImage.id, image: "", title: "Коллекция без обложки", description: "",
        creator: { id: 1, login: "AniX", avatar: "" },
        creation_date: 0, last_update_date: 0, is_favorite: false, is_private: false,
      },
      completed_count: 0, plan_count: 0, dropped_count: 0, hold_on_count: 0, watching_count: 0,
    };
    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.method !== "Fetch.requestPaused") return;
      const url = message.params.request.url;
      if (!url.startsWith(`${BASE}/api/proxy/collection/${withoutImage.id}`) && !url.startsWith(`${BASE}/api/proxy/collection/comment/all/${withoutImage.id}/`)) {
        send("Fetch.continueRequest", { requestId: message.params.requestId }).catch(error => console.error(error));
        return;
      }
      const body = url.includes("/comment/all/") ? { content: [] }
        : url.includes("/releases/") ? { content: [], total_count: 0, total_page_count: 0, current_page: 0 }
        : detail;
      fulfill(message.params.requestId, body).catch(error => console.error(error));
    });
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });

    const snapshots = [];
    for (const path of ["/discovery/collections", `/collection/${withoutImage.id}`]) {
      route = path;
      await send("Page.navigate", { url: BASE + path });
      await sleep(7000);
      snapshots.push(await evaluate(`(() => {
        const missing = Array.from(document.querySelectorAll('img')).filter(img => !img.getAttribute('src')).map(img => img.outerHTML.slice(0, 200));
        const collection = Array.from(document.querySelectorAll('.coll')).find(el => el.pathname === '/collection/${withoutImage.id}') || Array.from(document.querySelectorAll('.coll')).find(el => el.querySelector('.coll-cover img:not([src]), .coll-cover > svg'));
        const placeholders = Array.from(document.querySelectorAll('.coll-cover, .collview-cover')).filter(el => el.querySelector(':scope > svg')).length;
        const pageCollection = document.querySelector('.collview-cover');
        const box = collection?.querySelector('.coll-cover') || pageCollection;
        return { missing, placeholders, withImages: document.querySelectorAll('img[src^="http"]').length, imageBoxHeight: box?.getBoundingClientRect().height || 0, text: document.querySelector('main')?.innerText?.slice(0, 140) };
      })()`));
    }
    const checks = [
      { name: "React не получает пустой src", ok: errors.length === 0, detail: errors },
      { name: "DOM не содержит изображений без src", ok: snapshots.every(snapshot => snapshot.missing.length === 0), detail: snapshots.map(snapshot => snapshot.missing) },
      { name: "на списке и странице виден заполнитель обложки", ok: snapshots.every(snapshot => snapshot.placeholders >= 1), detail: snapshots.map(snapshot => snapshot.placeholders) },
      { name: "обычные обложки остаются", ok: snapshots[0].withImages > 0, detail: snapshots.map(snapshot => snapshot.withImages) },
      { name: "пропорции области обложки сохраняются", ok: snapshots.every(snapshot => snapshot.imageBoxHeight > 0), detail: snapshots.map(snapshot => snapshot.imageBoxHeight) },
    ];
    console.log(JSON.stringify({ collection: withoutImage.id, mocked, snapshots, checks }, null, 2));
    if (checks.some(check => !check.ok)) process.exitCode = 1;
    ws.close();
  } finally { chrome.kill(); }
}

main().catch(error => { console.error(error); process.exit(1); });
