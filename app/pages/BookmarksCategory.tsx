"use client";
import useSWRInfinite from "swr/infinite";
import { ReleaseSection } from "#/components/ReleaseSection/ReleaseSection";
import { Spinner } from "#/components/Spinner/Spinner";
import { useState, useEffect } from "react";
import { useScrollPosition } from "#/hooks/useScrollPosition";
import { useUserStore } from "../store/auth";
import { sort } from "./common";
import { ENDPOINTS } from "#/api/config";
import { BookmarksList, useSWRfetcher } from "#/api/utils";
import { useRouter } from "next/navigation";
import { PageHead } from "#/components/PageHead/PageHead";
import { Chip, ChipRow } from "#/components/Chips/ChipRow";
import { Icon } from "#/components/Icon/Icon";

const LISTS = ["watching", "planned", "watched", "delayed", "abandoned"];

export function BookmarksCategoryPage(props: any) {
  const token = useUserStore((state) => state.token);
  const authState = useUserStore((state) => state.state);
  const [selectedSort, setSelectedSort] = useState(0);
  const [searchVal, setSearchVal] = useState("");
  const router = useRouter();

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.content.length) return null;
    let url: string;
    if (props.profile_id) {
      url = `${ENDPOINTS.user.bookmark}/all/${props.profile_id}/${
        BookmarksList[props.slug]
      }/${pageIndex}?sort=${sort.values[selectedSort].id}`;
      if (token) {
        url += `&token=${token}`;
      }
    } else {
      if (token) {
        url = `${ENDPOINTS.user.bookmark}/all/${
          BookmarksList[props.slug]
        }/${pageIndex}?sort=${sort.values[selectedSort].id}&token=${token}`;
      }
    }
    return url;
  };

  const { data, error, isLoading, size, setSize } = useSWRInfinite(
    getKey,
    useSWRfetcher,
    { initialSize: 2 }
  );

  const [content, setContent] = useState(null);
  useEffect(() => {
    if (data) {
      let allReleases = [];
      for (let i = 0; i < data.length; i++) {
        allReleases.push(...data[i].content);
      }
      setContent(allReleases);
    }
  }, [data]);

  const scrollPosition = useScrollPosition();
  useEffect(() => {
    if (scrollPosition >= 98 && scrollPosition <= 99) {
      setSize(size + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollPosition]);

  useEffect(() => {
    if (authState === "finished" && !token && !props.profile_id) {
      router.push(`/login?redirect=/bookmarks/${props.slug}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState, token]);

  const listPath = (slug: string) =>
    props.profile_id ?
      `/profile/${props.profile_id}/bookmarks/${slug}`
    : `/bookmarks/${slug}`;

  if (isLoading) {
    return (
      <div className="empty">
        <Spinner />
        <p>Загружаем закладки</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty">
        <span className="empty-ic">
          <Icon name="info" size={32} />
        </span>
        <div className="empty-t">Ошибка</div>
        <p>
          Произошла ошибка при загрузке закладок. Попробуйте обновить страницу
          или зайдите позже.
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHead
        title={props.SectionTitleMapping[props.slug]}
        subtitle="Закладки"
      />

      {!props.profile_id && (
        <form
          className="form"
          style={{ marginBottom: 14 }}
          onSubmit={(e) => {
            e.preventDefault();
            router.push(
              `/search?query=${searchVal}&params={"where"%3A"list"%2C"searchBy"%3A"${props.slug}"}`
            );
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="search"
              placeholder="Поиск аниме..."
              required
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              aria-label="Поиск по закладкам"
            />
            <button type="submit" className="btn p" style={{ flex: "none" }}>
              <Icon name="search" size={16} />
              Поиск
            </button>
          </div>
        </form>
      )}

      <ChipRow>
        {LISTS.map((slug) => (
          <Chip
            key={`bookmark-list-${slug}`}
            active={props.slug == slug}
            onClick={() => router.push(listPath(slug))}
          >
            {props.SectionTitleMapping[slug]}
          </Chip>
        ))}
      </ChipRow>

      <div className="sh" style={{ marginTop: 4 }}>
        <h2>
          <Icon name="filter" size={18} />
          Сортировка
        </h2>
      </div>
      <ChipRow>
        {sort.values.map((item, index) => (
          <Chip
            key={`bookmark-sort-${item.id}`}
            active={selectedSort == index}
            onClick={() => setSelectedSort(index)}
            icon="sort"
            className={
              item.value.split("_")[1] == "ascending" ? "sort-asc" : ""
            }
          >
            {item.name}
          </Chip>
        ))}
      </ChipRow>

      {content && content.length > 0 ?
        <ReleaseSection content={content} />
      : <div className="empty">
          <span className="empty-ic">
            <Icon name="bookmark" size={32} />
          </span>
          <div className="empty-t">Пока пусто</div>
          <p>
            В списке {props.SectionTitleMapping[props.slug]} пока ничего нет.
          </p>
        </div>
      }

      {data &&
        data[data.length - 1].current_page <
          data[data.length - 1].total_page_count && (
          <button
            type="button"
            className="btn g"
            style={{ width: "100%", marginTop: 16 }}
            onClick={() => setSize(size + 1)}
          >
            <Icon name="plus" size={16} />
            Загрузить ещё
          </button>
        )}
    </>
  );
}
