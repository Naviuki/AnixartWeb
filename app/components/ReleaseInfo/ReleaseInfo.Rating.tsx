import { numberDeclension } from "#/api/utils";
import { useState } from "react";
import { ENDPOINTS } from "#/api/config";
import { Icon } from "#/components/Icon/Icon";

const rateColor = (value: number) => {
  if (value >= 5) return "var(--rate-5)";
  if (value >= 4) return "var(--rate-4)";
  if (value >= 3) return "var(--rate-3)";
  if (value >= 2) return "var(--rate-2)";
  return "var(--rate-1)";
};

export const ReleaseInfoRating = (props: {
  release_id: number;
  grade: number;
  token: string | null;
  votes: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    total: number;
    user: number | null;
  };
}) => {
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [vote, setVote] = useState(props.votes.user);

  const percent = (value: number) => {
    if (!props.votes.total) return 0;
    return Math.floor((props.votes[value] / props.votes.total) * 100);
  };

  return (
    <>
      <div className="box">
        <div className="rate-head">
          <Icon name="star" size={20} className="accent" fill />
          <b>{props.grade.toFixed(2)}</b>
          <span className="muted small">из 5</span>
          <span className="muted small">
            {props.votes.total}{" "}
            {numberDeclension(props.votes.total, "голос", "голоса", "голосов")}
          </span>
          {props.token && (
            <button
              type="button"
              className="btn"
              style={{ marginLeft: "auto", padding: "5px 10px", fontSize: 12 }}
              onClick={() => setIsRatingModalOpen(true)}
            >
              {vote ? `Ваша оценка: ${vote}` : "Оценить"}
            </button>
          )}
        </div>

        <div className="ratebars">
          {[5, 4, 3, 2, 1].map((value) => (
            <div className="ratebar" key={`rate-${value}`}>
              <span className="ratebar-n">{value}</span>
              <span className="ratebar-track">
                <i
                  className="ratebar-fill"
                  style={{
                    width: `${percent(value)}%`,
                    background: rateColor(value),
                  }}
                />
              </span>
              <span className="ratebar-pct">{percent(value)}%</span>
            </div>
          ))}
        </div>
      </div>

      <ReleaseInfoRatingModal
        isOpen={isRatingModalOpen}
        setIsOpen={setIsRatingModalOpen}
        token={props.token}
        vote={vote}
        release_id={props.release_id}
        setUserVote={setVote}
      />
    </>
  );
};

const ReleaseInfoRatingModal = (props: {
  isOpen: boolean;
  setIsOpen: any;
  setUserVote: any;
  token: string | null;
  vote: number;
  release_id: number;
}) => {
  const [curElement, setCurElement] = useState(props.vote);
  const [vote, setVote] = useState(props.vote);
  const [isSending, setIsSending] = useState(false);

  async function _sendVote(
    action: "delete" | "add" = "add",
    vote: number | null = null
  ) {
    let url = `${ENDPOINTS.release.info}/vote/${action}/${props.release_id}`;
    if (action === "add") {
      url += `/${vote}`;
    }
    url += `?token=${props.token}`;

    fetch(url);
  }

  function _setVote(
    action: "delete" | "add" = "add",
    vote: number | null = null
  ) {
    if (props.token) {
      _sendVote(action, vote);
      setVote(vote);
      props.setUserVote(vote);
      props.setIsOpen(false);
      setIsSending(false);
    }
  }

  if (!props.isOpen) return <></>;

  return (
    <div className="md" onClick={() => props.setIsOpen(false)}>
      <div
        className="mb"
        style={{ width: "min(420px, 100%)" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-head">
          <h3>Оценка</h3>
          <button
            type="button"
            className="mb-close"
            onClick={() => props.setIsOpen(false)}
            aria-label="Закрыть"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        <div
          className="stars"
          onMouseLeave={() => setCurElement(0)}
          role="group"
          aria-label="Оценка от 1 до 5"
        >
          {[1, 2, 3, 4, 5].map((element) => (
            <button
              key={`rating-${element}`}
              type="button"
              className={element <= (curElement || vote) ? "on" : ""}
              onMouseOver={() => setCurElement(element)}
              onFocus={() => setCurElement(element)}
              onClick={() => setVote(element)}
              aria-label={`${element} из 5`}
            >
              <Icon
                name="star"
                size={30}
                fill={element <= (curElement || vote)}
              />
            </button>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            marginTop: 18,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="btn g"
            disabled={isSending}
            onClick={() => {
              setIsSending(true);
              _setVote("delete", null);
            }}
          >
            Убрать оценку
          </button>
          <button
            type="button"
            className="btn p"
            disabled={isSending || vote === null}
            onClick={() => {
              setIsSending(true);
              _sendVote("delete", null);
              setTimeout(() => _setVote("add", vote), 500);
            }}
          >
            Оценить
          </button>
        </div>
      </div>
    </div>
  );
};
