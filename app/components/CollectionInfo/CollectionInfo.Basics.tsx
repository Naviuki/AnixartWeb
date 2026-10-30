import { unixToDate } from "#/api/utils";
import Link from "next/link";
import Image from "next/image";

export const CollectionInfoBasics = (props: {
  image: string;
  title: string;
  description: string;
  authorAvatar: string;
  authorLogin: string;
  authorId: number;
  creationDate: number;
  updateDate: number;
}) => {
  return (
    <section className="box collview-main">
      <div className="collview-cover">
        <Image
          src={props.image}
          fill
          sizes="(max-width: 1023px) 100vw, 720px"
          className="object-cover"
          alt=""
        />
      </div>

      <h1 className="collview-title">{props.title}</h1>
      {props.description && (
        <p className="collview-desc">{props.description}</p>
      )}

      <div className="collview-meta">
        <Link href={`/profile/${props.authorId}`} className="collview-author">
          <span className="mini-ava">
            {props.authorAvatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={props.authorAvatar} alt="" />
            )}
          </span>
          <span style={{ minWidth: 0 }}>
            <span className="collview-author-name">{props.authorLogin}</span>
            <span className="collview-author-role">Автор</span>
          </span>
        </Link>
        <div className="collview-dates">
          <span>создана: {unixToDate(props.creationDate, "full")}</span>
          <span>обновлена: {unixToDate(props.updateDate, "full")}</span>
        </div>
      </div>
    </section>
  );
};
