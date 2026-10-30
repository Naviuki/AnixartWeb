import Image from "next/image";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/autoplay";
import { Navigation, Pagination, Autoplay } from "swiper/modules";

export const ReleaseInfoScreenshots = (props: { images: string[] }) => {
  return (
    <div className="box" style={{ padding: 8 }}>
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={8}
        slidesPerView={1}
        direction={"horizontal"}
        allowTouchMove={true}
        autoplay={true}
        pagination={true}
        style={{
          width: "100%",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {props.images.map((image: string, index: number) => {
          return (
            <SwiperSlide key={`release-screenshot-${index}`}>
              <Image
                className="object-cover"
                src={image}
                width={400}
                height={225}
                style={{ width: "100%", height: "auto" }}
                alt=""
              />
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
};
