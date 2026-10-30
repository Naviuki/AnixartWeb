import { Icon } from "#/components/Icon/Icon";

interface ChipProps {
  settings?: any;
  grade?: any;
  status?: any;
  status_id?: any;
  user_list?: any;
  episodes_released?: any;
  episodes_total?: any;
  category?: any;
  is_favorite?: any;
  column?: any;
}

const STATUS_ID_TO_STR = {
  0: null,
  1: "Вышел",
  2: "Выходит",
  3: "Анонс",
};

const LIST_COLORS: Record<string, string> = {
  Смотрю: "var(--st-watching)",
  "В планах": "var(--st-planned)",
  Просмотрено: "var(--st-watched)",
  Отложено: "var(--st-delayed)",
  Брошено: "var(--st-dropped)",
};

const gradeColor = (grade: number) => {
  if (grade >= 4.5) return "var(--rate-5)";
  if (grade >= 3.5) return "var(--rate-4)";
  if (grade >= 2.5) return "var(--rate-3)";
  if (grade >= 1.5) return "var(--rate-2)";
  return "var(--rate-1)";
};

export const ReleaseChips = ({
  settings,
  grade,
  status,
  status_id,
  user_list,
  episodes_released,
  episodes_total,
  category,
  is_favorite,
  column,
}: ChipProps) => {
  const chipSettings = {
    enabled: true,
    gradeHidden: false,
    statusHidden: false,
    categoryHidden: false,
    episodesHidden: false,
    listHidden: false,
    favHidden: false,
    column: false,
    ...settings,
  };

  const status_name =
    status_id != 0 ?
      STATUS_ID_TO_STR[status_id]
    : status ?
      STATUS_ID_TO_STR[status.id]
    : null;
  const ep_rel = episodes_released || "?";
  const ep_tot = episodes_total || "?";
  const episode_count = `${ep_rel}${ep_rel == "?" ? "" : "/"}${ep_tot} эп.`;

  return (
    <div
      className={`${chipSettings.enabled ? "flex" : "hidden"} ${
        chipSettings.column || column ? "column" : ""
      } rcard-chips`}
    >
      {!chipSettings.gradeHidden && grade ?
        <span className="badge soft">
          <i
            className="dot"
            style={{ background: gradeColor(Number(grade)) }}
          />
          {grade}
        </span>
      : ""}

      {!chipSettings.categoryHidden && category && (
        <span className="badge soft">{category.name}</span>
      )}

      {!chipSettings.listHidden && user_list && (
        <span
          className="badge"
          style={{
            background: LIST_COLORS[user_list.name] || "var(--acc)",
            borderColor: "transparent",
            color: "#fff",
          }}
        >
          {user_list.name}
        </span>
      )}

      {!chipSettings.favHidden && is_favorite && (
        <span
          className="badge"
          style={{
            background: "var(--st-favorite)",
            borderColor: "transparent",
            color: "#fff",
          }}
          title="В избранном"
        >
          <Icon name="heart" size={12} />
        </span>
      )}

      {!chipSettings.statusHidden && status_name && (
        <span className="badge soft">
          {status_name}
          {!chipSettings.episodesHidden &&
            ` · ${status_name == "Вышел" || status_name == "Анонс" ? ep_tot : episode_count}`}
        </span>
      )}
    </div>
  );
};
