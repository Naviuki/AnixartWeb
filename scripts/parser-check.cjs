// Проверка парсера источников: жив ли он и что отвечает на реальные ссылки.
// node scripts/parser-check.cjs
const PARSER = process.env.NEXT_PUBLIC_PLAYER_PARSER_URL || "http://localhost:7000";

const shot = async (name, params) => {
  const query = new URLSearchParams(params).toString();
  const startedAt = Date.now();
  try {
    const response = await fetch(`${PARSER}/?${query}`, {
      signal: AbortSignal.timeout(30000),
    });
    const text = await response.text();
    return {
      name,
      status: response.status,
      ms: Date.now() - startedAt,
      ok: response.ok,
      body: text.slice(0, 160),
    };
  } catch (error) {
    return { name, status: 0, ok: false, body: String(error.message || error) };
  }
};

(async () => {
  const alive = await shot("жив", {});
  const results = [alive];

  results.push(
    await shot("kodik", {
      url: "https://kodikplayer.com/video/17073/aae90fab312876792b8bfc9b81fe94a6/720p",
      player: "kodik",
    })
  );
  results.push(
    await shot("sibnet", {
      url: "https://video.sibnet.ru/shell.php?videoid=2926334",
      player: "sibnet",
    })
  );
  results.push(await shot("битый домен", { url: "https://nope.invalid/x", player: "kodik" }));
  // После всех ошибок сервер обязан остаться живым
  const after = await shot("жив после ошибок", {});

  const died = after.status === 0;
  console.log(
    JSON.stringify(
      {
        parserResponds: alive.status === 400,
        survivedErrors: !died,
        results,
      },
      null,
      1
    )
  );
  process.exit(died ? 1 : 0);
})();
