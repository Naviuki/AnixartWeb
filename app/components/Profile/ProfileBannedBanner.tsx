import { unixToDate } from "#/api/utils";
import { Icon } from "#/components/Icon/Icon";

export const ProfileBannedBanner = (props: {
  is_banned: boolean;
  is_perm_banned: boolean;
  ban_reason: string;
  ban_expires: number;
}) => {
  return (
    <>
      {(props.is_banned || props.is_perm_banned) && (
        <div className="banner danger">
          <span className="banner-ic">
            <Icon name="ban" size={18} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="banner-t">
              {props.is_perm_banned
                ? "Пользователь был заблокирован администрацией навсегда"
                : `Пользователь был заблокирован администрацией до
              ${unixToDate(props.ban_expires, "full")}`}
            </div>
            <div className="banner-s">{props.ban_reason}</div>
          </div>
        </div>
      )}
    </>
  );
};
