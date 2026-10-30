import { ReleaseChips } from "../ReleasePoster/Chips";
import { Poster } from "../ReleasePoster/Poster";
import Link from "next/link";
import { getFixedGrade, getUserList } from "#/api/utils";
import { Icon } from "#/components/Icon/Icon";

export const ProfileReleaseHistory = (props: any) => {
  return (
    <div className="box">
      <div className="sh" style={{ marginBottom: 12 }}>
        <h2>
          <Icon name="history" size={18} />
          Недавно просмотренные
        </h2>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {props.history.map((release) => {
          const grade = getFixedGrade(release.grade);
          const profile_list_status = release.profile_list_status || null;
          const user_list = getUserList(profile_list_status);

          return (
            <Link
              href={`/release/${release.id}`}
              key={`history-${release.id}`}
              className="row"
              style={{ marginBottom: 0 }}
            >
              <span className="row-poster">
                <Poster image={release.image} className="h-auto" />
              </span>
              <span className="row-body">
                <ReleaseChips
                  {...release}
                  user_list={user_list}
                  grade={grade}
                />
                <span className="row-sub">{release.genres || ""}</span>
                {release.title_ru && (
                  <span className="row-title">{release.title_ru}</span>
                )}
                {release.title_original && (
                  <span className="row-sub desk-only">
                    {release.title_original}
                  </span>
                )}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
