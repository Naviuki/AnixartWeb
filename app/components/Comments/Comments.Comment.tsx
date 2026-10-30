import { unixToDate, sinceUnixDate } from "#/api/utils";
import { useEffect, useState } from "react";
import { ENDPOINTS } from "#/api/config";
import { Dropdown, DropdownItem } from "flowbite-react";
import Link from "next/link";
import { CommentsAddModal } from "./Comments.Add";
import { CommentsEditModal } from "./Comments.Edit";
import { useUserStore } from "#/store/auth";
import { Icon } from "#/components/Icon/Icon";

export const CommentsComment = (props: {
  release_id: number;
  profile: { login: string; avatar: string; id: number };
  comment: {
    id: number;
    timestamp: number;
    message: string;
    reply_count: number;
    likes_count: number;
    vote: number;
    isSpoiler: boolean;
    isEdited: boolean;
    isDeleted: boolean;
  };
  isSubComment?: boolean;
  token: string | null;
  isReplying?: boolean;
  parentComment?: any;
  setShouldRender?: (shouldRender: boolean) => void;
  setCommentSend?: (commentSend: boolean) => void;
  type?: "release" | "collection";
}) => {
  const [replies, setReplies] = useState([]);
  const [likes, setLikes] = useState(props.comment.likes_count);
  const [vote, setVote] = useState(props.comment.vote);
  const [isAddCommentsOpen, setIsAddCommentsOpen] = useState(false);
  const [isEditCommentsOpen, setIsEditCommentsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(
    !props.isReplying &&
      (props.comment.isSpoiler || props.comment.likes_count < -5)
  );
  const user: any = useUserStore((state) => state.user);

  const [shouldRender, setShouldRender] = useState(true);
  const [commentSend, setCommentSend] = useState(false);

  let parentCommentId: number | null = null;
  if (props.parentComment) {
    parentCommentId = props.parentComment.id;
  }

  async function _deleteComment() {
    if (props.token) {
      let url;
      if (props.type == "collection") {
        url = `${ENDPOINTS.collection.base}/comment/delete/${props.comment.id}?token=${props.token}`;
      } else {
        url = `${ENDPOINTS.release.info}/comment/delete/${props.comment.id}?token=${props.token}`;
      }
      await fetch(url);

      if (props.setShouldRender && props.setCommentSend) {
        props.setShouldRender(true);
        props.setCommentSend(true);
      }
    }
  }

  useEffect(() => {
    async function _fetchReplies() {
      setReplies([]);
      let url;
      if (props.type == "collection") {
        url = `${ENDPOINTS.collection.base}/comment/replies/${
          parentCommentId || props.comment.id
        }/0?sort=2`;
      } else {
        url = `${ENDPOINTS.release.info}/comment/replies/${
          parentCommentId || props.comment.id
        }/0?sort=2`;
      }

      if (props.token) {
        url += `&token=${props.token}`;
      }
      await fetch(url)
        .then((res) => {
          if (res.ok) {
            return res.json();
          } else {
            return { content: [] };
          }
        })
        .then((data) => {
          if (data && data.content) {
            setReplies(data.content);
          }
        });
    }
    if (
      !props.isSubComment &&
      !props.isReplying &&
      shouldRender &&
      (commentSend || props.comment.reply_count > 0)
    ) {
      _fetchReplies();
      setShouldRender(false);
      setCommentSend(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentSend]);

  async function _sendVote(action: number) {
    if (props.token) {
      let url;

      if (props.type == "collection") {
        url = `${ENDPOINTS.collection.base}/comment/vote/${props.comment.id}/${action}?token=${props.token}`;
      } else {
        url = `${ENDPOINTS.release.info}/comment/vote/${props.comment.id}/${action}?token=${props.token}`;
      }
      fetch(url);
    }
  }

  // TODO: make it readable
  function _updateVote(action: string) {
    if (action === "like" && vote == 0) {
      setVote(2);
      setLikes(likes + 1);
      _sendVote(2);
    } else if (action === "dislike" && vote == 0) {
      setVote(1);
      setLikes(likes - 1);
      _sendVote(1);
    } else if (action === "like" && vote == 1) {
      setVote(2);
      setLikes(likes + 2);
      _sendVote(2);
    } else if (action === "dislike" && vote == 2) {
      setVote(1);
      setLikes(likes - 2);
      _sendVote(1);
    } else {
      _sendVote(vote);
      setVote(0);
      if (action === "dislike" && vote == 1) {
        setLikes(likes + 1);
      } else if (action === "like" && vote == 2) {
        setLikes(likes - 1);
      }
    }
  }

  return (
    <>
      <article className={`comment ${props.isSubComment ? "sub" : ""}`}>
        <div className="comment-head">
          <Link href={`/profile/${props.profile.id}`} className="comment-ava">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={props.profile.avatar} alt="" />
          </Link>
          <Link href={`/profile/${props.profile.id}`} className="comment-name">
            {props.profile.login}
          </Link>
          <span className="comment-date">
            <time
              dateTime={props.comment.timestamp.toString()}
              title={unixToDate(props.comment.timestamp, "full")}
            >
              {sinceUnixDate(props.comment.timestamp)}
            </time>
          </span>
          {user && props.profile.id == user.id && (
            <span style={{ marginLeft: "auto" }}>
              <Dropdown
                label=""
                dismissOnClick={false}
                renderTrigger={() => (
                  <button
                    type="button"
                    className="btn icon-only"
                    style={{ width: 30, height: 30 }}
                    aria-label="Действия с комментарием"
                  >
                    <Icon name="more" size={16} />
                  </button>
                )}
              >
                <DropdownItem onClick={() => setIsEditCommentsOpen(true)}>
                  Редактировать
                </DropdownItem>
                <DropdownItem onClick={() => _deleteComment()}>
                  Удалить
                </DropdownItem>
              </Dropdown>
            </span>
          )}
        </div>

        <div className="comment-text">
          {!props.comment.isDeleted ?
            props.comment.message
          : "Комментарий был удалён."}
          {isHidden && (
            <button
              type="button"
              className="comment-spoiler"
              onClick={() => setIsHidden(false)}
            >
              <span>
                {props.comment.likes_count < -5 ?
                  "У комментария слишком низкий рейтинг."
                : "Данный комментарий может содержать спойлер."}
              </span>
              <b>Нажмите, чтобы прочитать</b>
            </button>
          )}
        </div>

        {!props.isReplying && !props.comment.isDeleted && (
          <div className="comment-foot">
            {props.token ?
              <button type="button" onClick={() => setIsAddCommentsOpen(true)}>
                <Icon name="comment" size={14} />
                Ответить
              </button>
            : <span></span>}
            <span className="votes">
              <button
                type="button"
                onClick={() => {
                  _updateVote("dislike");
                }}
                disabled={!props.token}
                className={vote == 1 ? "disliked" : ""}
                aria-label="Не нравится"
              >
                <Icon name="dislike" size={14} />
              </button>
              <b>{likes}</b>
              <button
                type="button"
                onClick={() => {
                  _updateVote("like");
                }}
                disabled={!props.token}
                className={vote == 2 ? "liked" : ""}
                aria-label="Нравится"
              >
                <Icon name="like" size={14} />
              </button>
            </span>
          </div>
        )}

        {replies.length > 0 &&
          replies.map((comment: any) => (
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
              isSubComment={true}
              token={props.token}
              parentComment={props.parentComment || props.comment}
              setShouldRender={props.setShouldRender || setShouldRender}
              setCommentSend={props.setCommentSend || setCommentSend}
            />
          ))}
      </article>
      <CommentsAddModal
        isOpen={isAddCommentsOpen}
        setIsOpen={setIsAddCommentsOpen}
        release_id={props.release_id}
        token={props.token}
        isReply={true}
        parentComment={props.parentComment || props.comment}
        parentProfile={props.profile}
        setShouldRender={props.setShouldRender || setShouldRender}
        setCommentSend={props.setCommentSend || setCommentSend}
        type={props.type}
      />
      {props.token && (
        <CommentsEditModal
          isOpen={isEditCommentsOpen}
          setIsOpen={setIsEditCommentsOpen}
          token={props.token}
          parentComment={props.comment}
          setShouldRender={props.setShouldRender || setShouldRender}
          setCommentSend={props.setCommentSend || setCommentSend}
          type={props.type}
        />
      )}
    </>
  );
};
