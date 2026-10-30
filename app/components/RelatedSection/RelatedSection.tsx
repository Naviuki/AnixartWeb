import { numberDeclension } from "#/api/utils";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "#/components/Icon/Icon";

export const RelatedSection = (props: any) => {
  const declension = numberDeclension(
    props.release_count,
    "релиз",
    "релиза",
    "релизов"
  );
  return (
    <section className="box related-teaser">
      <div className="related-teaser-posters">
        {props.images.map((item, index) => {
          return (
            <div
              key={`related-img-${index}`}
              className="related-teaser-poster"
            >
              <Image
                fill={true}
                src={item}
                alt=""
                sizes="(max-width: 1024px) 72px, 120px"
                className="object-cover"
              />
            </div>
          );
        })}
      </div>
      <div className="related-teaser-body">
        <h3 className="related-teaser-title">{props.name_ru}</h3>
        <p className="hint" style={{ marginTop: 2 }}>
          {props.release_count} {declension} во франшизе
        </p>
        <Link href={`/related/${props.id}`} className="btn g">
          Перейти
          <Icon name="arrowRight" size={16} />
        </Link>
      </div>
    </section>
  );
};
