import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/mousewheel";
import "swiper/css/scrollbar";
import { Navigation, Mousewheel, Scrollbar } from "swiper/modules";
import { CollectionLink } from "../CollectionLink/CollectionLink";
import Link from "next/link";
import { Icon } from "#/components/Icon/Icon";

export const ProfileActivityCollections = (props: {
  content: any;
  profile_id: number;
}) => {
  return (
    <div style={{ maxWidth: "100%" }}>
      <Swiper
        modules={[Navigation, Mousewheel, Scrollbar]}
        spaceBetween={8}
        slidesPerView={"auto"}
        direction={"horizontal"}
        mousewheel={{
          enabled: true,
          sensitivity: 4,
        }}
        scrollbar={{
          enabled: true,
          draggable: true,
        }}
        allowTouchMove={true}
        style={
          {
            "--swiper-scrollbar-bottom": "0",
          } as React.CSSProperties
        }
      >
        {props.content &&
          props.content.length > 0 &&
          props.content.map((collection) => {
            return (
              <SwiperSlide
                key={`col-prev-${collection.id}`}
                style={{ width: "fit-content" }}
              >
                <div className="coll-slide">
                  <CollectionLink {...collection} />
                </div>
              </SwiperSlide>
            );
          })}

        {props.content && props.content.length > 0 ?
          <SwiperSlide style={{ width: "fit-content" }}>
            <Link
              href={`/profile/${props.profile_id}/collections`}
              className="more-tile"
            >
              <Icon name="arrowRight" size={26} />
              <span>Все коллекции</span>
            </Link>
          </SwiperSlide>
        : <p className="muted">У пользователя нет коллекций</p>}
      </Swiper>
    </div>
  );
};
