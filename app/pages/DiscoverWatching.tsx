"use client";

import { ENDPOINTS } from "#/api/config";
import { useSWRfetcher } from "#/api/utils";
import { ReleaseSection } from "#/components/ReleaseSection/ReleaseSection";
import { Spinner } from "#/components/Spinner/Spinner";
import { useScrollPosition } from "#/hooks/useScrollPosition";
import { useUserStore } from "#/store/auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWRInfinite from "swr/infinite";
import { PageHead } from "#/components/PageHead/PageHead";
import { Icon } from "#/components/Icon/Icon";

export const DiscoverWatchingPage = () => {
  const userStore = useUserStore();
  const router = useRouter();

  const [content, setContent] = useState(null);

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.content.length) return null;

    let url: string;
    url = `${ENDPOINTS.discover.watching}/${pageIndex}`;

    if (userStore.token) {
      url += `?token=${userStore.token}`;
    }

    return url;
  };

  const { data, error, isLoading, size, setSize } = useSWRInfinite(
    getKey,
    useSWRfetcher
  );

  useEffect(() => {
    if (data) {
      let allContent = [];
      for (let i = 0; i < data.length; i++) {
        allContent.push(...data[i].content);
      }
      setContent(allContent);
    }
  }, [data]);

  const scrollPosition = useScrollPosition();
  useEffect(() => {
    if (scrollPosition >= 98 && scrollPosition <= 99) {
      setSize(size + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollPosition]);

  return (
    <>
      <PageHead title="Смотрят сейчас" subtitle="Релизы, которые смотрят прямо сейчас" />

      {error ?
        <div className="empty">
          <span className="empty-ic">
            <Icon name="info" size={32} />
          </span>
          <div className="empty-t">Ошибка</div>
          <p>
            Произошла ошибка при загрузке. Попробуйте обновить страницу или
            зайдите позже.
          </p>
        </div>
      : !content ?
        <div className="empty">
          <Spinner />
          <p>Загружаем релизы</p>
        </div>
      : <ReleaseSection content={content} />}

      {content && isLoading && (
        <div className="empty" style={{ marginBottom: 0 }}>
          <Spinner />
        </div>
      )}
    </>
  );
};
