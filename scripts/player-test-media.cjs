// Локальные HLS и MP4 для проверок плеера без внешних видео и парсера.
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createServer } = require("node:http");
const { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

function ffmpeg(args) {
  const result = spawnSync(process.env.FFMPEG_PATH || "ffmpeg", args, { encoding: "utf8" });
  if (result.error?.code === "ENOENT") {
    throw new Error("Для локального HLS-образца нужен ffmpeg в PATH или FFMPEG_PATH");
  }
  assert.equal(result.status, 0, result.stderr || "ffmpeg не создал видео");
}

async function startPlayerTestMedia(port) {
  const directory = mkdtempSync(join(tmpdir(), "anix-player-media-"));
  const mp4 = join(directory, "sample.mp4");
  const m3u8 = join(directory, "sample.m3u8");
  const lowMp4 = join(directory, "low.mp4");
  ffmpeg([
    "-hide_banner", "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", "testsrc2=size=480x270:rate=25",
    "-t", "180", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "34",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4,
  ]);
  ffmpeg([
    "-hide_banner", "-loglevel", "error", "-y", "-i", mp4,
    "-c", "copy", "-hls_time", "10", "-hls_playlist_type", "vod",
    "-hls_segment_filename", join(directory, "segment-270-%03d.ts"),
    join(directory, "sample-270.m3u8"),
  ]);
  // Для меню качества нужен master-плейлист минимум с двумя разрешениями
  ffmpeg([
    "-hide_banner", "-loglevel", "error", "-y", "-i", mp4,
    "-vf", "scale=320:180", "-c:v", "libx264", "-preset", "ultrafast", "-crf", "34",
    "-pix_fmt", "yuv420p", lowMp4,
  ]);
  ffmpeg([
    "-hide_banner", "-loglevel", "error", "-y", "-i", lowMp4,
    "-c", "copy", "-hls_time", "10", "-hls_playlist_type", "vod",
    "-hls_segment_filename", join(directory, "segment-180-%03d.ts"),
    join(directory, "sample-180.m3u8"),
  ]);
  writeFileSync(m3u8, [
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    "#EXT-X-STREAM-INF:BANDWIDTH=300000,RESOLUTION=320x180",
    "sample-180.m3u8",
    "#EXT-X-STREAM-INF:BANDWIDTH=600000,RESOLUTION=480x270",
    "sample-270.m3u8",
    "",
  ].join("\n"));
  const server = createServer((request, response) => {
    const name = new URL(request.url, "http://localhost").pathname.slice(1);
    if (!/^(sample(\-\d+)?\.m3u8|sample\.mp4|segment-(180|270)-\d+\.ts)$/.test(name)) {
      response.writeHead(404).end();
      return;
    }
    const file = join(directory, name);
    if (!existsSync(file)) {
      response.writeHead(404).end();
      return;
    }
    const size = statSync(file).size;
    const range = /bytes=(\d+)-(\d*)/.exec(request.headers.range || "");
    const type = name.endsWith(".m3u8") ? "application/vnd.apple.mpegurl"
      : name.endsWith(".ts") ? "video/mp2t" : "video/mp4";
    const headers = {
      "Content-Type": type,
      "Accept-Ranges": "bytes",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    };
    if (!range) {
      response.writeHead(200, { ...headers, "Content-Length": size });
      response.end(readFileSync(file));
      return;
    }
    const start = Number(range[1]);
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    response.writeHead(206, {
      ...headers,
      "Content-Range": `bytes ${start}-${end}/${size}`,
      "Content-Length": end - start + 1,
    });
    response.end(readFileSync(file).subarray(start, end + 1));
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  return { server, directory };
}

module.exports = { startPlayerTestMedia };
