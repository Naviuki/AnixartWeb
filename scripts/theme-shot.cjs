// Снимок страницы в заданной теме: node scripts/theme-shot.cjs /about light
const { spawn } = require("node:child_process");
const { writeFileSync, mkdirSync } = require("node:fs");
const { join } = require("node:path");

const CHROME = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.ANIX_URL || "http://localhost:3000";
const OUT = join(__dirname, "..", ".shots");
const PORT = 9341;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const route = process.argv[2] || "/";
const theme = process.argv[3] || "dark";
const width = Number(process.argv[4] || 1440);

async function main() {
  mkdirSync(OUT, { recursive: true });
  const chrome = spawn(CHROME, [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${join(process.env.TEMP || "C:\\Windows\\Temp", "anix-theme-" + theme)}`,
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
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
  };
  const send = (method, params = {}) => new Promise((res) => { const id = ++seq; pending.set(id, res); ws.send(JSON.stringify({ id, method, params })); });

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width < 800 });
  await send("Page.navigate", { url: BASE + "/" });
  await sleep(3500);
  await send("Runtime.evaluate", { expression: `(() => {
    const p = JSON.parse(localStorage.getItem('preferences') || '{}');
    p.state = p.state || {};
    p.state.params = { ...(p.state.params || {}), isFirstLaunch: false };
    p.state.appearance = { ...(p.state.appearance || {}), theme: '${theme}' };
    localStorage.setItem('preferences', JSON.stringify(p));
    return true;
  })()` });
  await send("Page.navigate", { url: BASE + route });
  await sleep(5000);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  const name = (route === "/" ? "index" : route.replace(/\//g, "_").replace(/^_/, "")) + "-" + theme;
  const file = join(OUT, `${name}.png`);
  writeFileSync(file, Buffer.from(shot.data, "base64"));
  console.log(file);
  ws.close();
  chrome.kill();
}
main().catch((e) => { console.error(e); process.exit(1); });
