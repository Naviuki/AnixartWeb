import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/mousewheel";
import "swiper/css/scrollbar";
import { Navigation, Mousewheel, Scrollbar } from "swiper/modules";
import Link from "next/link";
import { useState } from "react";
import { ProfileFriendModal } from "./Profile.FriendsModal";
import { Icon } from "#/components/Icon/Icon";

export const ProfileActivityFriends = (props: {
  content: any;
  token: string;
  isMyProfile: boolean;
  profile_id: number;
}) => {
  const [isFriendModalOpen, setIsFriendModalOpen] = useState(false);

  return (
    <>
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
            props.content.map((profile) => {
              return (
                <SwiperSlide
                  key={`friend-prev-${profile.id}`}
                  style={{ width: "fit-content" }}
                >
                  <Link href={`/profile/${profile.id}`} className="friend-tile">
                    <span className="friend-ava">
                      {profile.avatar ?
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profile.avatar} alt="" />
                      : (profile.login ? profile.login[0].toUpperCase() : "А")}
                      <i
                        className="friend-dot"
                        style={{
                          background:
                            profile.is_online ?
                              "var(--rate-5)"
                            : "var(--t3)",
                        }}
                      />
                    </span>
                    <span className="friend-name">{profile.login}</span>
                  </Link>
                </SwiperSlide>
              );
            })}
          {(props.content && props.content.length > 0) || props.isMyProfile ?
            <SwiperSlide style={{ width: "fit-content" }}>
              <button
                type="button"
                className="friend-tile more"
                onClick={() => setIsFriendModalOpen(true)}
              >
                <Icon name="users" size={20} />
                <span className="friend-name">
                  Все друзья {props.isMyProfile ? "и заявки" : ""}
                </span>
              </button>
            </SwiperSlide>
          : <p className="muted">У пользователя нет друзей</p>}
        </Swiper>
      </div>
      <ProfileFriendModal
        isOpen={isFriendModalOpen}
        setIsOpen={setIsFriendModalOpen}
        token={props.token}
        isMyProfile={props.isMyProfile}
        profile_id={props.profile_id}
      ></ProfileFriendModal>
    </>
  );
};
