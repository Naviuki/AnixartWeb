import { tryCatchPlayer, tryCatchAPI } from "#/api/utils";
// sourcery skip: use-object-destructuring
// Адрес парсера источников: переменная окружения, иначе локальный сервис,
// который поднимает scripts/start-local.mjs
const ENV_PLAYER_PARSER_URL =
  process.env.NEXT_PUBLIC_PLAYER_PARSER_URL || "http://localhost:7000";

export async function _fetchAPI(
  url: string,
  onErrorMsg: string,
  setPlayerError: (state) => void,
  onErrorCodes?: Record<number, string>
) {
  const { data, error } = await tryCatchAPI(fetch(url));
  if (error) {
    let errorDetail = "Мы правда не знаем что произошло...";

    if (error.name) {
      if (error.name == "TypeError") {
        errorDetail = "Не удалось подключиться к серверу";
      } else {
        errorDetail = `Неизвестная ошибка ${error.name}: ${error.message}`;
      }
    }
    if (error.code) {
      if (Object.keys(onErrorCodes).includes(error.code.toString())) {
        errorDetail = onErrorCodes[error.code.toString()];
      } else {
        errorDetail = `API вернуло ошибку: ${error.code}`;
      }
    }

    setPlayerError({
      message: onErrorMsg,
      detail: errorDetail,
    });
    return null;
  }
  return data;
}

export async function _fetchPlayer(
  url: string,
  setPlayerError: (state) => void
) {
  let parsed: any;
  try {
    const response = await fetch(url);
    const text = await response.text();
    parsed = response.ok ?
      { data: text ? JSON.parse(text) : null, error: null }
    : { data: null, error: { message: text ? JSON.parse(text).message : "", code: response.status } };
  } catch (error: any) {
    parsed = {
      data: null,
      error: {
        name: error?.name,
        message:
          error?.name === "TypeError" ?
            "ПЛЕЕР_НЕ_ЗАПУЩЕН"
          : String(error?.message || error),
      },
    };
  }

  const { data, error } = parsed;
  if (error) {
    // Парсер отвечает 5xx с причиной на русском («KODIK: …», «SIBNET: …»),
    // сеть — TypeError. Показываем настоящую причину, а не общую фразу.
    let errorDetail = "Плеер не ответил";
    let message = "Не удалось получить ссылку на видео";

    if (error.message === "ПЛЕЕР_НЕ_ЗАПУЩЕН") {
      errorDetail =
        "Локальный парсер источников не запущен. Перезапустите сайт ярлыком «AniX (локально)» — парсер поднимется вместе с ним.";
    } else if (/^KODIK|^SIBNET|^LIBRIA/i.test(error.message || "")) {
      // Плеер источника не отдал ссылку: чаще всего видео снято или
      // провайдер блокирует запросы. Предлагаем проверенный путь.
      message = "Источник не отдал видео";
      const source = (error.message.split(":")[0] || "").trim();
      errorDetail = `${error.message}. Обычно это значит, что видео снято с ${source} или провайдер блокирует запросы; попробуйте другую озвучку или обычный плеер.`;
    } else if (error.message) {
      errorDetail = error.message;
    }

    setPlayerError({ message, detail: errorDetail });
    return null;
  }
  return data;
}

// Какой обработчик парсера подходит этому плееру. Если ни один — прямую
// ссылку получить нечем, остаётся iframe источника.
export const parserPlayerFor = (url?: string | null): string | null => {
  if (!url) return null;
  if (/kodikplayer\.com|kodik\.info|aniqit\.com|kodik\.cc|kodik\.biz/i.test(url)) {
    return "kodik";
  }
  if (/sibnet\.ru/i.test(url)) return "sibnet";
  if (/anilibria|libria\.top|libria\.wtf/i.test(url)) return "libria";
  return null;
};

// Манифест может прийти как готовая ссылка или как текст — текст скармливаем
// плееру через blob.
const toPlayableUrl = (manifest: string) => {
  if (!manifest) return null;
  if (manifest.startsWith("http")) return manifest;
  return URL.createObjectURL(
    new File([manifest], "manifest.m3u8", { type: "application/x-mpegURL" })
  );
};

// Прямая ссылка на поток для нашего <video>. Ошибку не показываем: обычный
// плеер просто останется на iframe источника.
export const _fetchDirectManifest = async (
  url: string,
  setPlayerError: (state) => void
): Promise<{ manifest: string | null; poster: string | null }> => {
  const player = parserPlayerFor(url);
  if (!player || !ENV_PLAYER_PARSER_URL) {
    return { manifest: null, poster: null };
  }

  const data = await _fetchPlayer(
    `${ENV_PLAYER_PARSER_URL}/?url=${encodeURIComponent(url)}&player=${player}`,
    setPlayerError
  );

  if (data?.manifest) {
    return {
      manifest: toPlayableUrl(data.manifest),
      poster: data.poster || null,
    };
  }
  return { manifest: null, poster: null };
};

export const _fetchKodikManifest = async (
  url: string,
  setPlayerError: (state) => void
) => {
  if (!ENV_PLAYER_PARSER_URL) {
    setPlayerError({
      message: "Встроенный плеер недоступен",
      detail: "локальный парсер источников не настроен",
    });
    return { manifest: null, poster: null };
  }

  const data = await _fetchPlayer(
    `${ENV_PLAYER_PARSER_URL}/?url=${encodeURIComponent(url)}&player=kodik`,
    setPlayerError
  );

  if (data) {
    let manifest: string = data.manifest;
    if (!manifest.startsWith("http")) {
      let file = new File([manifest], "manifest.m3u8", {
        type: "application/x-mpegURL",
      });
      manifest = URL.createObjectURL(file);
    }
    return { manifest, poster: data.poster };
  }
  return { manifest: null, poster: null };
};

export const _fetchAnilibriaManifest = async (
  url: string,
  setPlayerError: (state) => void
) => {
  if (!ENV_PLAYER_PARSER_URL) {
    setPlayerError({
      message: "Плеер не настроен",
      detail: "переменная 'NEXT_PUBLIC_PLAYER_PARSER_URL' не обнаружена",
    });
    return { manifest: null, poster: null };
  }

  const data = await _fetchPlayer(
    `${ENV_PLAYER_PARSER_URL}/?url=${encodeURIComponent(url)}&player=libria`,
    setPlayerError
  );

  if (data) {
    let file = new File([data.manifest], "manifest.m3u8", {
      type: "application/x-mpegURL",
    });
    let manifest = URL.createObjectURL(file);
    return { manifest, poster: data.poster };
  }
  return { manifest: null, poster: null };
};

export const _fetchSibnetManifest = async (
  url: string,
  setPlayerError: (state) => void
) => {
  if (!ENV_PLAYER_PARSER_URL) {
    setPlayerError({
      message: "Плеер не настроен",
      detail: "переменная 'NEXT_PUBLIC_PLAYER_PARSER_URL' не обнаружена",
    });
    return { manifest: null, poster: null };
  }

  const data = await _fetchPlayer(
    `${ENV_PLAYER_PARSER_URL}/?url=${encodeURIComponent(url)}&player=sibnet`,
    setPlayerError
  );

  if (data) {
    return { manifest: data.manifest, poster: data.poster };
  }
  return { manifest: null, poster: null };
};
