import Link from "next/link";
import Image from "next/image";
import { sinceUnixDate, unixToDate } from "#/api/utils";
import { Icon } from "#/components/Icon/Icon";

export const ProfileActivityComment = (props: {
  content: any;
  profile_id: number;
}) => {
  return (
    <>
      {props.content && props.content.length > 0 ?
        props.content.map((comment) => {
          let isHidden = comment.isSpoiler || comment.likes_count < -5 || false;
          return (
            <article className="comment" key={`comment-${comment.id}`}>
              <div className="comment-head">
                <Link
                  href={`/profile/${comment.profile.id}`}
                  className="comment-ava"
                  aria-label={`Профиль ${comment.profile.login}`}
                >
                  <Image
                    width={28}
                    height={28}
                    src={comment.profile.avatar}
                    alt=""
                  />
                </Link>
                <Link
                  href={`/profile/${comment.profile.id}`}
                  className="comment-name"
                >
                  {comment.profile.login}
                </Link>
                <span className="comment-date">
                  <time
                    dateTime={comment.timestamp.toString()}
                    title={unixToDate(comment.timestamp, "full")}
                  >
                    {sinceUnixDate(comment.timestamp)}
                  </time>
                </span>
                <span
                  className="badge"
                  style={{
                    marginLeft: "auto",
                    color:
                      comment.likes_count > 0 ? "var(--rate-5)"
                      : comment.likes_count < 0 ? "var(--rate-1)"
                      : "var(--t3)",
                  }}
                >
                  <Icon
                    name={comment.likes_count < 0 ? "dislike" : "like"}
                    size={12}
                  />
                  {comment.likes_count}
                </span>
              </div>

              <div className="comment-text">
                {comment.release && typeof comment.release != "number" && (
                  <Link href={`/release/${comment.release.id}`}>
                    <p className="accent small" style={{ marginBottom: 4 }}>
                      {!comment.isDeleted ?
                        `К релизу: ${comment.release.title_ru || comment.release.title_alt || comment.release.title_original} (${comment.release.year || "?"})`
                      : ""}
                    </p>
                  </Link>
                )}
                {!comment.isDeleted ?
                  comment.message
                : "Комментарий был удалён."}
                {isHidden && (
                  <button
                    type="button"
                    className="comment-spoiler"
                    onClick={() => (isHidden = false)}
                  >
                    <span>
                      {comment.likes_count < -5 ?
                        "У комментария слишком низкий рейтинг."
                      : "Данный комментарий может содержать спойлер."}
                    </span>
                    <b>Нажмите, чтобы прочитать</b>
                  </button>
                )}
              </div>
            </article>
          );
        })
      : <p className="muted">Пользователь не оставлял комментарии</p>}
    </>
  );
};
