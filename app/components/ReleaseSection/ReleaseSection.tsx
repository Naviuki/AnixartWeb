import { ReleaseLink } from "../ReleaseLink/ReleaseLinkUpdate";

export const ReleaseSection = (props: {
  sectionTitle?: string;
  content: any;
  showLastWatched?: boolean;
}) => {
  // В истории показываем отметку о последнем просмотренном эпизоде
  const showLastWatched =
    props.showLastWatched ??
    (props.sectionTitle ?
      props.sectionTitle.toLowerCase() == "история"
    : false);

  return (
    <section className="sec">
      {props.sectionTitle && (
        <div className="sh">
          <h2>{props.sectionTitle}</h2>
        </div>
      )}
      <div className="grid">
        {props.content.map((release) => {
          return (
            <div key={release.id} className="w-full h-full">
              <ReleaseLink
                {...release}
                lastWatchedHidden={!showLastWatched}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
};
