"use client";

import { ENDPOINTS } from "#/api/config";
import { useEffect, useState } from "react";

export const ReleaseInfoStreaming = (props: { release_id: number }) => {
  const [data, setData] = useState<any[] | null>(null);

  useEffect(() => {
    // Ошибка сети или пустой ответ не должны ронять страницу релиза:
    // без списка площадок блок просто не показывается
    let cancelled = false;
    const _getData = async () => {
      try {
        const response = await fetch(
          `${ENDPOINTS.release.licensed}/${props.release_id}`
        );
        const json = await response.json();
        if (!cancelled) {
          setData(Array.isArray(json?.content) ? json.content : []);
        }
      } catch {
        if (!cancelled) setData([]);
      }
    };
    _getData();
    return () => {
      cancelled = true;
    };
  }, [props.release_id]);

  if (!data || data.length === 0) return null;

  return (
    <div className="plat-row">
      {data.map((item: any) => {
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
  );
};
