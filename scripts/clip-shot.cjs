// Скриншот одного элемента страницы в увеличенном виде.
// node scripts/clip-shot.cjs /release/2013 ".infogrid" .shots/infogrid.png 3
const { spawn } = require("node:child_process");
const { join, dirname } = require("node:path");
const { mkdirSync, writeFileSync } = require("node:fs");

const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.ANIX_URL || "http://localhost:3000";
const [route = "/", selector = ".infogrid", out = ".shots/clip.png", scale = "3"] =
  process.argv.slice(2);
const PORT = 9350;
const VIEWPORT_WIDTH = Number(process.env.ANIX_WIDTH || 1440);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${join(process.env.TEMP || ".", "anix-clip")}`,
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let target = null;
  for (let i = 0; i < 60 && !target; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === "page");
    } catch {}
    if (!target) await sleep(300);
  }
  if (!target) throw new Error("Chrome не запустился");

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let seq = 0;
  const pending = new Map();
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg.result);
      pending.delete(msg.id);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve) => {
      const id = ++seq;
      pending.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  const evalJs = async (expression) => {
    const r = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return r.result?.value;
  };

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: VIEWPORT_WIDTH,
    height: 900,
    deviceScaleFactor: 1,
    mobile: VIEWPORT_WIDTH < 600,
  });
  await send("Page.navigate", { url: BASE + route });
  await sleep(1500);
  for (let i = 0; i < 25; i++) {
    const ready = await evalJs(
      `Boolean(document.querySelector('.app main')?.innerText?.trim().length > 40)`
    );
    if (ready) break;
    await sleep(400);
  }
  // закрываем журнал изменений, если он перекрывает страницу
  await evalJs(
    `(() => { const b = document.querySelector('.md .mb-close'); if (b) b.click(); return true; })()`
  );
  await sleep(600);

  const rect = await evalJs(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + window.scrollX, y: r.y + window.scrollY, width: r.width, height: r.height };
  })()`);
  if (!rect) throw new Error(`Не найден элемент ${selector}`);
  await evalJs(`window.scrollTo(0, ${Math.max(0, rect.y - 40)})`);
  await sleep(300);

  const width = Number(scale);
  const shot = await send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: {
      x: rect.x,
      y: rect.y,
      width: Math.ceil(rect.width),
      height: Math.ceil(rect.height),
      scale: width,
    },
  });

  const file = join(process.cwd(), out);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(shot.data, "base64"));
  console.log(file);
  ws.close();
  chrome.kill();
})().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
