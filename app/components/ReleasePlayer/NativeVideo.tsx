"use client";

import { useEffect, useRef } from "react";

// Прямой поток играет наш собственный <video>: только так скорость меняется
// нативно. В чужой iframe (Kodik, Sibnet) браузер не пускает — оттуда скорость
// не выставить, поэтому там остаётся обычный плеер источника.
export const NativeVideo = (props: {
  manifest: string;
  poster?: string | null;
  rate: number;
  onFail?: () => void;
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const failRef = useRef<() => void>(() => {});
  failRef.current = () => props.onFail?.();

  // Подключение источника: HLS через hls.js, обычный файл — напрямую
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !props.manifest) return;

    let cancelled = false;
    let hls: any = null;
    const isHls = /\.m3u8(\?|$)/i.test(props.manifest);

    const attach = async () => {
      if (!isHls) {
        video.src = props.manifest;
        return;
      }
      // Сначала hls.js: Chromium на Windows отвечает canPlayType("maybe"),
      // но HLS не играет — без hls.js видео просто висит пустым.
      try {
        const mod = await import("hls.js");
        const Hls = mod.default;
        if (cancelled) return;
        if (Hls.isSupported()) {
          hls = new Hls({ enableWorker: true, lowLatencyMode: false });
          hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
            // Сетевые сбои hls.js переживает сам, падаем только на фатальных
            if (data?.fatal) failRef.current();
          });
          hls.loadSource(props.manifest);
          hls.attachMedia(video);
          return;
        }
      } catch {
        // ниже попробуем родное воспроизведение (Safari, iOS)
      }
      if (cancelled) return;
      // Safari и iOS играют HLS сами
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = props.manifest;
        return;
      }
      failRef.current();
    };

    attach();

    return () => {
      cancelled = true;
      if (hls) {
        try {
          hls.destroy();
        } catch {}
      }
      try {
        video.removeAttribute("src");
        video.load();
      } catch {}
    };
  }, [props.manifest]);

  // Скорость: родное свойство видео, работает во всех браузерах
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const apply = () => {
      try {
        video.playbackRate = props.rate;
      } catch {}
    };
    apply();
    video.addEventListener("loadedmetadata", apply);
    video.addEventListener("canplay", apply);
    video.addEventListener("play", apply);
    return () => {
      video.removeEventListener("loadedmetadata", apply);
      video.removeEventListener("canplay", apply);
      video.removeEventListener("play", apply);
    };
  }, [props.rate, props.manifest]);

  return (
    <video
      ref={videoRef}
      className="w-full h-full"
      style={{ objectFit: "contain", background: "#000" }}
      poster={props.poster || undefined}
      controls
      playsInline
      preload="metadata"
    />
  );
};
