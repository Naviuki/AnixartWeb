import { useState } from "react";
import Image from "next/image";
import { ReleaseInfoStreaming } from "./ReleaseInfo.LicensedPlatforms";
import { Icon } from "#/components/Icon/Icon";

// Шапка релиза: фон, постер, название, описание и кнопки действий.
export const ReleaseInfoBasics = (props: {
  release_id: number;
  image: string;
  title: { ru: string; original: string };
  note: string | null;
  description: string;
  children?: React.ReactNode;
}) => {
  const [isFullDescription, setIsFullDescription] = useState(false);
  const canExpand = (props.description || "").length > 260;

  return (
    <section className="rhero">
      <div className="rhero-bg">
        <Image
          src={props.image}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
      </div>
      <div className="rhero-body">
        <div className="rhero-poster">
          <Image
            src={props.image}
            alt={props.title.ru || ""}
            fill
            sizes="(max-width: 760px) 108px, 190px"
            className="object-cover"
          />
        </div>
        <div className="rhero-info">
          <h1 className="rhero-title">{props.title.ru}</h1>
          {props.title.original && (
            <div className="rhero-orig">{props.title.original}</div>
          )}

          {props.note && (
            <div className="rhero-note">
              <p>{props.note}</p>
            </div>
          )}

          {props.description && (
            <>
              <p
                className={`rhero-desc ${isFullDescription ? "" : "clamp"}`}
              >
                {props.description}
              </p>
              {canExpand && (
                <button
                  type="button"
                  className="btn g"
                  style={{ marginTop: 8, padding: "5px 10px", fontSize: 12 }}
                  onClick={() => setIsFullDescription(!isFullDescription)}
                >
                  <Icon name="chevron" size={14} />
                  {isFullDescription ? "Скрыть" : "Показать полностью"}
                </button>
              )}
            </>
          )}

          <div className="rhero-cta">{props.children}</div>

          <div style={{ marginTop: 14 }}>
            <ReleaseInfoStreaming release_id={props.release_id} />
          </div>
        </div>
      </div>
    </section>
  );
};
