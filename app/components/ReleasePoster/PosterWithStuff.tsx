import Image from "next/image";
import { ReleaseChips } from "./Chips";
import { getFixedGrade, getUserList, sinceUnixDate } from "#/api/utils";
import { Icon } from "#/components/Icon/Icon";

const STATUS_NAMES: Record<number, string> = {
  1: "Вышел",
  2: "Выходит",
  3: "Анонс",
};

export const PosterWithStuff = (props: {
  image: string;
  title_ru: string;
  title_original: string;
  description?: string;
  genres?: string;
  grade?: number;
  id: number;
  settings?: {
    showGenres?: boolean;
    showDescription?: boolean;
  };
  chipsSettings?: {
    enabled: boolean;
    gradeHidden?: boolean;
    statusHidden?: boolean;
    categoryHidden?: boolean;
    episodesHidden?: boolean;
    listHidden?: boolean;
    favHidden?: boolean;
  };
  lastWatchedHidden?: boolean;
  profile_list_status?: number;
  status?: {
    id?: number;
    name: string;
  };
  category?: {
    name: string;
  };
  status_id?: number;
  episodes_released?: string;
  episodes_total?: string;
  is_favorite?: boolean;
  last_view_episode?: any;
  last_view_timestamp?: number;
}) => {
  const settings = {
    showGenres: true,
    showDescription: true,
    ...props.settings,
  };
  const chipsSettings = props.chipsSettings || {};

  const grade = getFixedGrade(props.grade);
  const profile_list_status = props.profile_list_status || null;
  const user_list = getUserList(profile_list_status);

  const showLastWatched =
    (!props.lastWatchedHidden && props.last_view_episode) || false;

  const statusName =
    (props.status_id && STATUS_NAMES[props.status_id]) ||
    (props.status?.id && STATUS_NAMES[props.status.id]) ||
    props.status?.name;

  const episodes =
    props.episodes_released || props.episodes_total ?
      `${props.episodes_released || "?"}${
        props.episodes_total ? `/${props.episodes_total}` : ""
      } эп.`
    : "";

  const watchedEpisode = props.last_view_episode
    ? props.last_view_episode.name ||
      `${(props.last_view_episode.position || 0) + 1} серия`
    : "";

  const progress =
    showLastWatched && props.episodes_total ?
      Math.min(
        100,
        Math.max(
          0,
          (((props.last_view_episode?.position || 0) + 1) /
            Number(props.episodes_total)) *
            100
        )
      )
    : 0;

  return (
    <div className="rcard">
      {showLastWatched && (
        <div className="rcard-watch">
          <Icon name="clock" size={12} />
          <span>
            {props.last_view_timestamp
              ? sinceUnixDate(props.last_view_timestamp)
              : ""}
          </span>
          <span>·</span>
          <span>{watchedEpisode}</span>
        </div>
      )}

      <div className="rcard-poster">
        <Image
          src={props.image}
          alt={props.title_ru || ""}
          fill
          sizes="(max-width: 760px) 45vw, 220px"
          className="object-cover"
        />
        <div className="rcard-grad" />
        {statusName && <span className="rcard-badge">{statusName}</span>}
        {grade ? (
          <span className="rcard-rate">
            <i
              className="rcard-dot"
              style={{
                background:
                  grade >= 4.5 ? "var(--rate-5)"
                  : grade >= 3.5 ? "var(--rate-4)"
                  : grade >= 2.5 ? "var(--rate-3)"
                  : grade >= 1.5 ? "var(--rate-2)"
                  : "var(--rate-1)",
              }}
            />
            {grade}
          </span>
        ) : null}
        <span className="rcard-title">{props.title_ru}</span>
      </div>

      <span className="rcard-below">{props.title_ru}</span>

      <div className="rcard-meta">
        {episodes && <span>{episodes}</span>}
        {settings.showGenres && props.genres && (
          <>
            {episodes && <span>·</span>}
            <span className="rcard-genres">{props.genres}</span>
          </>
        )}
        {!episodes && !(settings.showGenres && props.genres) && props.category && (
          <span>{props.category.name}</span>
        )}
      </div>

      <ReleaseChips
        {...props}
        settings={{
          ...chipsSettings,
          gradeHidden: true,
          statusHidden: true,
        }}
        user_list={user_list}
        grade={grade}
      />

      {settings.showDescription && props.description && (
        <p className="rcard-desc">{props.description}</p>
      )}

      {progress > 0 && (
        <div className="rcard-pg">
          <i style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
};
