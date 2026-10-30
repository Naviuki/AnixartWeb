import { CommentsComment } from "./Comments.Comment";
import { useState } from "react";
import { ENDPOINTS } from "#/api/config";
import { Icon } from "#/components/Icon/Icon";

export const CommentsAddModal = (props: {
  isOpen: boolean;
  setIsOpen: any;
  release_id: number;
  isReply?: boolean;
  parentComment?: any;
  parentProfile?: any;
  token: string;
  setShouldRender?: any;
  setCommentSend?: any;
  type?: "release" | "collection";
}) => {
  const [message, setMessage] = useState(
    props.isReply ? `${props.parentProfile.login}, ` : ""
  );
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [isSending, setIsSending] = useState(false);

  function _sendComment(e) {
    e.preventDefault();
    const re = /\n/gi;
    const data = {
      message: message.replace(re, "\r\n").trim(),
      parentCommentId: !props.parentComment ? null : props.parentComment.id,
      replyToProfileId: !props.parentProfile ? null : props.parentProfile.id,
      spoiler: isSpoiler,
    };

    async function _send() {
      let url;

      if (props.type == "collection") {
        url = `${ENDPOINTS.collection.base}/comment/add/${props.release_id}?token=${props.token}`;
      } else {
        url = `${ENDPOINTS.release.info}/comment/add/${props.release_id}?token=${props.token}`;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (props.isReply && props.setShouldRender && props.setCommentSend) {
        props.setShouldRender(true);
        props.setCommentSend(true);
      }

      setMessage(props.isReply ? `${props.parentProfile.login}, ` : "");
      setIsSpoiler(false);
      props.setIsOpen(false);
      setIsSending(false);
    }

    if (props.token && message.trim() != "") {
      setIsSending(true);
      _send();
    }
  }

  if (!props.isOpen) return null;

  return (
    <div
      className="md"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) props.setIsOpen(false);
      }}
    >
      <div className="mb" style={{ width: "min(560px, 100%)" }}>
        <div className="mb-head">
          <h3>
            {props.isReply ? "Ответ на комментарий" : "Оставить комментарий"}
          </h3>
          <button
            type="button"
            className="mb-close"
            onClick={() => props.setIsOpen(false)}
            aria-label="Закрыть"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {props.isReply && (
          <div style={{ marginBottom: 14 }}>
            <CommentsComment
              release_id={props.release_id}
              profile={props.parentProfile}
              comment={{
                id: props.parentComment.id,
                timestamp: props.parentComment.timestamp,
                message: props.parentComment.message,
                reply_count: props.parentComment.reply_count,
                likes_count: props.parentComment.likes_count,
                vote: props.parentComment.vote,
                isSpoiler: props.parentComment.isSpoiler,
                isEdited: props.parentComment.isEdited,
                isDeleted: props.parentComment.isDeleted,
              }}
              token={props.token}
              isReplying={true}
            />
          </div>
        )}

        <form className="form" onSubmit={(e) => _sendComment(e)}>
          <label htmlFor="comment" className="sr-only">
            Ваш комментарий
          </label>
          <textarea
            id="comment"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Написать комментарий..."
            required={true}
            rows={4}
          />
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              marginTop: 12,
            }}
          >
            <label className="check" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={isSpoiler}
                onChange={() => setIsSpoiler(!isSpoiler)}
              />
              <span>Спойлер</span>
            </label>
            <button type="submit" className="btn p" disabled={isSending}>
              <Icon name="comment" size={16} />
              Отправить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
