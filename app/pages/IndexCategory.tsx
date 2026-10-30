"use client";
import { ReleaseSection } from "#/components/ReleaseSection/ReleaseSection";
import { Spinner } from "#/components/Spinner/Spinner";
import { useState, useEffect } from "react";
import { useScrollPosition } from "#/hooks/useScrollPosition";
import { useUserStore } from "../store/auth";
import { FetchFilter } from "#/api/utils";
import { useRouter } from "next/navigation";
import { slugToFilter } from "./IndexFilters";
import { PageHead } from "#/components/PageHead/PageHead";
import { Chip, ChipRow } from "#/components/Chips/ChipRow";
import { Icon } from "#/components/Icon/Icon";

const CATEGORIES = [
  { slug: "last", path: "/home/last" },
  { slug: "finished", path: "/home/finished" },
  { slug: "ongoing", path: "/home/ongoing" },
  { slug: "announce", path: "/home/announce" },
  { slug: "films", path: "/home/films" },
];

export function IndexCategoryPage(props) {
  const token = useUserStore((state) => state.token);
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState(null);
  const [page, setPage] = useState(0);
  const router = useRouter();

  useEffect(() => {
    async function _loadInitialReleases() {
      setIsLoading(true);
      setContent(null);

      const [data] = await FetchFilter(
        slugToFilter[props.slug].filter,
        page,
        token
      );

      setContent(data.content);
      setIsLoading(false);
    }

    _loadInitialReleases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    async function _loadNextReleasesPage() {
      const [data] = await FetchFilter(
        slugToFilter[props.slug].filter,
        page,
        token
      );
      const newContent = [...content, ...data.content];
      setContent(newContent);
    }
    if (content) {
      _loadNextReleasesPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const scrollPosition = useScrollPosition();
  useEffect(() => {
    if (scrollPosition == 98) {
      setPage(page + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollPosition]);

  return (
    <>
      <PageHead
        title={props.SectionTitleMapping[props.slug]}
        subtitle={
          content && content.length > 0 ?
            `${content.length} тайтлов`
          : "Список релизов"
        }
      />

      <ChipRow>
        {CATEGORIES.map((category) => (
          <Chip
            key={category.slug}
            active={props.slug == category.slug}
            onClick={() => router.push(category.path)}
          >
            {props.SectionTitleMapping[category.slug]}
          </Chip>
        ))}
      </ChipRow>

      {content && content.length > 0 ?
        <ReleaseSection content={content} />
      : isLoading ?
        <div className="empty">
          <Spinner />
          <p>Загружаем релизы</p>
        </div>
      : <div className="empty">
          <span className="empty-ic">
            <Icon name="film" size={32} />
          </span>
          <div className="empty-t">Пока пусто</div>
          <p>
            В списке {props.SectionTitleMapping[props.slug]} пока ничего нет.
          </p>
        </div>
      }

      {content && content.length > 0 && (
        <button
          type="button"
          className="btn g"
          style={{ width: "100%", marginTop: 16 }}
          onClick={() => setPage(page + 1)}
        >
          <Icon name="plus" size={16} />
          Загрузить ещё
        </button>
      )}
    </>
  );
}
