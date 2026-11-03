import { asJSON, randomUA, readJSON } from "./shared";
const altDomains = ["kodikplayer.com", "kodik.info", "aniqit.com", "kodik.cc", "kodik.biz"];

// Домены ked могут не резолвиться (блокировка у провайдера). Сеть может
// упасть на любом шаге, поэтому каждый запрос оборачиваем и пробуем
// следующее зеркало вместо падения всего сервера.
async function tryFetch(url: string, userAgent: string) {
  try {
    return await fetch(url, {
      headers: { "User-Agent": userAgent },
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    return null;
  }
}

export async function getKodikURL(req, res, url: string) {
  const origDomain = url.replace("https://", "").split("/")[0];
  let domain = origDomain;

  if (!altDomains.includes(domain)) {
    asJSON(req, res, { message: "KODIK: Неправильная ссылка на плеер" }, 400);
    return;
  }

  // Сначала исходный домен, затем остальные зеркала
  const candidates = [domain, ...altDomains.filter((item) => item !== domain)];

  let user_agent = randomUA();
  let pageRes: Response | null = null;
  let pageData = "";

  for (const candidate of candidates) {
    user_agent = randomUA();
    const candidateUrl = url.replace(`https://${origDomain}/`, `https://${candidate}/`);
    const response = await tryFetch(candidateUrl, user_agent);
    if (response && response.ok) {
      pageRes = response;
      domain = candidate;
      pageData = await response.text();
      break;
    }
  }

  if (!pageRes) {
    asJSON(
      req,
      res,
      { message: "KODIK: Не удалось загрузить страницу с плеером" },
      500
    );
    return;
  }

  const urlParamsRe = /var urlParams = .*;$/m;
  const urlParamsMatch = urlParamsRe.exec(pageData);

  if (!urlParamsMatch || urlParamsMatch.length == 0) {
    asJSON(req, res, { message: `KODIK: Не удалось найти данные эпизода` }, 500);
    return;
  }

  const urlParamsStr = urlParamsMatch[0]
    .replace("var urlParams = '", "")
    .replace("';", "");

  const urlStr = url.replace(`https://${origDomain}/`, "");
  const type = urlStr.split("/")[0];
  const id = urlStr.split("/")[1];
  const hash = urlStr.split("/")[2];

  let urlParams: Record<string, any>;
  try {
    urlParams = JSON.parse(urlParamsStr);
  } catch {
    asJSON(req, res, { message: "KODIK: Не удалось прочитать данные эпизода" }, 500);
    return;
  }
  urlParams["type"] = type;
  urlParams["id"] = id;
  urlParams["hash"] = hash;

  // Плеер Kodik отправляет форму как urlencoded (jQuery $.ajax). С multipart
  // сервер отвечает 404, поэтому кодируем тело вручную.
  const formBody = new URLSearchParams();
  for (const [key, value] of Object.entries(urlParams)) {
    formBody.append(key, String(value));
  }

  let linksRes: Response | null = null;
  try {
    linksRes = await fetch(`https://${domain}/ftor`, {
      method: "POST",
      body: formBody.toString(),
      headers: {
        "User-Agent": user_agent,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Referer: url,
        Origin: `https://${domain}`,
      },
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    linksRes = null;
  }

  if (!linksRes || !linksRes.ok) {
    asJSON(req, res, { message: `KODIK: Не удалось получить прямую ссылку` }, 500);
    return;
  }

  let data;
  try {
    data = stripResponse(await readJSON(linksRes));
  } catch {
    asJSON(req, res, { message: `KODIK: Ответ сервера непонятен` }, 500);
    return;
  }

  if (!data.links || !data.links[data.default] || !data.links[data.default][0]) {
    asJSON(req, res, { message: `KODIK: Не удалось получить прямую ссылку` }, 500);
    return;
  }

  if (isEncrypted(data)) {
    try {
      for (const [key] of Object.entries(data.links)) {
        (data.links as any)[key][0].src = decryptSrc((data.links as any)[key][0].src);
      }
    } catch {
      asJSON(req, res, { message: `KODIK: Не удалось расшифровать ссылку` }, 500);
      return;
    }
  }

  if (!hasProto(data)) {
    for (const [key] of Object.entries(data.links)) {
      data.links[key][0].src = addProto(data.links[key][0].src);
    }
  }

  if (!isAnimeTvSeries(data)) {
    data["manifest"] = data.links[data.default][0].src.replace(
      `${data.default}.mp4:hls:`,
      ""
    );
  } else {
    data["manifest"] = createManifest(data);
  }

  data["poster"] = data.links[data.default][0].src.replace(
    `${data.default}.mp4:hls:manifest.m3u8`,
    "thumb001.jpg"
  );

  asJSON(req, res, data, 200);
  return;
}

function stripResponse(data) {
  return {
    default: data.default,
    links: data.links,
  };
}

function isEncrypted(data) {
  return !data.links[data.default][0].src.includes("//");
}

function decryptSrc(enc: string) {
  const decryptedBase64 = enc.replace(/[a-zA-Z]/g, (e: any) => {
    return String.fromCharCode(
      (e <= "Z" ? 90 : 122) >= (e = e.charCodeAt(0) + 18) ? e : e - 26
    );
  });
  return atob(decryptedBase64);
}

function hasProto(data) {
  return data.links[data.default][0].src.startsWith("http");
}

function addProto(string) {
  return `https:${string}`;
}

function isAnimeTvSeries(data) {
  return (
    data.links[data.default][0].src.includes("animetvseries") ||
    data.links[data.default][0].src.includes("tvseries")
  );
}

function createManifest(data) {
  const resolutions = {
    240: "427x240",
    360: "578x360",
    480: "854x480",
    720: "1280x720",
    1080: "1920x1080",
  };

  const stringBuilder: string[] = [];

  stringBuilder.push("#EXTM3U");
  for (const [key] of Object.entries(data.links)) {
    stringBuilder.push(`#EXT-X-STREAM-INF:RESOLUTION=${resolutions[key]}`);
    stringBuilder.push(data.links[key][0].src);
  }

  return stringBuilder.join("\n");
}
