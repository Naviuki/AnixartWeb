"use client";
import { ProfileActivityCollections } from "./Profile.ActivityCollections";
import { useEffect, useState } from "react";
import { ProfileActivityFriends } from "./Profile.ActivityFriends";
import { ProfileActivityComment } from "./Profile.ActivityComment";
import { Icon } from "#/components/Icon/Icon";

export function ProfileActivity(props: {
  profile_id: number;
  commentCount: number;
  commentPreview: any;
  collectionCount: number;
  collectionPreview: any;
  friendsCount: number;
  friendsPreview: any;
  token: string;
  isMyProfile: boolean;
}) {
  const [tab, setTab] = useState<"collections" | "comments" | "friends">(
    "collections"
  );

  const [collections, setCollections] = useState<Record<number, any>>({});

  function _setCollection(array: any[]) {
    if (array && array.length == 0) {
      return;
    }
    let _coll = array.filter((col) => {
      if (typeof col == "number") {
        return false;
      }
      return true;
    });
    _coll.map((col) => {
      setCollections((prev) => {
        return {
          ...prev,
          [col.id]: col,
        };
      });

      if (
        col.creator.collections_preview &&
        col.creator.collections_preview.length > 0
      ) {
        _setCollection(col.creator.collections_preview || []);
      }
    });
  }

  useEffect(() => {
    _setCollection(props.collectionPreview || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.collectionPreview]);

  const TABS = [
    { id: "collections", name: "Коллекции", count: props.collectionCount },
    { id: "comments", name: "Комментарии", count: props.commentCount },
    { id: "friends", name: "Друзья", count: props.friendsCount },
  ] as const;

  return (
    <div className="box">
      <div className="sh" style={{ marginBottom: 12 }}>
        <h2>
          <Icon name="sparkle" size={18} />
          Активность
        </h2>
      </div>

      <div className="chiprow" style={{ marginBottom: 14 }}>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`chip ${tab === item.id ? "active" : ""}`}
            onClick={() => setTab(item.id)}
          >
            {item.name}
            <span className="badge soft">{item.count}</span>
          </button>
        ))}
      </div>

      {tab == "collections" && (
        <ProfileActivityCollections
          content={Object.values(collections) || []}
          profile_id={props.profile_id}
        />
      )}
      {tab == "comments" && (
        <ProfileActivityComment
          content={props.commentPreview || []}
          profile_id={props.profile_id}
        />
      )}
      {tab == "friends" && (
        <ProfileActivityFriends
          token={props.token}
          content={props.friendsPreview || []}
          isMyProfile={props.isMyProfile}
          profile_id={props.profile_id}
        />
      )}
    </div>
  );
}
