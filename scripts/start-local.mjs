#!/usr/bin/env node
// AniX — локальный запуск сайта.
// ПК пользователя сам является сервером сайта и прокси к API Anixart:
// скрипт поднимает Next.js-сервер (npm run dev), а встроенный middleware.ts
// пересылает все запросы /api/proxy/* с этого ПК на API Anixart.
//
// Что делает скрипт:
//  1. проверяет версию Node.js (нужна 18+);
//  2. при первом запуске устанавливает зависимости (npm install);
//  3. если рядом лежит anix-player-parser — поднимает и его, чтобы встроенный
//     плеер искал источники сам (без него встроенный плеер честно скажет,
//     что источник недоступен);
//  4. запускает dev-сервер и ждёт его готовности;
//  5. открывает сайт в браузере по умолчанию.
//
// Запуск: npm run local | node scripts/start-local.mjs | ярлык «AniX (локально)»
// Запуск без открытия браузера: ANIX_NO_BROWSER=1
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IS_WIN = process.platform === "win32";
const NPM = IS_WIN ? "npm.cmd" : "npm";
const DEFAULT_URL = "http://localhost:3000";
const READY_TIMEOUT_MS = 5 * 60 * 1000;

const log = (msg) => console.log("[AniX]", msg);
const err = (msg) => console.error("[AniX]", msg);
function checkNodeVersion() {
  const major = Number(process.versions.node.split(".")[0]);
  if (major < 18) {
    err(
      "Найден Node.js " +
        process.versions.node +
        ", требуется 18 или новее. Обновите: https://nodejs.org"
    );
    process.exit(1);
  }
}

function installDeps() {
  log(
    "Первый запуск: устанавливаю зависимости (npm install), это может занять несколько минут..."
  );
  const res = spawnSync(NPM, ["install"], {
    cwd: ROOT,
    stdio: "inherit",
    shell: IS_WIN,
  });
  if (res.status !== 0) {
    err("Не удалось установить зависимости. Проверьте интернет и запустите снова.");
    process.exit(res.status ?? 1);
  }
}

async function isUp(probeUrl) {
  try {
    await fetch(probeUrl, { signal: AbortSignal.timeout(30000) });
    return true;
  } catch {
    return false;
  }
}

// Парсер источников плеера (kodik / libria / sibnet) — соседний проект.
// Он нужен встроенному плееру; без него плеер честно сообщает об ошибке.
const PARSER_URL =
  process.env.NEXT_PUBLIC_PLAYER_PARSER_URL || "http://localhost:7000";
const PARSER_PORT = Number(new URL(PARSER_URL).port || 7000);

// Парсер с заданным плеером без url отвечает 400 — этого достаточно, чтобы
// понять, что он жив и слушает порт
async function isParserUp() {
  try {
    const response = await fetch(PARSER_URL + "/?player=kodik", {
      signal: AbortSignal.timeout(5000),
    });
    return response.status > 0;
  } catch {
    return false;
  }
}

function findParserDir() {
  const candidates = [
    process.env.ANIX_PARSER_DIR,
    join(ROOT, "player-parser"),
    join(ROOT, "..", "anix-player-parser"),
  ].filter(Boolean);
  return candidates.find((dir) => existsSync(join(dir, "package.json")));
}

async function startParser() {
  if (await isParserUp()) {
    log("Парсер плеера уже запущен: " + PARSER_URL);
    return;
  }
  const dir = findParserDir();
  if (!dir) {
    log("Парсер плеера не найден — встроенный плеер будет недоступен. Обычный плеер работает.");
    return;
  }
  if (!existsSync(join(dir, "node_modules"))) {
    log("Устанавливаю зависимости парсера плеера...");
    spawnSync(NPM, ["install"], { cwd: dir, stdio: "inherit", shell: IS_WIN });
  }
  log("Запускаю парсер плеера на " + PARSER_URL);
  const child = spawn(NPM, ["run", "serve"], {
    cwd: dir,
    stdio: ["ignore", "pipe", "inherit"],
    shell: IS_WIN,
    env: { ...process.env, PORT: String(PARSER_PORT) },
  });
  child.stdout.on("data", (chunk) =>
    process.stdout.write("[парсер] " + chunk.toString())
  );
  children.push(child);
  child.on("exit", (code) => {
    if (code) err("Парсер плеера остановился (код " + code + ").");
  });
  // Даём парсеру время подняться, но не блокируем сайт
  const startedAt = Date.now();
  while (Date.now() - startedAt < 30000) {
    if (await isParserUp()) {
      log("Парсер плеера готов.");
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  err("Парсер плеера не ответил за 30 секунд — встроенный плеер может не работать.");
}
function openBrowser(url) {
  if (process.env.ANIX_NO_BROWSER === "1") {
    log("Браузер не открывается (ANIX_NO_BROWSER=1). Адрес сайта: " + url);
    return;
  }
  log("Открываю браузер: " + url);
  if (IS_WIN) spawn("cmd.exe", ["/c", "start", "", url], { stdio: "ignore" });
  else if (process.platform === "darwin") spawn("open", [url], { stdio: "ignore" });
  else spawn("xdg-open", [url], { stdio: "ignore" });
}

function killTree(child, code) {
  if (IS_WIN) {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
  } else {
    child.kill("SIGTERM");
  }
  process.exit(code);
}

// Дочерние процессы, которые нужно гасить вместе со скриптом
const children = [];
function shutdown(code) {
  for (const child of children) {
    if (!child.pid || child.killed) continue;
    if (IS_WIN) {
      spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
        stdio: "ignore",
      });
    } else {
      child.kill("SIGTERM");
    }
  }
  process.exit(code);
}

async function main() {
  checkNodeVersion();
  if (!existsSync(join(ROOT, "node_modules"))) installDeps();

  // Парсер плеера поднимаем первым: dev-сервер при старте сразу его увидит
  await startParser();

  log(
    "Запускаю локальный сервер: ваш ПК сам будет сервером сайта и прокси к API Anixart..."
  );
  const dev = spawn(NPM, ["run", "dev"], {
    cwd: ROOT,
    stdio: ["inherit", "pipe", "inherit"],
    shell: IS_WIN,
    // Адрес парсера передаём клиенту, иначе встроенный плеер его не найдёт
    env: { ...process.env, NEXT_PUBLIC_PLAYER_PARSER_URL: PARSER_URL },
  });
  children.push(dev);

  let url = DEFAULT_URL;
  dev.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
    const match = chunk
      .toString()
      .match(/https?:\/\/(?:localhost|127\.0\.0\.1):\d+/);
    if (match) url = match[0];
  });

  dev.on("exit", (code) => {
    err("Сервер остановлен (код " + code + ").");
    shutdown(code ?? 0);
  });
  process.on("SIGINT", () => shutdown(0));
  process.on("SIGTERM", () => shutdown(0));
  process.on("SIGHUP", () => shutdown(0));

  const startedAt = Date.now();
  while (Date.now() - startedAt < READY_TIMEOUT_MS) {
    if (await isUp(url + "/api/version")) {
      log("Локальная версия сайта полностью рабочая: " + url);
      log(
        "Не закрывайте это окно, пока пользуетесь сайтом. Остановка: Ctrl+C или закрыть окно."
      );
      openBrowser(url);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  err(
    "Сервер не ответил за " + READY_TIMEOUT_MS / 1000 + " секунд. Смотрите лог выше."
  );
  shutdown(1);
}

main();
