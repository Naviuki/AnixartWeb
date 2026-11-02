// Проверка одного маршрута: что ответила сеть и есть ли ошибки.
// Запуск: node scripts/net-check.cjs "/search?query=Форма голоса"
const { spawn } = require("node:child_process");
const { join } = require("node:path");

const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.ANIX_URL || "http://localhost:3000";
const PORT = 9340;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const route = process.argv[2] || "/";

async function main() {
  const chrome = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${join(process.env.TEMP || "C:\\Windows\\Temp", "anix-net")}`,
    "about:blank",
  ], { stdio: "ignore" });
  let targets = null;
  for (let i = 0; i < 60; i++) {
    try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (targets?.length) break; } catch {}
    await sleep(300);
  }
  const page = targets.find((t) => t.type === "page");
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let seq = 0;
  const pending = new Map();
  const requests = [];
  const failures = [];
  const consoleErrors = [];
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); return; }
    if (m.method === "Network.requestWillBeSent") requests.push({ id: m.params.requestId, url: m.params.request.url });
    if (m.method === "Network.responseReceived") {
      const r = requests.find((x) => x.id === m.params.requestId);
      if (r) r.status = m.params.response.status;
    }
    if (m.method === "Network.loadingFailed") failures.push(m.params.errorText);
    if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
      consoleErrors.push((m.params.args || []).map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 200));
    }
  };
  const send = (method, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });

  await send("Network.enable");
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Page.navigate", { url: BASE + route });
  await sleep(12000);

  const api = requests.filter((r) => /api\/proxy|search|release/.test(r.url)).slice(0, 20);
  console.log(JSON.stringify({ route, api, failures: failures.slice(0, 5), consoleErrors: consoleErrors.slice(0, 5) }, null, 1));
  ws.close();
  chrome.kill();
}
main().catch((e) => { console.error(e); process.exit(1); });
