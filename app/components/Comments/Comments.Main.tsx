import { CommentsComment } from "./Comments.Comment";
import { useState, useEffect, useCallback } from "react";
import { ENDPOINTS } from "#/api/config";
import useSWRInfinite from "swr/infinite";
import { CommentsAddModal } from "./Comments.Add";
import { useSWRfetcher } from "#/api/utils";
import { Spinner } from "#/components/Spinner/Spinner";
import { Icon } from "#/components/Icon/Icon";

export const CommentsMain = (props: {
  release_id: number;
  token: string | null;
  comments: any;
  type?: "release" | "collection";
}) => {
  const [isAllCommentsOpen, setIsAllCommentsOpen] = useState(false);
  const [isAddCommentsOpen, setIsAddCommentsOpen] = useState(false);
  const type = props.type || "release";

  return (
    <>
      <div className="box">
        <div className="sh" style={{ marginBottom: 12 }}>
          <h2>Комментарии</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {props.token && (
              <button
                type="button"
                className="btn p"
                onClick={() => setIsAddCommentsOpen(true)}
              >
                <Icon name="plus" size={16} />
                Оставить комментарий
              </button>
            )}
            <button
              type="button"
              className="btn"
              onClick={() => setIsAllCommentsOpen(true)}
            >
              Показать все
            </button>
          </div>
        </div>

        <div>
          {props.comments && props.comments.length > 0 ?
            props.comments.map((comment: any) => (
              <CommentsComment
                key={comment.id}
                release_id={props.release_id}
                profile={comment.profile}
                comment={{
                  id: comment.id,
                  timestamp: comment.timestamp,
                  message: comment.message,
                  reply_count: comment.reply_count,
                  likes_count: comment.likes_count,
                  vote: comment.vote,
                  isSpoiler: comment.is_spoiler,
                  isEdited: comment.is_edited,
                  isDeleted: comment.is_deleted,
                }}
                token={props.token}
                isSubComment={type != "release"}
                type={type}
              />
            ))
          : <div className="empty" style={{ marginBottom: 0, padding: "28px 16px" }}>
              <span className="empty-ic" style={{ width: 56, height: 56 }}>
                <Icon name="comment" size={24} />
              </span>
              <p>Комментариев пока нет</p>
            </div>
          }
        </div>
      </div>

      <CommentsAllModal
        isOpen={isAllCommentsOpen}
        setIsOpen={setIsAllCommentsOpen}
        release_id={props.release_id}
        token={props.token}
        type={props.type}
      />
      <CommentsAddModal
        isOpen={isAddCommentsOpen}
        setIsOpen={setIsAddCommentsOpen}
        release_id={props.release_id}
        token={props.token}
        type={props.type}
      />
    </>
  );
};

const CommentsAllModal = (props: {
  isOpen: boolean;
  setIsOpen: any;
  release_id: number;
  token: string | null;
  type?: "release" | "collection";
}) => {
  const [currentRef, setCurrentRef] = useState<any>(null);
  const modalRef = useCallback((ref) => {
    setCurrentRef(ref);
  }, []);

  const type = props.type || "release";

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.content.length) return null;
    let url;
    if (type == "release") {
      url = `${ENDPOINTS.release.info}/comment/all/${props.release_id}/${pageIndex}?sort=1`;
    } else if (type == "collection") {
      url = `${ENDPOINTS.collection.base}/comment/all/${props.release_id}/${pageIndex}?sort=1`;
    }
    if (props.token) {
      url += `&token=${props.token}`;
    }
    return url;
  };

  const { data, error, isLoading, size, setSize } = useSWRInfinite(
    getKey,
    useSWRfetcher,
    { initialSize: 2 }
  );

  const [content, setContent] = useState(null);
  useEffect(() => {
    if (data) {
      let allReleases = [];
      for (let i = 0; i < data.length; i++) {
        allReleases.push(...data[i].content);
      }
      setContent(allReleases);
    }
  }, [data]);

  const [scrollPosition, setScrollPosition] = useState(0);
  function handleScroll() {
    const height = currentRef.scrollHeight - currentRef.clientHeight;
    const windowScroll = currentRef.scrollTop;
    const scrolled = (windowScroll / height) * 100;
    setScrollPosition(Math.floor(scrolled));
  }

  useEffect(() => {
    if (scrollPosition >= 95 && scrollPosition <= 96) {
      setSize(size + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollPosition]);

  if (!props.isOpen) return <></>;

  return (
    <div className="md" onClick={() => props.setIsOpen(false)}>
      <div
        className="mb"
        style={{ width: "min(720px, 100%)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-head">
          <div>
            <h3>Все комментарии</h3>
            <p className="muted small">
              всего: {isLoading || !data ? "загрузка..." : data[0].total_count}
            </p>
          </div>
          <button
            type="button"
            className="mb-close"
            onClick={() => props.setIsOpen(false)}
            aria-label="Закрыть"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="mb-list" onScroll={handleScroll} ref={modalRef}>
          {isLoading ?
            <div className="empty" style={{ marginBottom: 0 }}>
              <Spinner />
            </div>
          : content ?
            content.map((comment: any) => (
              <CommentsComment
                release_id={props.release_id}
                key={comment.id}
                profile={comment.profile}
                comment={{
                  id: comment.id,
                  timestamp: comment.timestamp,
                  message: comment.message,
                  reply_count: comment.reply_count,
                  likes_count: comment.likes_count,
                  vote: comment.vote,
                  isSpoiler: comment.is_spoiler,
                  isEdited: comment.is_edited,
                  isDeleted: comment.is_deleted,
                }}
                token={props.token}
                type={type}
              />
            ))
          : <p className="muted small">Комментариев нет</p>}
        </div>
      </div>
    </div>
  );
};
