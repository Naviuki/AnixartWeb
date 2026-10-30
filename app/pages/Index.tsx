"use client";
import { ReleaseCourusel } from "#/components/ReleaseCourusel/ReleaseCourusel";
import { ReleaseSection } from "#/components/ReleaseSection/ReleaseSection";
import { ContinueWatching } from "#/components/ContinueWatching/ContinueWatching";
import { Spinner } from "#/components/Spinner/Spinner";
import { Icon } from "#/components/Icon/Icon";
import { useUserStore } from "#/store/auth";
import { useState, useEffect } from "react";
import { FetchFilter } from "#/api/utils";
import Link from "next/link";
import Image from "next/image";

import { usePreferencesStore } from "#/store/preferences";
import { useRouter } from "next/navigation";
import {
  ListAnnounce,
  ListFilms,
  ListFinished,
  ListLast,
  ListOngoing,
} from "./IndexFilters";

export function IndexPage() {
  const token = useUserStore((state) => state.token);
  const preferenceStore = usePreferencesStore();
  const appearance = usePreferencesStore((state) => state.appearance);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [lastReleasesData, setLastReleasesData] = useState(null);
  const [ongoingReleasesData, setOngoingReleasesData] = useState(null);
  const [finishedReleasesData, setFinishedReleasesData] = useState(null);
  const [announceReleasesData, setAnnounceReleasesData] = useState(null);
  const [filmsReleasesData, setFilmsReleasesData] = useState(null);

  useEffect(() => {
    if (preferenceStore.params.skipToCategory.enabled) {
      router.push(
        `/home/${preferenceStore.params.skipToCategory.homeCategory}`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function _loadReleases() {
      setIsLoading(true);
      setLastReleasesData(null);
      setOngoingReleasesData(null);
      setFinishedReleasesData(null);
      setAnnounceReleasesData(null);
      setFilmsReleasesData(null);

      const [lastReleases] = await FetchFilter(ListLast.filter, 0, token);
      const [ongoingReleases] = await FetchFilter(ListOngoing.filter, 0, token);
      const [announceReleases] = await FetchFilter(
        ListAnnounce.filter,
        0,
        token
      );
      const [finishedReleases] = await FetchFilter(
        ListFinished.filter,
        0,
        token
      );
      const [filmsReleases] = await FetchFilter(ListFilms.filter, 0, token);

      setLastReleasesData(lastReleases);
      setOngoingReleasesData(ongoingReleases);
      setFinishedReleasesData(finishedReleases);
      setAnnounceReleasesData(announceReleases);
      setFilmsReleasesData(filmsReleases);
      setIsLoading(false);
    }
    if (!preferenceStore.params.skipToCategory.enabled) {
      _loadReleases();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const sec = appearance.sec;
  const heroRelease = lastReleasesData?.content?.[0];

  return (
    <>
      {Boolean(sec.hero) && heroRelease && (
        <section className="hero">
          <Image
            src={heroRelease.image}
            alt=""
            fill
            sizes="100vw"
            className="hero-bg"
            priority
          />
          <Image
            src={heroRelease.image}
            alt=""
            fill
            sizes="(max-width: 1023px) 100vw, 46vw"
            className="hero-poster"
            priority
          />
          <div className="hero-body">
            <h2>{heroRelease.title_ru}</h2>
            {heroRelease.description && <p>{heroRelease.description}</p>}
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <Link href={`/release/${heroRelease.id}`} className="btn p">
                <Icon name="play" size={16} />
                Смотреть
              </Link>
              <Link
                href={`/release/${heroRelease.id}/collections`}
                className="btn g"
                style={{ color: "#fff", borderColor: "#fff5" }}
              >
                <Icon name="collection" size={16} />
                В коллекциях
              </Link>
            </div>
          </div>
        </section>
      )}

      {Boolean(sec.cont) && <ContinueWatching variant="rail" />}

      {Boolean(sec.last) && lastReleasesData && (
        <ReleaseSection
          sectionTitle="Последние релизы"
          content={lastReleasesData.content.slice(0, 12)}
        />
      )}

      {Boolean(sec.ong) && ongoingReleasesData && (
        <ReleaseCourusel
          sectionTitle="Выходит"
          showAllLink="/home/ongoing"
          content={ongoingReleasesData.content}
        />
      )}

      {finishedReleasesData && (
        <ReleaseCourusel
          sectionTitle="Завершенные релизы"
          showAllLink="/home/finished"
          content={finishedReleasesData.content}
        />
      )}
      {announceReleasesData && (
        <ReleaseCourusel
          sectionTitle="Анонсированные релизы"
          showAllLink="/home/announce"
          content={announceReleasesData.content}
        />
      )}
      {filmsReleasesData && (
        <ReleaseCourusel
          sectionTitle="Фильмы"
          showAllLink="/home/films"
          content={filmsReleasesData.content}
        />
      )}

      {isLoading && (
        <div className="empty">
          <Spinner />
          <p>Загружаем релизы</p>
        </div>
      )}
    </>
  );
}
