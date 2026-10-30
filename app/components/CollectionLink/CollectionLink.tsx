import Link from "next/link";
import Image from "next/image";
import { Icon } from "#/components/Icon/Icon";

export const CollectionLink = (props: any) => {
  return (
    <Link href={`/collection/${props.id}`} className="coll">
      <div className="coll-cover">
        <Image
          src={props.image}
          fill
          alt={props.title || ""}
          sizes="(max-width: 760px) 90vw, 320px"
          className="object-cover"
        />
        <div className="coll-grad" />
        <div className="coll-badges">
          <span className="badge soft">
            <Icon name="heart" size={12} />
            {props.favorites_count}
          </span>
          {props.comment_count ? (
            <span className="badge soft">
              <Icon name="comment" size={12} />
              {props.comment_count}
            </span>
          ) : null}
          {props.is_private && (
            <span className="badge" title="Приватная коллекция">
              <Icon name="eye" size={12} />
            </span>
          )}
          {props.is_favorite && (
            <span
              className="badge"
              style={{
                background: "var(--st-favorite)",
                borderColor: "transparent",
                color: "#fff",
              }}
              title="В избранном"
            >
              <Icon name="heart" size={12} />
            </span>
          )}
        </div>
      </div>
      <div className="coll-body">
        <div className="coll-title">{props.title}</div>
        {props.description && <div className="coll-meta">{props.description}</div>}
      </div>
    </Link>
  );
};
