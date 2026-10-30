"use client";
import useSWR from "swr";
import { CollectionCourusel } from "#/components/CollectionCourusel/CollectionCourusel";
import { Spinner } from "#/components/Spinner/Spinner";
import { useSWRfetcher } from "#/api/utils";
import { useUserStore } from "#/store/auth";
import { ENDPOINTS } from "#/api/config";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageHead } from "#/components/PageHead/PageHead";
import { Icon } from "#/components/Icon/Icon";

export function CollectionsPage() {
  const userStore = useUserStore();
  const router = useRouter();
  const [searchVal, setSearchVal] = useState("");

  function useFetchReleases(section: string) {
    let url: string;

    if (userStore.token && userStore.user) {
      if (section == "userCollections") {
        url = `${ENDPOINTS.collection.userCollections}/${userStore.user.id}/0?token=${userStore.token}`;
      } else if (section == "userFavoriteCollections") {
        url = `${ENDPOINTS.collection.favoriteCollections}/all/0?token=${userStore.token}`;
      }
    }

    const { data, error } = useSWR(url, useSWRfetcher);
    return [data, error];
  }

  const [userCollections, userCollectionsError] =
    useFetchReleases("userCollections");
  const [favoriteCollections, favoriteCollectionsError] = useFetchReleases(
    "userFavoriteCollections"
  );

  useEffect(() => {
    if (userStore.state === "finished" && !userStore.token) {
      router.push("/login?redirect=/collections");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userStore.state, userStore.token]);

  const isEmpty =
    userCollections &&
    favoriteCollections &&
    (userCollections.content || []).length == 0 &&
    (favoriteCollections.content || []).length == 0;

  return (
    <>
      <PageHead title="Коллекции" subtitle="Ваши подборки и избранное" />

      <form
        className="form"
        style={{ marginBottom: 14 }}
        onSubmit={(e) => {
          e.preventDefault();
          router.push(
            `/search?query=${searchVal}&params={"where"%3A"collections_fav"%2C"searchBy"%3A"none"}`
          );
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="search"
            placeholder="Поиск коллекций..."
            aria-label="Поиск по коллекциям"
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

      {userStore.state === "loading" &&
        (!userCollections || !favoriteCollections) && (
          <div className="empty">
            <Spinner />
            <p>Загружаем коллекции</p>
          </div>
        )}

      {userCollections && userCollections.content && (
        <CollectionCourusel
          sectionTitle="Мои коллекции"
          showAllLink={`/profile/${userStore.user.id}/collections`}
          content={userCollections.content}
          isMyCollections={true}
        />
      )}
      {favoriteCollections &&
        favoriteCollections.content &&
        favoriteCollections.content.length > 0 && (
          <CollectionCourusel
            sectionTitle="Избранные коллекции"
            showAllLink="/collections/favorites"
            content={favoriteCollections.content}
          />
        )}

      {isEmpty && (
        <div className="empty">
          <span className="empty-ic">
            <Icon name="collection" size={32} />
          </span>
          <div className="empty-t">Пока пусто</div>
          <p>У вас ещё нет коллекций. Создайте первую подборку.</p>
        </div>
      )}

      {(userCollectionsError || favoriteCollectionsError) && (
        <div className="empty">
          <span className="empty-ic">
            <Icon name="info" size={32} />
          </span>
          <div className="empty-t">Ошибка</div>
          <p>
            Произошла ошибка при загрузке коллекций. Попробуйте обновить страницу
            или зайдите позже.
          </p>
        </div>
      )}
    </>
  );
}
