import { Icon } from "#/components/Icon/Icon";

// Универсальная плашка-чип. Не используется новыми компонентами,
// оставлена для совместимости.
export const Chip = (props: {
  icon_name?: string;
  icon_color?: string;
  name?: string;
  name_2?: string;
  devider?: string;
  bg_color?: string;
  style?: React.CSSProperties;
  className?: string;
}) => {
  const raw = props.icon_name || "";
  const segments = raw.split("--");
  const iconName = (segments.length > 1 ? segments[segments.length - 1] : raw)
    .replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());

  return (
    <div
      className={`chip ${props.className || ""}`}
      style={{
        ...props.style,
        ...(props.bg_color ? { background: props.bg_color } : {}),
      }}
    >
      {props.icon_name && (
        <span style={{ color: props.icon_color || "currentColor" }}>
          <Icon name={iconName} size={14} />
        </span>
      )}
      <span>
        {props.name}
        {props.name && props.devider ? props.devider : " "}
        {props.name_2}
      </span>
    </div>
  );
};
