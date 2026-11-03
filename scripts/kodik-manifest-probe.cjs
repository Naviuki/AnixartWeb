// Полный путь: страница Kodik -> /ftor -> расшифровка -> манифест.
// node scripts/kodik-manifest-probe.cjs <ссылка Kodik>
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const pick = (page, name) => {
  const m = new RegExp(`var ${name} = (['"])([^'"]*)\\1`).exec(page);
  return m ? m[2] : "";
};

// Ровно тот же разбор, что делает плеер Kodik
const decodeSrc = (src) => {
  if (src.includes("//")) return src;
  const shifted = src.replace(/[a-zA-Z]/g, (char) => {
    const code = char.charCodeAt(0) + 18;
    const limit = char <= "Z" ? 90 : 122;
    return String.fromCharCode(limit >= code ? code : code - 26);
  });
  return Buffer.from(shifted, "base64").toString("utf8");
};

(async () => {
  const pageUrl = process.argv[2];
  if (!pageUrl) {
    console.log("нужна ссылка Kodik");
    return;
  }

  const pageRes = await fetch(pageUrl, { headers: { "User-Agent": UA } });
  const page = await pageRes.text();
  const parts = pageUrl.replace("https://", "").split("/");
  const [domain, type, id, hash] = parts;

  const fields = {
    d: pick(page, "domain") || domain,
    d_sign: pick(page, "d_sign"),
    pd: pick(page, "pd") || domain,
    pd_sign: pick(page, "pd_sign"),
    ref: "",
    ref_sign: pick(page, "ref_sign"),
    type,
    id,
    hash,
    bad_user: "false",
    cdn_is_working: "true",
  };

  const res = await fetch(`https://${domain}/ftor`, {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Referer: pageUrl,
      Origin: `https://${domain}`,
    },
    body: new URLSearchParams(fields).toString(),
  });
  const data = await res.json();

  const qualities = Object.keys(data.links || {});
  const best = qualities.sort((a, b) => Number(b) - Number(a))[0];
  const first = data.links?.[best]?.[0];
  const manifest = first ? decodeSrc(first.src) : data.link;

  let manifestProbe = null;
  if (manifest) {
    const absolute = manifest.startsWith("//") ? `https:${manifest}` : manifest;
    try {
      const mRes = await fetch(absolute, {
        headers: { "User-Agent": UA, Referer: pageUrl },
      });
      const text = await mRes.text();
      manifestProbe = {
        status: mRes.status,
        type: mRes.headers.get("content-type"),
        bytes: text.length,
        head: text.slice(0, 160).replace(/\s+/g, " "),
      };
    } catch (e) {
      manifestProbe = { error: String(e.cause?.code || e.message) };
    }
  }

  console.log(
    JSON.stringify(
      { status: res.status, qualities, manifest, manifestProbe },
      null,
      1
    )
  );
})();
