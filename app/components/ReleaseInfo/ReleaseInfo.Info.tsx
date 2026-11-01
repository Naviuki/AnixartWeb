import { ReleaseInfoSearchLink } from "#/components/ReleaseInfo/ReleaseInfo.SearchLink";
import { unixToDate, minutesToTime } from "#/api/utils";
import { countryFlag, countryLanguage } from "#/api/country";
import { Icon } from "#/components/Icon/Icon";

const weekDay = [
  "_",
  "каждый понедельник",
  "каждый вторник",
  "каждую среду",
  "каждый четверг",
  "каждую пятницу",
  "каждую субботу",
  "каждое воскресенье",
];
const YearSeason = ["_", "Зима", "Весна", "Лето", "Осень"];

const Cell = (props: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="infocell">
      <span className="infocell-ic">
        <Icon name={props.icon} size={17} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="infocell-k">{props.title}</div>
        <div className="infocell-v">{props.children}</div>
      </div>
    </div>
  );
};

export const ReleaseInfoInfo = (props: {
  country: string | null;
  aired_on_date: number | null;
  year: number | null;
  episodes: { total: number | null; released: number | null };
  season: number;
  status: string;
  duration: number;
  category: string;
  broadcast: number;
  studio: string | null;
  author: string | null;
  director: string | null;
  genres: string;
}) => {
  const yearLabel = `${props.season && props.season != 0 ? `${YearSeason[props.season]} ` : ""}${
    props.year ? `${props.year} г.` : ""
  }`;

  return (
    <div className="box">
      <h3 style={{ marginBottom: 14 }}>О тайтле</h3>

      <div className="infogrid">
        <Cell icon="globe" title="Страна, сезон">
          {props.country ?
            <>
              {countryFlag(props.country) && (
                <span className="infocell-flag" aria-hidden="true">
                  {countryFlag(props.country)}
                </span>
              )}
              {props.country}
              {countryLanguage(props.country) && (
                <span className="infocell-sub">
                  , {countryLanguage(props.country)}
                </span>
              )}
            </>
          : "Не указана"}
          {yearLabel ? `, ${yearLabel}` : ""}
        </Cell>

        <Cell icon="layers" title="Эпизоды">
          {props.episodes.released ? props.episodes.released : "?"}/
          {props.episodes.total ? `${props.episodes.total} эп.` : "? эп."}
          {props.duration != 0 && `, по ${minutesToTime(props.duration)}`}
        </Cell>

        <Cell icon="film" title="Формат">
          {props.category}
          {", "}
          {props.broadcast == 0 ?
            props.status.toLowerCase()
          : `выходит ${weekDay[props.broadcast]}`}
        </Cell>

        {(props.studio || props.author || props.director) && (
          <Cell icon="users" title="Студия и авторы">
            {props.studio && (
              <>
                {props.studio.split(", ").map((studio: string, index: number) => {
                  return (
                    <span key={`studio-${index}`}>
                      {index > 0 && ", "}
                      <ReleaseInfoSearchLink title={studio} searchBy={"studio"} />
                    </span>
                  );
                })}
              </>
            )}
            {props.author && (
              <>
                {props.studio && ", "}
                Автор:{" "}
                <ReleaseInfoSearchLink title={props.author} searchBy={"author"} />
              </>
            )}
            {props.director && (
              <>
                {(props.studio || props.author) && ", "}
                Режиссёр:{" "}
                <ReleaseInfoSearchLink
                  title={props.director}
                  searchBy={"director"}
                />
              </>
            )}
          </Cell>
        )}

        {props.status.toLowerCase() == "анонс" && (
          <Cell icon="clock" title="Премьера">
            {props.aired_on_date != 0 ?
              unixToDate(props.aired_on_date, "full")
            : props.year ?
              yearLabel
            : "Скоро"}
          </Cell>
        )}
      </div>

      {props.genres && (
        <div className="chiprow" style={{ marginTop: 14 }}>
          {props.genres.split(", ").map((genre: string, index: number) => {
            return (
              <span className="chip" key={`genre-${index}`}>
                <ReleaseInfoSearchLink title={genre} searchBy={"tag"} />
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
