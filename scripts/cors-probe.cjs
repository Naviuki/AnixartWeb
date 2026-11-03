// Проверяем, отдаёт ли CDN Kodik CORS — можно ли играть манифест в браузере.
// node scripts/cors-probe.cjs
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const manifest =
  "https://sky.solodcdn.com/animes/81c6e57355f57ce0061c421f1e70950e297e043b/874d13480a5173e7d486e9c36e235a29:2026110404/480.mp4:hls:manifest.m3u8";

(async () => {
  const res = await fetch(manifest, {
    headers: { "User-Agent": UA, Origin: "http://localhost:3000" },
  });
  const text = await res.text();
  const firstSegment = text
    .split("\n")
    .find((line) => line && !line.startsWith("#"));

  const out = {
    manifest: {
      status: res.status,
      acao: res.headers.get("access-control-allow-origin"),
      acac: res.headers.get("access-control-allow-credentials"),
      type: res.headers.get("content-type"),
    },
    segment: null,
  };

  if (firstSegment) {
    const url = new URL(firstSegment, manifest).toString();
    const segRes = await fetch(url, {
      headers: { "User-Agent": UA, Origin: "http://localhost:3000" },
    });
    out.segment = {
      url: url.slice(0, 100),
      status: segRes.status,
      acao: segRes.headers.get("access-control-allow-origin"),
      type: segRes.headers.get("content-type"),
      len: segRes.headers.get("content-length"),
    };
  }

  console.log(JSON.stringify(out, null, 1));
})();
