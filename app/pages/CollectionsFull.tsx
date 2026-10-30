"use client";
import useSWRInfinite from "swr/infinite";
import { CollectionsSection } from "#/components/CollectionsSection/CollectionsSection";
import { Spinner } from "#/components/Spinner/Spinner";
import { useState, useEffect } from "react";
import { useScrollPosition } from "#/hooks/useScrollPosition";
import { useUserStore } from "../store/auth";
import { ENDPOINTS } from "#/api/config";
import { useRouter } from "next/navigation";
import { useSWRfetcher } from "#/api/utils";
import { PageHead } from "#/components/PageHead/PageHead";
import { Icon } from "#/components/Icon/Icon";

export function CollectionsFullPage(props: {
  type: "favorites" | "profile" | "release";
  title: string;
  profile_id?: number;
  release_id?: number;
}) {
  const userStore = useUserStore();
  const router = useRouter();

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.content.length) return null;

    let url: string;

    if (props.type == "favorites") {
      url = `${ENDPOINTS.collection.favoriteCollections}/all/${pageIndex}`;
    } else if (props.type == "profile") {
      url = `${ENDPOINTS.collection.userCollections}/${props.profile_id}/${pageIndex}`;
    } else if (props.type == "release") {
      url = `${ENDPOINTS.collection.releaseInCollections}/${props.release_id}/${pageIndex}`;
    }

    if (userStore.token) {
      url += `?token=${userStore.token}`;
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
    if (
      userStore.state === "finished" &&
      !userStore.token &&
      props.type == "favorites"
    ) {
      router.push(`/login?redirect=/collections/favorites`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userStore.state, userStore.token]);

  if (isLoading) {
    return (
      <div className="empty">
        <Spinner />
        <p>Загружаем коллекции</p>
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
          Произошла ошибка при загрузке коллекций. Попробуйте обновить страницу
          или зайдите позже.
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHead title={props.title} subtitle="Подборки Anixart" />

      {content && content.length > 0 ?
        <CollectionsSection
          content={content}
          isMyCollections={
            props.type == "profile" &&
            userStore.user &&
            props.profile_id == userStore.user.id
          }
        />
      : <div className="empty">
          <span className="empty-ic">
            <Icon name="collection" size={32} />
          </span>
          <div className="empty-t">Пока пусто</div>
          <p>Тут пока ничего нет.</p>
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
