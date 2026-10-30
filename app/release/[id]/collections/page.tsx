import { CollectionsFullPage } from "#/pages/CollectionsFull";
import { fetchDataViaGet } from "#/api/utils";
import type { Metadata, ResolvingMetadata } from "next";
import { API_URL } from "#/api/config";

export async function generateMetadata(
  { params },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id = params.id;
  const { data, error } = await fetchDataViaGet(
    `${API_URL}/release/${id}`
  );
  const previousOG = (await parent).openGraph;

  if (error) {
    return {
      title: "Ошибка",
      description: "Ошибка",
    };
  }

  return {
    title: data.release.title_ru + " - в коллекциях",
    description: data.release.description,
    keywords: data.release.genres,
    openGraph: {
      ...previousOG,
      url: `${process.env.METADATA_BASE_URL || "https://example.com"}/release/${id}/collections`,
      images: [],
    },
  };
}

export default async function Collections({ params }) {
  const { data, error } = await fetchDataViaGet(
    `${API_URL}/release/${params.id}`
  );

  if (error) {
    return (
      <div className="empty">
        <div className="empty-t">Ошибка</div>
        <p>
          Произошла ошибка при загрузке коллекций. Попробуйте обновить страницу
          или зайдите позже.
        </p>
      </div>
    );
  }

  return (
    <CollectionsFullPage
      type="release"
      title={data.release.title_ru + " в коллекциях"}
      release_id={params.id}
    />
  );
}
