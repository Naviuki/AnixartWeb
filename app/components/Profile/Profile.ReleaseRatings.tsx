import { unixToDate, useSWRfetcher } from "#/api/utils";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ENDPOINTS } from "#/api/config";
import useSWRInfinite from "swr/infinite";
import { Spinner } from "../Spinner/Spinner";
import { Poster } from "../ReleasePoster/Poster";
import { Icon } from "#/components/Icon/Icon";

const Stars = (props: { value: number }) => {
  return (
    <span className="stars-row" aria-label={`Оценка ${props.value} из 5`}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Icon
          key={`star-${index}`}
          name="star"
          size={14}
          fill={props.value >= index}
          className={props.value >= index ? "on" : ""}
        />
      ))}
    </span>
  );
};

export const ProfileReleaseRatings = (props: any) => {
  const [modal, setModal] = useState(false);
  return (
    <div className="box">
      <div className="sh" style={{ marginBottom: 12 }}>
        <h2>
          <Icon name="star" size={18} />
          Оценки
        </h2>
        <button
          type="button"
          className="btn g"
          style={{ padding: "5px 10px", fontSize: 12 }}
          onClick={() => setModal(true)}
        >
          Посмотреть все
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {props.ratings.map((release) => {
          return (
            <Link
              href={`/release/${release.id}`}
              key={`vote-${release.id}`}
              className="row"
              style={{ marginBottom: 0 }}
            >
              <span className="row-poster">
                <Poster image={release.image} />
              </span>
              <span className="row-body">
                <span className="row-title">{release.title_ru}</span>
                <Stars value={release.my_vote} />
                <span className="row-sub">
                  {unixToDate(release.voted_at, "full")}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
      <ProfileReleaseRatingsModal
        profile_id={props.profile_id}
        token={props.token}
        isOpen={modal}
        setIsOpen={setModal}
      />
    </div>
  );
};

const ProfileReleaseRatingsModal = (props: {
  isOpen: boolean;
  setIsOpen: any;
  profile_id: number;
  token: string | null;
}) => {
  const [currentRef, setCurrentRef] = useState<any>(null);
  const modalRef = useCallback((ref) => {
    setCurrentRef(ref);
  }, []);

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.content.length) return null;
    let url = `${ENDPOINTS.user.profile}/vote/release/voted/${props.profile_id}/${pageIndex}?sort=1`;
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

  const [content, setContent] = useState([]);
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
        onClick={(event) => event.stopPropagation()}
        style={{ width: "min(760px, 100%)" }}
      >
        <div className="mb-head">
          <h3>Оценки</h3>
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
          {isLoading && (
            <div className="empty" style={{ marginBottom: 0 }}>
              <Spinner />
            </div>
          )}
          {content && content.length > 0 ?
            content.map((release) => {
              return (
                <Link
                  href={`/release/${release.id}`}
                  key={`vote-modal-${release.id}`}
                  className="row"
                  style={{ marginBottom: 0 }}
                >
                  <span className="row-poster">
                    <Poster image={release.image} />
                  </span>
                  <span className="row-body">
                    <span className="row-title">{release.title_ru}</span>
                    <span className="row-sub">
                      {release.episodes_total ? release.episodes_total : "?"}{" "}
                      эп.
                      {" · "}
                      <Icon name="star" size={12} fill />
                      {release.grade ? release.grade.toFixed(1) : "?"} из 5
                    </span>
                    <Stars value={release.my_vote} />
                    <span className="row-sub">
                      {unixToDate(release.voted_at, "full")}
                    </span>
                  </span>
                </Link>
              );
            })
          : !isLoading && <p className="muted small">Оценок нет</p>}
        </div>
      </div>
    </div>
  );
};
