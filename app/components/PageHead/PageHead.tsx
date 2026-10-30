export const PageHead = (props: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div className="phead">
      <div>
        <h1>{props.title}</h1>
        {props.subtitle && <p>{props.subtitle}</p>}
      </div>
      {props.children && <div className="phead-actions">{props.children}</div>}
    </div>
  );
};
