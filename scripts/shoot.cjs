// Снимки живого сайта в двух размерах: 1440 (десктоп) и 390 (телефон).
// Запуск: node scripts/shoot.cjs [маршрут ...]
// Картинки кладутся в .shots/ (в git не попадают).
const { execFileSync } = require("node:child_process");
const { mkdirSync, rmSync, existsSync } = require("node:fs");
const { join } = require("node:path");

const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE = process.env.ANIX_URL || "http://localhost:3000";
const OUT = join(__dirname, "..", ".shots");
const PROFILE = join(process.env.TEMP || "C:\\Windows\\Temp", "anix-chrome-live");

mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { key: "desktop", w: 1440, h: 1000 },
  { key: "mobile", w: 390, h: 844 },
];

const routes = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "/",
      "/discovery",
      "/search",
      "/release/2013",
      "/profile/3610931",
      "/notifications",
      "/about",
      "/bookmarks",
      "/collections",
      "/history",
      "/discovery/filter",
    ];

for (const vp of VIEWPORTS) {
  for (const route of routes) {
    const name = (route === "/" ? "index" : route.replace(/\//g, "_")).replace(/^_/, "");
    const target = join(OUT, `${name}-${vp.key}.png`);
    if (existsSync(target)) rmSync(target);
    execFileSync(
      CHROME,
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--no-sandbox",
        "--force-device-scale-factor=1",
        `--user-data-dir=${PROFILE}`,
        `--window-size=${vp.w},${vp.h}`,
        "--screenshot=" + target,
        `${BASE}${route}`,
      ],
      { stdio: "ignore", timeout: 120000 }
    );
    console.log("ok", `${name}-${vp.key}.png`);
  }
}
console.log("done");
