"use client";
import useSWRInfinite from "swr/infinite";
import { ReleaseSection } from "#/components/ReleaseSection/ReleaseSection";
import { Spinner } from "#/components/Spinner/Spinner";
import { useState, useEffect } from "react";
import { useScrollPosition } from "#/hooks/useScrollPosition";
import { useUserStore } from "../store/auth";
import { sort } from "./common";
import { ENDPOINTS } from "#/api/config";
import { useRouter } from "next/navigation";
import { useSWRfetcher } from "#/api/utils";
import { PageHead } from "#/components/PageHead/PageHead";
import { Chip, ChipRow } from "#/components/Chips/ChipRow";
import { Icon } from "#/components/Icon/Icon";

export function FavoritesPage() {
  const token = useUserStore((state) => state.token);
  const authState = useUserStore((state) => state.state);
  const [selectedSort, setSelectedSort] = useState(0);
  const router = useRouter();
  const [searchVal, setSearchVal] = useState("");

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.content.length) return null;
    if (token) {
      return `${ENDPOINTS.user.favorite}/all/${pageIndex}?token=${token}&sort=${sort.values[selectedSort].id}`;
    }
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
    if (authState === "finished" && !token) {
      router.push("/login?redirect=/favorites");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authState, token]);

  return (
    <>
      <PageHead title="Избранное" subtitle="Релизы, добавленные в избранное" />

      <form
        className="form"
        style={{ marginBottom: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          router.push(
            `/search?query=${searchVal}&params={"where"%3A"favorites"%2C"searchBy"%3A"none"}`
          );
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="search"
            placeholder="Поиск аниме..."
            aria-label="Поиск по избранному"
            required
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
          />
          <button type="submit" className="btn p" style={{ flex: "none" }}>
            <Icon name="search" size={16} />
            Поиск
          </button>
        </div>
      </form>

      <ChipRow>
        {sort.values.map((item, index) => (
          <Chip
            key={`favorite-sort-${item.id}`}
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

      {error ?
        <div className="empty">
          <span className="empty-ic">
            <Icon name="info" size={32} />
          </span>
          <div className="empty-t">Ошибка</div>
          <p>
            Произошла ошибка при загрузке избранного. Попробуйте обновить
            страницу или зайдите позже.
          </p>
        </div>
      : content && content.length > 0 ?
        <ReleaseSection content={content} />
      : isLoading ?
        <div className="empty">
          <Spinner />
          <p>Загружаем избранное</p>
        </div>
      : <div className="empty">
          <span className="empty-ic">
            <Icon name="heart" size={32} />
          </span>
          <div className="empty-t">Пока пусто</div>
          <p>В избранном пока ничего нет.</p>
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
