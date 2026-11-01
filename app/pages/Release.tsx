"use client";

import useSWR from "swr";
import Link from "next/link";
import { Spinner } from "#/components/Spinner/Spinner";
import { useSWRfetcher } from "#/api/utils";
import { useUserStore } from "#/store/auth";
import { useEffect, useState } from "react";

import { ReleaseInfoBasics } from "#/components/ReleaseInfo/ReleaseInfo.Basics";
import { SeasonBell } from "#/components/Notifications/SeasonBell";import { ReleaseInfoInfo } from "#/components/ReleaseInfo/ReleaseInfo.Info";
import { ReleasePlayer } from "#/components/ReleasePlayer/ReleasePlayer";
import { ReleasePlayerCustom } from "#/components/ReleasePlayer/ReleasePlayerCustom";
import { ReleaseInfoUserList } from "#/components/ReleaseInfo/ReleaseInfo.UserList";
import { ReleaseInfoRating } from "#/components/ReleaseInfo/ReleaseInfo.Rating";
import { ReleaseInfoRelated } from "#/components/ReleaseInfo/ReleaseInfo.Related";
import { ReleaseInfoScreenshots } from "#/components/ReleaseInfo/ReleaseInfo.Screenshots";
import { CommentsMain } from "#/components/Comments/Comments.Main";
import { InfoLists } from "#/components/InfoLists/InfoLists";
import { ENDPOINTS } from "#/api/config";
import { usePreferencesStore } from "#/store/preferences";
import { ContinueWatching } from "#/components/ContinueWatching/ContinueWatching";
import { ShareButton } from "#/components/FloatingToolbar/ShareButton";
import { FloatingToolbar } from "#/components/FloatingToolbar/FloatingToolbar";
import { DownloadButton } from "#/components/FloatingToolbar/DownloadButton";
import { Icon } from "#/components/Icon/Icon";

export const ReleasePage = (props: any) => {
  const userStore = useUserStore();
  const preferenceStore = usePreferencesStore();
  const [userList, setUserList] = useState(0);
  const [userFavorite, setUserFavorite] = useState(false);

  function useFetch(id: number) {
    let url: string;

    url = `${ENDPOINTS.release.info}/${id}`;
    if (userStore.token) {
      url += `?token=${userStore.token}`;
    }
    const { data, isLoading, error } = useSWR(url, useSWRfetcher);
    return [data, isLoading, error];
  }
  const [data, isLoading, error] = useFetch(props.id);

  // Через <style> из note браузер перекрашивал подложку, и текст сливался
  // с фоном. Оставляем только текст, разметку не вставляем.
  const noteText =
    data && typeof data.release?.note === "string" ?
      data.release.note
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim()
    : "";

  useEffect(() => {
    if (data) {
      setUserList(data.release.profile_list_status || 0);
      setUserFavorite(data.release.is_favorite);
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="empty">
        <Spinner />
        <p>Загружаем релиз</p>
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
          Произошла ошибка при загрузке релиза. Попробуйте обновить страницу или
          зайдите позже.
        </p>
      </div>
    );
  }

  const isAnnounce =
    data.release.status &&
    data.release.status.name.toLowerCase() == "анонс";

  return (
    <>
      <div className="crumbs">
        <Link href="/">Главная</Link>
        <Icon name="chevron" size={14} />
        <Link href={`/search?query=${data.release.category.name}`}>
          {data.release.category.name}
        </Link>
        <Icon name="chevron" size={14} />
        <span>{data.release.title_ru}</span>
      </div>

      <ReleaseInfoBasics
        image={data.release.image}
        title={{
          ru: data.release.title_ru,
          original: data.release.title_original,
        }}
        description={data.release.description}
        note={noteText}
        release_id={data.release.id}
      >
        <ReleaseInfoUserList
          userList={userList}
          isFavorite={userFavorite}
          release_id={data.release.id}
          token={userStore.token}
          profile_id={userStore.user ? userStore.user.id : null}
          setUserList={setUserList}
          setIsFavorite={setUserFavorite}
          collection_count={data.release.collection_count}
        />
        <SeasonBell
          releaseId={data.release.id}
          title={data.release.title_ru}
        />
      </ReleaseInfoBasics>

      <div className="rel-grid">
        <div className="rel-main">
          {data.release.status && !isAnnounce && (
            <>
              {preferenceStore.params.experimental.newPlayer ?
                <ReleasePlayerCustom
                  id={props.id}
                  token={userStore.token}
                  title={
                    data.release.title_ru || data.release.title_original || ""
                  }
                />
              : <ReleasePlayer id={props.id} />}
            </>
          )}

          <div className="desk-only">
            <CommentsMain
              release_id={props.id}
              token={userStore.token}
              comments={data.release.comments}
            />
          </div>
        </div>

        <aside className="rel-side">
          <ReleaseInfoInfo
            country={data.release.country}
            aired_on_date={data.release.aired_on_date}
            year={data.release.year}
            episodes={{
              total: data.release.episodes_total,
              released: data.release.episodes_released,
            }}
            season={data.release.season}
            status={data.release.status ? data.release.status.name : "Анонс"}
            duration={data.release.duration}
            category={data.release.category.name}
            broadcast={data.release.broadcast}
            studio={data.release.studio}
            author={data.release.author}
            director={data.release.director}
            genres={data.release.genres}
          />

          {data.release.status && !isAnnounce && (
            <ReleaseInfoRating
              release_id={props.id}
              grade={data.release.grade}
              token={userStore.token}
              votes={{
                1: data.release.vote_1_count,
                2: data.release.vote_2_count,
                3: data.release.vote_3_count,
                4: data.release.vote_4_count,
                5: data.release.vote_5_count,
                total: data.release.vote_count,
                user: data.release.your_vote,
              }}
            />
          )}

          <InfoLists
            completed={data.release.completed_count}
            planned={data.release.plan_count}
            abandoned={data.release.dropped_count}
            delayed={data.release.hold_on_count}
            watching={data.release.watching_count}
          />

          {data.release.screenshot_images.length > 0 && (
            <ReleaseInfoScreenshots images={data.release.screenshot_images} />
          )}

          {data.release.related_releases.length > 0 && (
            <ReleaseInfoRelated
              release_id={props.id}
              related={data.release.related}
              related_releases={data.release.related_releases}
            />
          )}

          {userStore.token && <ContinueWatching />}

          <div className="mob-only">
            <CommentsMain
              release_id={props.id}
              token={userStore.token}
              comments={data.release.comments}
            />
          </div>
        </aside>
      </div>

      <FloatingToolbar>
        <ShareButton
          text={`Смотреть '${data.release.title_ru || data.release.title_original} (${data.release.year || "?"}г.)' на Anixart`}
        />
        <DownloadButton
          release_id={props.id}
          release_title_ru={data.release.title_ru}
          release_title_en={data.release.title_original}
        />
      </FloatingToolbar>
    </>
  );
};
