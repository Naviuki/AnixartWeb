import { RelatedPage } from "#/pages/Related";
import { fetchDataViaGet } from "#/api/utils";
import type { Metadata, ResolvingMetadata } from "next";
import { API_URL } from "#/api/config";

const _getData = async (url: string) => {
  const { data, error } = await fetchDataViaGet(url);
  return [data, error];
}

export async function generateMetadata({ params }, parent: ResolvingMetadata): Promise<Metadata> {
  const id:string = params.id;
  const previousOG = (await parent).openGraph;

  const [ related, relatedError ] = await _getData(`${API_URL}/related/${id}/0`);
  if (relatedError || related.content.length == 0) {
    return {
      title: "Ошибка",
      description: "Ошибка",
    };
  };

  const [ firstRelease, firstReleaseError ] = await _getData(`${API_URL}/release/${related.content[0].id}`);
  if (firstReleaseError) {
    return {
      title: "Ошибка",
      description: "Ошибка",
    };
  };

  return {
    title: "Франшиза - " + firstRelease.release.related.name_ru || firstRelease.release.related.name,
    description: firstRelease.release.description,
    openGraph: {
      ...previousOG,
      url: `${process.env.METADATA_BASE_URL || "https://example.com"}/related/${id}`,
      images: [
        {
          url: firstRelease.release.image, // Must be an absolute URL
          width: 600,
          height: 800,
        },
      ],
    },
  };
}

export default async function Related({ params }) {
  const id: string = params.id;
  const [ related, relatedError ] = await _getData(`${API_URL}/related/${id}/0`);
  if (relatedError || related.content.length == 0) {
    return (
      <div className="empty">
        <div className="empty-t">Франшиза не найдена</div>
        <p>
          У этого релиза нет связанных частей, либо произошла ошибка загрузки.
          Попробуйте обновить страницу или зайдите позже.
        </p>
      </div>
    );
  }

  const [ firstRelease, firstReleaseError ] = await _getData(`${API_URL}/release/${related.content[0].id}`);
  if (firstReleaseError) {
    return (
      <div className="empty">
        <div className="empty-t">Ошибка</div>
        <p>Произошла ошибка при загрузке франшизы. Попробуйте обновить страницу или зайдите позже.</p>
      </div>
    );
  }

  return <RelatedPage id={id} title={firstRelease.release.related.name_ru || firstRelease.release.related.name} />;
}
