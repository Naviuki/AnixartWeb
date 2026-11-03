"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { sinceUnixDate, unixToDate } from "#/api/utils";
import { Icon } from "#/components/Icon/Icon";

// Один комментарий в списке активности профиля
const ActivityCommentItem = (props: {
  comment: any;
  profileId: number;
}) => {
  const { comment } = props;
  const [spoilerOpen, setSpoilerOpen] = useState(false);

  const profile = comment.profile || {};
  const likes = Number(comment.likes_count ?? comment.vote_count ?? 0);
  const timestamp = Number(comment.timestamp) || 0;
  const isDeleted = Boolean(comment.is_deleted || comment.isDeleted);
  // Спойлер и сильно заминусованный комментарий прячем до нажатия
  const isHidden =
    Boolean(comment.is_spoiler ?? comment.isSpoiler) || likes < -5;

  return (
    <article className="comment">
      <div className="comment-head">
        <Link
          href={`/profile/${profile.id || props.profileId}`}
          className="comment-ava"
          aria-label={`Профиль ${profile.login || ""}`.trim()}
        >
          {profile.avatar ?
            <Image width={28} height={28} src={profile.avatar} alt="" />
          : <span className="mini-ava">
              <Icon name="user" size={14} />
            </span>
          }
        </Link>
        <Link
          href={`/profile/${profile.id || props.profileId}`}
          className="comment-name"
        >
          {profile.login || "Пользователь"}
        </Link>
        {timestamp > 0 && (
          <span className="comment-date">
            <time dateTime={String(timestamp)} title={unixToDate(timestamp, "full")}>
              {sinceUnixDate(timestamp)}
            </time>
          </span>
        )}
        <span
          className="badge"
          style={{
            marginLeft: "auto",
            color:
              likes > 0 ? "var(--rate-5)"
              : likes < 0 ? "var(--rate-1)"
              : "var(--t3)",
          }}
        >
          <Icon name={likes < 0 ? "dislike" : "like"} size={12} />
          {likes}
        </span>
      </div>

      <div className="comment-text">
        {comment.release && typeof comment.release != "number" && (
          <Link href={`/release/${comment.release.id}`}>
            <p className="accent small" style={{ marginBottom: 4 }}>
              {`К релизу: ${comment.release.title_ru || comment.release.title_alt || comment.release.title_original || ""} (${comment.release.year || "?"})`}
            </p>
          </Link>
        )}
        {isDeleted ?
          "Комментарий был удалён."
        : isHidden && !spoilerOpen ?
          <button
            type="button"
            className="comment-spoiler"
            onClick={() => setSpoilerOpen(true)}
          >
            <span>
              {likes < -5 ?
                "У комментария слишком низкий рейтинг."
              : "Данный комментарий может содержать спойлер."}
            </span>
            <b>Нажмите, чтобы прочитать</b>
          </button>
        : comment.message}
      </div>
    </article>
  );
};

export const ProfileActivityComment = (props: {
  content: any;
  profile_id: number;
}) => {
  // Профиль может скрывать комментарии — тогда показываем пустое состояние
  const comments = Array.isArray(props.content) ?
    props.content.filter((item) => item && typeof item === "object")
  : [];

  if (!comments.length) {
    return <p className="muted">Пользователь не оставлял комментарии</p>;
  }

  return (
    <>
      {comments.map((comment) => (
        <ActivityCommentItem
          key={`comment-${comment.id}`}
          comment={comment}
          profileId={props.profile_id}
        />
      ))}
    </>
  );
};
