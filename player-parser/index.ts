import { asJSON, cacheGet, cacheSet } from "./shared";
import { getAnilibriaURL } from "./libria";
import { getSibnetURL } from "./sibnet";
import { getKodikURL } from "./kodik";

import express from "express";
const app = express();

// Один сбойный источник (недоступный домен, таймаут) не должен ронять
// сервер: без него встроенный плеер остаётся без источников вовсе.
process.on("unhandledRejection", (reason) => {
  console.error("[parser] unhandledRejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[parser] uncaughtException:", error);
});

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Allow, User-Agent"
  );
  res.header("Access-Control-Allow-Methods", "GET,HEAD,POST,OPTIONS");
  next();
});

// По умолчанию слушаем только этот ПК: сайт локальный, наружу открывать нечего.
// Нужен доступ извне — задайте HOST=0.0.0.0.
const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT) || 7000;
const allowedPlayers = ["kodik", "libria", "sibnet"];

// Проверка «жив ли парсер» — без обращения к источникам
app.get("/health", function (req, res) {
  asJSON(req, res, { ok: true, players: allowedPlayers }, 200);
});

// Источники отвечают асинхронно и по HTTP-объекту ответа. Чтобы положить
// удачный результат в кэш, подменяем ответ накопителем: он запоминает код и
// тело, а наружу пишет уже маршрут.
function makeSink() {
  const sink: any = {
    statusCode: 200,
    headersSent: false,
    payload: null,
    status(code: number) {
      sink.statusCode = code;
      return sink;
    },
    type() {
      return sink;
    },
    set() {
      return sink;
    },
    send(body: any) {
      sink.headersSent = true;
      try {
        sink.payload = JSON.parse(body);
      } catch {
        sink.payload = { message: String(body) };
      }
      return sink;
    },
  };
  return sink;
}

app.get("/", async (req, res) => {
  const urlParams = new URLSearchParams(req.query as any);
  const url = urlParams.get("url");
  const player = urlParams.get("player");

  if (!url) {
    asJSON(req, res, { message: "no 'url' query provided" }, 400);
    return;
  }

  if (!player) {
    asJSON(req, res, { message: "no 'player' query provided" }, 400);
    return;
  }

  if (!allowedPlayers.includes(player)) {
    asJSON(
      req,
      res,
      {
        message: `player '${player}' is not supported. choose one of: ${allowedPlayers.join(", ")}`,
      },
      400
    );
    return;
  }

  const cacheKey = `${player}:${url}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    asJSON(req, res, cached, 200);
    return;
  }

  const sink = makeSink();
  try {
    switch (player) {
      case "libria":
        await getAnilibriaURL(req, sink, url);
        break;
      case "sibnet":
        await getSibnetURL(req, sink, url);
        break;
      case "kodik":
        await getKodikURL(req, sink, url);
        break;
    }
  } catch (error) {
    asJSON(
      req,
      res,
      { message: `Не удалось получить ссылку: ${String((error as any)?.message || error)}` },
      500
    );
    return;
  }

  if (!sink.payload) {
    asJSON(req, res, { message: "Источник не вернул данных" }, 500);
    return;
  }

  if (sink.statusCode === 200 && sink.payload.manifest) {
    cacheSet(cacheKey, sink.payload);
  }
  asJSON(req, res, sink.payload, sink.statusCode);
});

const server = app.listen(PORT, HOST, function () {
  console.log(`Server listens http://${HOST}:${PORT}`);
});

// Закрытие вместе с сайтом: без этого порт 7000 остаётся занятым и
// следующий запуск ярлыка поднимает парсер «в никуда».
function stop() {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
process.on("SIGHUP", stop);
