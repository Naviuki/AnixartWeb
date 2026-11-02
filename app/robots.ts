import type { MetadataRoute } from "next";

// robots.txt: закрываем служебные адреса и подсказываем поисковикам карту сайта.
// Адрес сайта берётся из METADATA_BASE_URL, иначе используется локальный вариант.
const BASE = process.env.METADATA_BASE_URL || "https://example.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Вход и открытые модальные окна не индексируются
        disallow: ["/api/", "/login"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
