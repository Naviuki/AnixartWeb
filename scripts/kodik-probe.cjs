// Диагностика Kodik: node scripts\kodik-probe.cjs
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const pageUrl =
  "https://kodikplayer.com/video/17073/aae90fab312876792b8bfc9b81fe94a6/720p";

(async () => {
  const page = await (
    await fetch(pageUrl, { headers: { "User-Agent": UA } })
  ).text();

  // Переменные, которые страница объявляет сама
  const pick = (name) => {
    const m = new RegExp(`var ${name} = (['"])([^'"]*)\\1`).exec(page);
    return m ? m[2] : "";
  };
  const domain = pick("domain");
  const dSign = pick("d_sign");
  const pdSign = pick("pd_sign");

  // Ровно тот набор, который отправляет сам плеер
  const fields = {
    d: domain,
    d_sign: dSign,
    pd: domain,
    pd_sign: pdSign,
    ref: "",
    ref_sign: pick("ref_sign"),
    type: "video",
    id: "17073",
    hash: "aae90fab312876792b8bfc9b81fe94a6",
  };

  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, String(v));

  try {
    const res = await fetch(`https://${domain}/ftor`, {
      method: "POST",
      body: fd,
      headers: { "User-Agent": UA, Referer: pageUrl },
    });
    const text = await res.text();
    console.log("status", res.status);
    console.log(text.slice(0, 400));
  } catch (e) {
    console.log("ERR", e.cause?.code || e.message);
  }
})();
