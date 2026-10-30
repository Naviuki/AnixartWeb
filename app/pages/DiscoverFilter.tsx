"use client";

import { ENDPOINTS } from "#/api/config";
import { FilterDefault, tryCatchAPI } from "#/api/utils";
import { FiltersModal } from "#/components/Discovery/Modal/FiltersModal";
import { FloatingToolbar } from "#/components/FloatingToolbar/FloatingToolbar";
import { ReleaseSection } from "#/components/ReleaseSection/ReleaseSection";
import { Spinner } from "#/components/Spinner/Spinner";
import { useScrollPosition } from "#/hooks/useScrollPosition";
import { useUserStore } from "#/store/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import useSWRInfinite from "swr/infinite";
import { PageHead } from "#/components/PageHead/PageHead";
import { Icon } from "#/components/Icon/Icon";

const postFetcher = async (url: string, payload: string) => {
  const { data, error } = await tryCatchAPI(
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: payload,
    })
  );

  if (error) {
    throw error;
  }
  return data;
};

export const DiscoverFilterPage = () => {
  const userStore = useUserStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [filter, setFilter] = useState(null);
  const [content, setContent] = useState(null);
  const [FiltersModalOpen, setFiltersModalOpen] = useState(false);

  useEffect(() => {
    const queryParams = searchParams.get("filter");
    if (queryParams) {
      try {
        const _filter = JSON.parse(queryParams);
        if (Object.keys(_filter).length != Object.keys(FilterDefault).length) {
          setFilter(FilterDefault);
        } else {
          setFilter(_filter);
        }
      } catch (e) {
        setFilter(FilterDefault);
      }
    } else {
      setFilter(FilterDefault);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setContent(null);
    const url = new URL(`/discovery/filter`, window.location.origin);
    url.searchParams.set("filter", JSON.stringify(filter));
    router.replace(url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (!filter) return null;

    if (previousPageData && !previousPageData.content.length) return null;

    let url = `${ENDPOINTS.filter}/${pageIndex}`;
    if (userStore.token) {
      url += `?token=${userStore.token}`;
    }
    return [url, JSON.stringify(filter)];
  };

  const { data, error, isLoading, size, setSize } = useSWRInfinite(
    getKey,
    ([url, payload]) => postFetcher(url, payload),
    { initialSize: 2 }
  );

  useEffect(() => {
    if (data) {
      let _content = [];
      for (let i = 0; i < data.length; i++) {
        _content.push(...data[i].content);
      }
      setContent(_content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const scrollPosition = useScrollPosition();
  useEffect(() => {
    if (scrollPosition >= 98 && scrollPosition <= 99) {
      setSize(size + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollPosition]);

  if (!filter) return <></>;

  return (
    <>
      <PageHead title="Фильтр" subtitle="Подбор релизов по параметрам" />

      {error && (
        <div className="banner danger" style={{ marginBottom: 14 }}>
          <span className="banner-ic">
            <Icon name="info" size={18} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="banner-s">Произошла ошибка фильтра</div>
          </div>
        </div>
      )}

      {content && <ReleaseSection content={content} />}

      {isLoading && (
        <div className="empty" style={{ marginBottom: 0 }}>
          <Spinner />
        </div>
      )}

      <FloatingToolbar>
        <button
          type="button"
          className="btn p"
          style={{ borderRadius: 999, padding: 10 }}
          onClick={() => setFiltersModalOpen(true)}
          aria-label="Открыть фильтр"
        >
          <Icon name="filter" size={18} />
        </button>
      </FloatingToolbar>

      <FiltersModal
        isOpen={FiltersModalOpen}
        setIsOpen={setFiltersModalOpen}
        filter={filter}
        setFilter={setFilter}
      />
    </>
  );
};
