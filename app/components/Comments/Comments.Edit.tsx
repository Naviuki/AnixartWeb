import { useState } from "react";
import { ENDPOINTS } from "#/api/config";
import { Icon } from "#/components/Icon/Icon";

export const CommentsEditModal = (props: {
  isOpen: boolean;
  setIsOpen: any;
  parentComment?: any;
  token: string;
  setShouldRender?: any;
  setCommentSend?: any;
  type?: "release" | "collection";
}) => {
  const [message, setMessage] = useState(props.parentComment.message);
  const [isSpoiler, setIsSpoiler] = useState(props.parentComment.isSpoiler);
  const [isSending, setIsSending] = useState(false);

  function _sendComment(e) {
    e.preventDefault();
    const re = /\n/gi;
    const data = {
      message: message.replace(re, "\r\n").trim(),
      spoiler: isSpoiler,
    };

    async function _send() {
      let url;
      if (props.type == "collection") {
        url = `${ENDPOINTS.collection.base}/comment/edit/${props.parentComment.id}?token=${props.token}`;
      } else {
        url = `${ENDPOINTS.release.info}/comment/edit/${props.parentComment.id}?token=${props.token}`;
      }
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (props.setShouldRender && props.setCommentSend) {
        props.setShouldRender(true);
        props.setCommentSend(true);
      }

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
          <h3>Редактировать комментарий</h3>
          <button
            type="button"
            className="mb-close"
            onClick={() => props.setIsOpen(false)}
            aria-label="Закрыть"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <form className="form" onSubmit={(e) => _sendComment(e)}>
          <label htmlFor="comment" className="sr-only">
            Редактировать ваш комментарий
          </label>
          <textarea
            id="comment"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Редактировать комментарий..."
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
              <Icon name="edit" size={16} />
              Изменить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
