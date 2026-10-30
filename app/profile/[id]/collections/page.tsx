import { CollectionsFullPage } from "#/pages/CollectionsFull";
import { fetchDataViaGet } from "#/api/utils";
import type { Metadata, ResolvingMetadata } from "next";
import { API_URL } from "#/api/config";

export async function generateMetadata(
  { params },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const id: string = params.id;
  const { data, error } = await fetchDataViaGet(
    `${API_URL}/profile/${id}`
  );
  const previousOG = (await parent).openGraph;

  if (error) {
    return {
      title: "Ошибка",
      description: "Ошибка",
    };
  };

  return {
    title: "Коллекции Пользователя - " + data.profile.login,
    description: "Коллекции Пользователя - " + data.profile.login,
    openGraph: {
      ...previousOG,
      url: `${process.env.METADATA_BASE_URL || "https://example.com"}/profile/${id}/collections`,
      images: [],
    },
  };
};

export default async function Collections({ params }) {
  const { data, error } = await fetchDataViaGet(
    `${API_URL}/profile/${params.id}`
  );

  if (error) {
    return (
      <div className="empty">
        <div className="empty-t">Ошибка</div>
        <p>
          Произошла ошибка при загрузке коллекций пользователя. Попробуйте
          обновить страницу или зайдите позже.
        </p>
      </div>
    );
  }

  return (
    <CollectionsFullPage
      type="profile"
      title={`Коллекции пользователя: ${data.profile.login}`}
      profile_id={params.id}
    />
  );
};
