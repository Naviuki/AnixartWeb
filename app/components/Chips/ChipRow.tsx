import { Icon } from "#/components/Icon/Icon";

export const Chip = (props: {
  active?: boolean;
  icon?: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  title?: string;
}) => {
  const className = `chip ${props.active ? "active" : ""} ${
    props.className || ""
  }`;
  if (props.onClick) {
    return (
      <button
        type="button"
        className={className}
        onClick={props.onClick}
        title={props.title}
      >
        {props.icon && <Icon name={props.icon} size={18} />}
        {props.children}
      </button>
    );
  }
  return (
    <span className={className} title={props.title}>
      {props.icon && <Icon name={props.icon} size={18} />}
      {props.children}
    </span>
  );
};

export const ChipRow = (props: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={`chiprow ${props.className || ""}`}>{props.children}</div>
  );
};
