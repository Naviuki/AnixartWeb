"use client";
import useSWRInfinite from "swr/infinite";
import { Spinner } from "#/components/Spinner/Spinner";
import { useState, useEffect } from "react";
import { useScrollPosition } from "#/hooks/useScrollPosition";
import { useUserStore } from "../store/auth";
import { ENDPOINTS } from "#/api/config";
import { getFixedGrade, getUserList, useSWRfetcher } from "#/api/utils";
import { ReleaseChips } from "#/components/ReleasePoster/Chips";
import Link from "next/link";
import Image from "next/image";
import { PageHead } from "#/components/PageHead/PageHead";
import { Icon } from "#/components/Icon/Icon";

const YearSeason = ["_", "Зима", "Весна", "Лето", "Осень"];

export function RelatedPage(props: { id: number | string; title: string }) {
  const token = useUserStore((state) => state.token);

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.content.length) return null;
    if (token) {
      return `${ENDPOINTS.release.related}/${props.id}/${pageIndex}?token=${token}&API-Version=v2`;
    }
    return `${ENDPOINTS.release.related}/${props.id}/${pageIndex}?API-Version=v2`;
  };

  const { data, error, isLoading, size, setSize } = useSWRInfinite(
    getKey,
    useSWRfetcher,
    { initialSize: 1 }
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

  return (
    <>
      <PageHead
        title={`Франшиза ${props.title}`}
        subtitle="Связанные релизы по порядку"
      />

      {error ?
        <div className="empty">
          <span className="empty-ic">
            <Icon name="info" size={32} />
          </span>
          <div className="empty-t">Ошибка</div>
          <p>
            Произошла ошибка при загрузке франшизы. Попробуйте обновить страницу
            или зайдите позже.
          </p>
        </div>
      : content && content.length > 0 ?
        <div className="relgrid">
          {content.map((release) => {
            const grade = getFixedGrade(release.grade);
            const profile_list_status = release.profile_list_status || null;
            const user_list = getUserList(profile_list_status);
            const meta = [
              release.season ? YearSeason[release.season] : null,
              release.year ? `${release.year} г.` : null,
            ]
              .filter(Boolean)
              .join(", ");

            return (
              <Link
                href={`/release/${release.id}`}
                className="relcard"
                key={`related-release-${release.id}`}
              >
                <div className="relcard-poster">
                  <Image
                    src={release.image}
                    fill
                    sizes="120px"
                    alt=""
                    className="object-cover"
                  />
                </div>
                <div className="relcard-body">
                  {meta && <div className="relcard-meta">{meta}</div>}
                  <div className="relcard-title">
                    {release.title_ru || release.title_original}
                  </div>
                  <div className="chiprow relcard-chips">
                    <ReleaseChips
                      {...release}
                      user_list={user_list}
                      grade={grade}
                      settings={{ column: true }}
                    />
                  </div>
                  {release.genres && (
                    <div className="relcard-genres">{release.genres}</div>
                  )}
                  {release.description && (
                    <p className="relcard-desc">{release.description}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
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
          <p>Связанных релизов пока нет.</p>
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
