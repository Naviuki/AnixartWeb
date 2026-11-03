// Проверяем Sibnet: отдаёт ли страницу плеера при разных заголовках.
// node scripts/sibnet-probe.cjs
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const url = "https://video.sibnet.ru/shell.php?videoid=2926334";

const variants = [
  { name: "как есть", headers: { "User-Agent": UA } },
  {
    name: "Referer sibnet",
    headers: { "User-Agent": UA, Referer: "https://video.sibnet.ru/" },
  },
  {
    name: "Referer anixart",
    headers: { "User-Agent": UA, Referer: "https://anixart.tv/" },
  },
  {
    name: "браузерный набор",
    headers: {
      "User-Agent": UA,
      Referer: "https://video.sibnet.ru/",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "iframe",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "cross-site",
    },
  },
];

(async () => {
  const out = [];
  for (const variant of variants) {
    try {
      const res = await fetch(url, { headers: variant.headers });
      const text = await res.text();
      out.push({
        variant: variant.name,
        status: res.status,
        bytes: text.length,
        video: /\/v\/.*?\.mp4/.exec(text)?.[0] || null,
        head: text.slice(0, 90).replace(/\s+/g, " "),
      });
    } catch (e) {
      out.push({ variant: variant.name, status: 0, error: String(e.cause?.code || e.message) });
    }
  }
  console.log(JSON.stringify(out, null, 1));
})();
