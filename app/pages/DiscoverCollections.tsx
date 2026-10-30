"use client";

import { ENDPOINTS } from "#/api/config";
import { useSWRfetcher } from "#/api/utils";
import { CollectionsSection } from "#/components/CollectionsSection/CollectionsSection";
import { Spinner } from "#/components/Spinner/Spinner";
import { useScrollPosition } from "#/hooks/useScrollPosition";
import { useUserStore } from "#/store/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWRInfinite from "swr/infinite";
import { PageHead } from "#/components/PageHead/PageHead";
import { Chip, ChipRow } from "#/components/Chips/ChipRow";
import { Icon } from "#/components/Icon/Icon";

export const DiscoverCollectionsSort = [
  {
    id: "all_time_popular",
    name: "Популярные за всё время",
    where: 1,
    sort: 1,
  },
  {
    id: "year_popular",
    name: "Популярные за год",
    where: 1,
    sort: 2,
  },
  {
    id: "season_popular",
    name: "Популярные за сезон",
    where: 1,
    sort: 3,
  },
  {
    id: "week_popular",
    name: "Популярные за неделю",
    where: 1,
    sort: 4,
  },
  {
    id: "recent",
    name: "Недавно добавленные",
    where: 1,
    sort: 5,
  },
  {
    id: "random",
    name: "Случайные",
    where: 1,
    sort: 6,
  },
];

export const DiscoverCollectionsPage = () => {
  const userStore = useUserStore();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [previousPage, setPreviousPage] = useState(0);
  const [selectedSort, setSelectedSort] = useState(
    searchParams.get("sort") || "recent"
  );
  const [content, setContent] = useState(null);

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.content.length) return null;

    let where = null;
    let sort = null;
    let obj = null;
    obj = DiscoverCollectionsSort.find((item) => item.id == selectedSort);

    if (obj) {
      where = obj.where;
      sort = obj.sort;
    } else {
      where = DiscoverCollectionsSort[5].where;
      sort = DiscoverCollectionsSort[5].sort;
    }

    let url: string;
    url = `${ENDPOINTS.discover.collections}/${pageIndex}?where=${where}&sort=${sort}&previous_page=${previousPage}`;

    if (userStore.token) {
      url += `&token=${userStore.token}`;
    }

    return url;
  };

  const { data, error, isLoading, size, setSize } = useSWRInfinite(
    getKey,
    useSWRfetcher
  );

  useEffect(() => {
    router.replace("/discovery/collections?sort=" + selectedSort);
    setContent(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSort]);

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
      setPreviousPage(size);
      setSize(size + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollPosition]);

  return (
    <>
      <PageHead title="Коллекции" subtitle="Подборки сообщества Anixart" />

      <ChipRow>
        {DiscoverCollectionsSort.map((item) => (
          <Chip
            key={`discover-collections-sort-${item.id}`}
            active={selectedSort == item.id}
            onClick={() => setSelectedSort(item.id)}
          >
            {item.name}
          </Chip>
        ))}
      </ChipRow>

      {error ?
        <div className="empty">
          <span className="empty-ic">
            <Icon name="info" size={32} />
          </span>
          <div className="empty-t">Ошибка</div>
          <p>
            Произошла ошибка при загрузке коллекций. Попробуйте обновить
            страницу или зайдите позже.
          </p>
        </div>
      : isLoading || !content ?
        <div className="empty">
          <Spinner />
          <p>Загружаем коллекции</p>
        </div>
      : <CollectionsSection content={content} />}
    </>
  );
};
