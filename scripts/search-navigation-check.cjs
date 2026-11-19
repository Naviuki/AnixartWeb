// Регрессия адреса поиска: при открытии не должно быть params=null и отменённых RSC-переходов.
// Запуск: node scripts/search-navigation-check.cjs
const { spawn } = require("node:child_process");
const { join } = require("node:path");

const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.ANIX_URL || "http://localhost:3000";
const PORT = 9344;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const evaluatePage = async (send) => (await send("Runtime.evaluate", {
  expression: `({ url: location.href, input: Array.from(document.querySelectorAll('main input[type=search]')).at(-1)?.value, body: document.querySelector('main')?.innerText?.slice(0, 250), releases: document.querySelectorAll('main a[href^="/release/"]').length })`,
  returnByValue: true,
})).result?.value;

async function main() {
  const chrome = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-sandbox",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${join(process.env.TEMP || "C:\\Windows\\Temp", "anix-search-navigation")}`,
    "about:blank",
  ], { stdio: "ignore" });

  try {
    let targets = null;
    for (let i = 0; i < 60; i++) {
      try {
        targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
        if (targets?.length) break;
      } catch {}
      await sleep(300);
    }
    const page = targets?.find((target) => target.type === "page");
    if (!page) throw new Error("Chrome не открыл страницу проверки");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve) => (ws.onopen = resolve));
    let sequence = 0;
    const pending = new Map();
    const requests = new Map();
    const cancelled = [];
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        pending.get(message.id)(message.result);
        pending.delete(message.id);
        return;
      }
      if (message.method === "Network.requestWillBeSent") {
        requests.set(message.params.requestId, message.params.request.url);
      }
      if (message.method === "Network.loadingFailed" && message.params.canceled) {
        const url = requests.get(message.params.requestId) || "";
        if (decodeURIComponent(url).startsWith(`${BASE}/search?`) && url.includes("_rsc=")) cancelled.push(url);
      }
    };
    const send = (method, params = {}) => new Promise((resolve) => {
      const id = ++sequence;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
    await send("Network.enable");
    await send("Runtime.enable");
    await send("Page.enable");
    await send("Page.navigate", { url: `${BASE}/search?query=${encodeURIComponent("Форма голоса")}` });
    await sleep(8000);
    const result = await send("Runtime.evaluate", {
      expression: `({ url: location.href, inputs: Array.from(document.querySelectorAll('input[type=search]')).map(input => ({ cls: input.className, value: input.value })), releases: document.querySelectorAll('main a[href^="/release/"]').length, main: document.querySelector('main')?.innerText?.slice(0, 180) })`,
      returnByValue: true,
    });
    const immediate = result?.result?.value;
    await sleep(6000);
    const settled = await send("Runtime.evaluate", {
      expression: `({ url: location.href, inputs: Array.from(document.querySelectorAll('input[type=search]')).map(input => ({ cls: input.className, value: input.value })), releases: document.querySelectorAll('main a[href^="/release/"]').length, main: document.querySelector('main')?.innerText?.slice(0, 180) })`,
      returnByValue: true,
    });
    const final = settled?.result?.value;
    const urls = Array.from(requests.values()).map((url) => decodeURIComponent(url));
    const nullParams = urls.filter((url) => /[?&]params=null(?:&|$)/.test(url));
    const checks = [
      { name: "адрес поиска никогда не содержит params=null", ok: nullParams.length === 0, detail: nullParams },
      { name: "начальная синхронизация не отменяет RSC-переход", ok: cancelled.length === 0, detail: [...cancelled] },
      { name: "поиск сохраняет запрос и выдаёт результаты", ok: final?.inputs?.some((input) => input.cls === "search" && input.value === "Форма голоса") && final?.releases > 0, detail: { immediate, settled: final } },
    ];
    for (const [name, value, expectedWhere] of [
      ["params=null не ломает поиск", "null", "releases"],
      ["неизвестная категория заменяется безопасной", JSON.stringify({ where: "unknown", searchBy: "name" }), "releases"],
      ["корректная категория сохраняется", JSON.stringify({ where: "profiles", searchBy: "none" }), "profiles"],
    ]) {
      cancelled.length = 0;
      await send("Page.navigate", { url: `${BASE}/search?query=${encodeURIComponent("Форма голоса")}&params=${encodeURIComponent(value)}` });
      await sleep(3500);
      const state = await evaluatePage(send);
      checks.push({
        name,
        ok: state?.url && JSON.parse(new URL(state.url).searchParams.get("params") || "null")?.where === expectedWhere && !cancelled.length,
        detail: { ...state, cancelled: [...cancelled] },
      });
    }
    const rscBeforeInput = Array.from(requests.values()).filter(url => url.includes("_rsc=")).length;
    await send("Runtime.evaluate", {
      expression: `(() => {
        const input = document.querySelector('.search-sticky input[type=search]');
        input.focus();
        input.select();
        return input.value;
      })()`,
    });
    await send("Input.insertText", { text: "Наруто" });
    await sleep(1500);
    const typing = await evaluatePage(send);
    checks.push({
      name: "ввод запроса обновляет адрес без RSC-запросов",
      ok: typing?.input === "Наруто" && new URL(typing.url).searchParams.get("query") === "Наруто" && Array.from(requests.values()).filter(url => url.includes("_rsc=")).length === rscBeforeInput && !cancelled.length,
      detail: typing,
    });
    console.log(JSON.stringify(checks, null, 2));
    if (checks.some((check) => !check.ok)) process.exitCode = 1;
    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
