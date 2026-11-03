// Проверка, можно ли получить прямую ссылку Kodik с сервера.
// node scripts/ftor-probe.cjs
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const pick = (page, name) => {
  const m = new RegExp(`var ${name} = (['"])([^'"]*)\\1`).exec(page);
  return m ? m[2] : "";
};

async function probe(pageUrl) {
  const pageRes = await fetch(pageUrl, {
    headers: { "User-Agent": UA, "Accept-Language": "ru-RU,ru;q=0.9" },
  });
  const page = await pageRes.text();
  const cookies = (pageRes.headers.getSetCookie?.() || []).join("; ");

  const parts = pageUrl.replace("https://", "").split("/");
  const [domain, type, id, hash] = [
    parts[0],
    parts[1],
    parts[2],
    parts[3],
  ];

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

  const body = new URLSearchParams(fields).toString();
  const variants = [
    {
      name: "form + XHR",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        Referer: pageUrl,
        Origin: `https://${domain}`,
        Cookie: cookies,
      },
    },
    {
      name: "form без XHR",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Referer: pageUrl,
      },
    },
  ];

  const out = [];
  for (const v of variants) {
    try {
      const res = await fetch(`https://${domain}/ftor`, {
        method: "POST",
        headers: v.headers,
        body,
        redirect: "manual",
      });
      const text = await res.text();
      out.push({
        variant: v.name,
        status: res.status,
        type: res.headers.get("content-type"),
        head: text.slice(0, 220).replace(/\s+/g, " "),
      });
    } catch (e) {
      out.push({ variant: v.name, status: 0, head: String(e.cause?.code || e.message) });
    }
  }
  return { page: pageRes.status, hasParams: Boolean(fields.d_sign), out };
}

(async () => {
  const urls = process.argv.slice(2);
  if (!urls.length) {
    console.log("нужны ссылки Kodik");
    return;
  }
  for (const url of urls) {
    console.log("\n===", url);
    console.log(JSON.stringify(await probe(url), null, 1));
  }
})();
