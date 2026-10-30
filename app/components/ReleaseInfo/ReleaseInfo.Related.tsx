"use client";

import { ReleaseLinkList } from "#/components/ReleaseLink/ReleaseLinkList";
import Link from "next/link";
import { Icon } from "#/components/Icon/Icon";

export const ReleaseInfoRelated = (props: {
  release_id: number;
  related: any;
  related_releases: any;
}) => {
  return (
    <div className="box">
      <div className="sh" style={{ marginBottom: 10 }}>
        <h2>Связанные релизы</h2>
        {props.related && (
          <Link href={`/related/${props.related.id}`}>
            Показать все
            <Icon name="arrowRight" size={16} />
          </Link>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {props.related_releases
          .filter((release: any) => {
            if (release.id == props.release_id) {
              return false;
            }
            return true;
          })
          .map((release: any) => {
            return (
              <ReleaseLinkList
                key={release.id}
                {...release}
                settings={{ showGenres: false, showDescription: false }}
              />
            );
          })}
      </div>
    </div>
  );
};
