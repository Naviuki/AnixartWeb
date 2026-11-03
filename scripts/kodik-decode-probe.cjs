// Ищем в плеере Kodik функцию расшифровки прямых ссылок.
// node scripts/kodik-decode-probe.cjs
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const pageUrl =
  "https://kodikplayer.com/video/17069/4b4fc1e7875ff18fb72af0a7d450cb8f/720p";

(async () => {
  const page = await (
    await fetch(pageUrl, { headers: { "User-Agent": UA } })
  ).text();
  const script = /<script[^>]+src="([^"]*app\.player_single[^"]*)"/.exec(page);
  const js = await (
    await fetch("https://kodikplayer.com" + script[1], {
      headers: { "User-Agent": UA },
    })
  ).text();

  const report = { length: js.length, hits: [] };
  for (const needle of ["fromCharCode", "links", "decode", "atob("]) {
    const index = js.indexOf(needle);
    report.hits.push({
      needle,
      index,
      context:
        index < 0 ?
          null
        : js.slice(Math.max(0, index - 260), index + 260),
    });
  }

  // Отдельно: набор функций рядом с обработкой links
  const linksIndex = js.indexOf('.links');
  report.linksAround =
    linksIndex < 0 ? null : js.slice(
      Math.max(0, linksIndex - 500),
      linksIndex + 700
    );

  console.log(JSON.stringify(report, null, 1));
})();
