import { Icon } from "#/components/Icon/Icon";

export const ProfilePrivacyBanner = (props: {
  is_privacy: boolean;
  is_me_blocked: boolean;
}) => {
  return (
    <>
      {props.is_privacy && (
        <div className={`banner ${props.is_me_blocked ? "danger" : ""}`}>
          <span className="banner-ic">
            <Icon name={props.is_me_blocked ? "ban" : "lock"} size={18} />
          </span>
          <div style={{ minWidth: 0 }}>
            <div className="banner-s">
              {!props.is_me_blocked
                ? "У пользователя установлены настройки приватности. Некоторая информация для вас может быть недоступна."
                : "Вы заблокированы данным пользователем. Его информация для вас не доступна."}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
