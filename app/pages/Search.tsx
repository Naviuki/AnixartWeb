"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

import { useUserStore } from "#/store/auth";
import { ENDPOINTS } from "#/api/config";
import { tryCatchAPI } from "#/api/utils";
import useSWRInfinite from "swr/infinite";
import { Spinner } from "#/components/Spinner/Spinner";
import { ReleaseSection } from "#/components/ReleaseSection/ReleaseSection";
import { UserSection } from "#/components/UserSection/UserSection";
import { CollectionsSection } from "#/components/CollectionsSection/CollectionsSection";
import { useScrollPosition } from "#/hooks/useScrollPosition";
import { RelatedSection } from "#/components/RelatedSection/RelatedSection";
import { Chip, ChipRow } from "#/components/Chips/ChipRow";
import { Icon } from "#/components/Icon/Icon";

const postFetcher = async (url: string, payload: string) => {
  const { data, error } = await tryCatchAPI(
    fetch(url, {
      method: "POST",
      headers: {
        "Api-Version": "v2",
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

const whereMapping = [
  {
    id: "releases",
    label: "Релизах",
    auth: false,
  },
  {
    id: "profiles",
    label: "Профилях",
    auth: false,
  },
  {
    id: "list",
    label: "Списках",
    auth: true,
  },
  {
    id: "history",
    label: "Истории",
    auth: true,
  },
  {
    id: "favorites",
    label: "Избранном",
    auth: true,
  },
  {
    id: "collections_all",
    label: "Всех Коллекциях",
    auth: false,
  },
  {
    id: "collections_fav",
    label: "Своих Коллекциях",
    auth: true,
  },
];

const searchByMapping = {
  releases: [
    {
      id: "name",
      label: "Названию",
      value: 0,
    },
    {
      id: "studio",
      label: "Студии",
      value: 1,
    },
    {
      id: "director",
      label: "Режиссёру",
      value: 2,
    },
    {
      id: "author",
      label: "Автору",
      value: 3,
    },
    {
      id: "tag",
      label: "Тегу",
      value: 4,
    },
  ],
  list: [
    {
      id: "watching",
      label: "Смотрю",
      value: 1,
    },
    {
      id: "planned",
      label: "В планах",
      value: 2,
    },
    {
      id: "watched",
      label: "Просмотрено",
      value: 3,
    },
    {
      id: "delayed",
      label: "Отложено",
      value: 4,
    },
    {
      id: "abandoned",
      label: "Заброшено",
      value: 5,
    },
  ],
  none: [{ id: "none", label: "Нет", value: 0 }],
};

export function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userStore = useUserStore();
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [params, setParams] = useState(null);
  const [content, setContent] = useState(null);

  useEffect(() => {
    const queryParams = searchParams.get("params");

    if (queryParams) {
      try {
        setParams(JSON.parse(queryParams));
      } catch (e) {
        setParams({
          where: "releases",
          searchBy: "name",
        });
      }
    } else {
      setParams({
        where: "releases",
        searchBy: "name",
      });
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!params) return;

    const url = new URL(`/search`, window.location.origin);
    url.searchParams.set("query", query);
    url.searchParams.set("params", JSON.stringify(params));
    router.replace(url.toString());
    setContent(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    setContent(null);

    const url = new URL(`/search`, window.location.origin);
    url.searchParams.set("query", query);
    url.searchParams.set("params", JSON.stringify(params));
    router.replace(url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (!params) return null;
    if (!query) return null;

    if (previousPageData) {
      if (params.where == "releases") {
        if (!previousPageData.releases.length) return null;
      } else {
        if (!previousPageData.content.length) return null;
      }
    }

    let url = null;
    switch (params.where) {
      case "releases":
        url = `${ENDPOINTS.search.releases}/${pageIndex}`;
        break;
      case "profiles":
        url = `${ENDPOINTS.search.profiles}/${pageIndex}`;
        break;
      case "list":
        const list = searchByMapping[params.where].find(
          (item) => item.id == params.searchBy
        );
        if (!list) break;
        url = `${ENDPOINTS.search.profileList}/${list.value}/${pageIndex}`;
        break;
      case "history":
        url = `${ENDPOINTS.search.profileHistory}/${pageIndex}`;
        break;
      case "favorites":
        url = `${ENDPOINTS.search.profileFavorites}/${pageIndex}`;
        break;
      case "collections_all":
        url = `${ENDPOINTS.search.collections}/${pageIndex}`;
        break;
      case "collections_fav":
        url = `${ENDPOINTS.search.profileFavoriteCollection}/${pageIndex}`;
        break;
    }

    if (userStore.token) {
      url += `?token=${userStore.token}`;
    }

    let searchBy = null;
    const _sbym = searchByMapping[params.where];
    if (_sbym) {
      searchBy = _sbym.find((item) => item.id == params.searchBy).value;
    } else {
      searchBy = searchByMapping["none"][0].value;
    }

    return [url, JSON.stringify({ query, searchBy })];
  };

  const { data, error, isLoading, size, setSize } = useSWRInfinite(
    getKey,
    ([url, payload]) => postFetcher(url, payload),
    { initialSize: 2 }
  );

  useEffect(() => {
    if (data) {
      let _content = [];
      if (params.where == "releases") {
        for (let i = 0; i < data.length; i++) {
          _content.push(...data[i].releases);
        }
      } else {
        for (let i = 0; i < data.length; i++) {
          _content.push(...data[i].content);
        }
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

  if (!params) return <></>;

  return (
    <div>
      <div className="search-sticky">
        <div className="search-wrap">
          <span className="search-ic">
            <Icon name="search" size={18} />
          </span>
          <input
            type="search"
            className="search"
            placeholder="Поиск аниме..."
            required
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus={true}
            aria-label="Поиск"
          />
        </div>
      </div>

      <div className="ap-title">Искать в</div>
      <ChipRow>
        {whereMapping.map((item) => {
          if (item.auth && !userStore.isAuth) return null;
          return (
            <Chip
              key={item.id}
              active={params.where === item.id}
              onClick={() =>
                searchByMapping[item.id] ?
                  setParams({
                    where: item.id,
                    searchBy: searchByMapping[item.id][0].id,
                  })
                : setParams({ where: item.id, searchBy: "none" })
              }
            >
              {item.label}
            </Chip>
          );
        })}
      </ChipRow>

      {searchByMapping[params.where] ? (
        <>
          <div className="ap-title">Искать по</div>
          <ChipRow>
            {searchByMapping[params.where].map((item) => {
              return (
                <Chip
                  key={item.id}
                  active={params.searchBy === item.id}
                  onClick={() =>
                    setParams({
                      where: params.where,
                      searchBy: item.id,
                    })
                  }
                >
                  {item.label}
                </Chip>
              );
            })}
          </ChipRow>
        </>
      ) : null}

      <div>
        {error ? (
          <div className="box" style={{ borderColor: "#ef4444" }}>
            <p>Произошла ошибка поиска</p>
          </div>
        ) : null}

        {data && data[0].related && <RelatedSection {...data[0].related} />}
        {content ?
          content.length > 0 ?
            params.where == "profiles" ?
              <UserSection content={content} />
            : ["collections_all", "collections_fav"].includes(params.where) ?
              <CollectionsSection content={content} />
            : <ReleaseSection content={content} />
          : <div className="empty">
              <span className="empty-ic">
                <Icon name="search" size={32} />
              </span>
              <div className="empty-t">Ничего не найдено</div>
              <p>Странно, аниме не найдено, попробуйте другой запрос...</p>
            </div>

        : null}

        {!content && !isLoading && !query && (
          <div className="empty">
            <span className="empty-ic">
              <Icon name="search" size={32} />
            </span>
            <p>Введите ваш запрос что-бы найти любимый тайтл</p>
          </div>
        )}

        {isLoading ?
          <div className="empty">
            <Spinner />
          </div>
        : ""}
      </div>
    </div>
  );
}
