import type { MetadataRoute } from "next";
import { fetchDataViaPost } from "#/api/utils";
import { API_URL } from "#/api/config";
import { FilterDefault } from "#/api/utils";

// Карта сайта: постоянные разделы и недавние релизы.
// Релизы берутся через тот же фильтр, что и на главной; если API недоступен,
// карта отдаёт только разделы и остаётся рабочей.
const BASE = process.env.METADATA_BASE_URL || "https://example.com";

const STATIC_PAGES = [
  { path: "/", priority: 1 },
  { path: "/discovery", priority: 0.9 },
  { path: "/discovery/collections", priority: 0.6 },
  { path: "/discovery/filter", priority: 0.5 },
  { path: "/search", priority: 0.6 },
  { path: "/about", priority: 0.4 },
];

const releaseIds = async (): Promise<number[]> => {
  try {
    // Запрос идёт с сервера сайта, поэтому CORS к API не мешает
    const { data, error } = await fetchDataViaPost(
      `${API_URL}/filter/0`,
      JSON.stringify(FilterDefault)
    );
    if (error || !data) return [];
    const list = data.content || data.releases || [];
    return list
      .map((item: any) => item?.id)
      .filter((id: any) => Number.isFinite(id))
      .slice(0, 100);
  } catch {
    return [];
  }
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: `${BASE}${page.path}`,
    lastModified: now,
    changeFrequency: page.path === "/" ? "daily" : "weekly",
    priority: page.priority,
  }));

  const ids = await releaseIds();
  const releases: MetadataRoute.Sitemap = ids.map((id) => ({
    url: `${BASE}/release/${id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...pages, ...releases];
}
