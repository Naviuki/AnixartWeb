"use client";

import { ENDPOINTS } from "#/api/config";
import { useEffect, useState } from "react";

export const ReleaseInfoStreaming = (props: { release_id: number }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const _getData = async () => {
      const response = await fetch(
        `${ENDPOINTS.release.licensed}/${props.release_id}`
      );
      setData(await response.json());
    };
    _getData();
  }, [props.release_id]);

  return (
    <>
      {!data ?
        ""
      : !(data.content.length > 0) ?
        ""
      : <div className="plat-row">
          {data.content.map((item: any) => {
            return (
              <a
                href={item.url}
                target="_blank"
                key={`platform_${item.id}`}
                className="chip"
                style={{ paddingRight: 12 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt=""
                  src={item.icon}
                  style={{ width: 18, height: 18, borderRadius: "50%" }}
                />
                {item.name}
              </a>
            );
          })}
        </div>
      }
    </>
  );
};
