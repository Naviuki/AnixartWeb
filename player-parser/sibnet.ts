import { asJSON, randomUA } from "./shared";

// Сеть может упасть на любом шаге (блокировка провайдера, таймаут).
// Любая ошибка здесь должна заканчиваться ответом 500, а не падением сервера.
async function tryFetch(url: string, init: RequestInit) {
  try {
    return await fetch(url, { signal: AbortSignal.timeout(20000), ...init });
  } catch {
    return null;
  }
}

export async function getSibnetURL(req, res, url: string) {
    if (!url.includes("sibnet")) {
        asJSON(req, res, { message: "SIBNET: Неправильная ссылка на плеер" }, 400);
        return
    }

    const user_agent = randomUA();

    const pageRes = await tryFetch(url, {
        headers: {
            "User-Agent": user_agent,
        },
    });
    if (!pageRes || !pageRes.ok) {
        asJSON(req, res, { message: `SIBNET: Не удалось загрузить страницу с плеером` }, 500)
        return
    }
    const pageData = await pageRes.text();
    const videoRe = /\/v\/.*?\.mp4/;
    const videoMatch = videoRe.exec(pageData);

    if (!videoMatch || videoMatch.length == 0) {
        asJSON(req, res, { message: `SIBNET: Не удалось найти данные эпизода` }, 500)
        return
    }

    const posterRe = /\/upload\/cover\/.*?\.jpg/;
    const posterMatch = posterRe.exec(pageData);

    const actualVideoRes = await tryFetch(
        `https://video.sibnet.ru${videoMatch[0]}`,
        {
            headers: {
                "User-Agent": user_agent,
                Referer: url,
            },
            redirect: "manual",
        }
    );

    if (!actualVideoRes || !actualVideoRes.headers.get("location")) {
        asJSON(req, res, { message: `SIBNET: Не удалось получить прямую ссылку` }, 500)
        return
    }

    const video = `https:${actualVideoRes.headers.get("location")}`;
    const poster =
        posterMatch ?
        posterMatch.length > 0 ?
            `https://st.sibnet.ru${posterMatch[0]}`
        : null
        : null;

    asJSON(req, res, { manifest: video, poster }, 200)
    return
}
