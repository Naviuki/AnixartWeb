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
  const { data, error } = (await tryCatchPlayer(fetch(url))) as any;
  if (error) {
    // Парсер отвечает 5xx с причиной на русском («SIBNET: страница недоступна»),
    // сеть — TypeError. Показываем именно это, а не общую фразу.
    let errorDetail = "Плеер не ответил";
    if (error.name === "TypeError") {
      errorDetail =
        "Локальный парсер источников не запущен. Перезапустите сайт ярлыком «AniX (локально)» — парсер поднимется вместе с ним.";
    } else if (error.message) {
      errorDetail = error.message;
    }

    setPlayerError({
      message: "Не удалось получить ссылку на видео",
      detail: errorDetail,
    });
    return null;
  }
  return data;
}

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

  // Сервер принимает домены kodik.info и kodik.cc, поэтому kodikplayer.com переводится сам
  const parserUrl = url.replace(/kodikplayer\.com/, "kodik.info");

  const data = await _fetchPlayer(
    `${ENV_PLAYER_PARSER_URL}/?url=${encodeURIComponent(parserUrl)}&player=kodik`,
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
    `${ENV_PLAYER_PARSER_URL}/?url=${url}&player=sibnet`,
    setPlayerError
  );

  if (data) {
    return { manifest: data.manifest, poster: data.poster };
  }
  return { manifest: null, poster: null };
};
