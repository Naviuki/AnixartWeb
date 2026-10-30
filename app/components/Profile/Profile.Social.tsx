import { Icon } from "#/components/Icon/Icon";

interface UserSocialProps {
  icon?: string;
  url?: string;
  nickname: string;
  color: string;
}

// Ссылка на соцсеть профиля.
export const UserSocial = ({ nickname, color }: UserSocialProps) => {
  return (
    <span className="chip">
      <Icon name="link" size={14} className="social-ic" />
      {nickname}
      <i
        aria-hidden="true"
        className="social-dot"
        style={{ background: `#${color}` }}
      />
    </span>
  );
};
