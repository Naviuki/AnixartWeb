const LIST_ROWS = [
  { key: "watching", name: "Смотрю", color: "var(--st-watching)" },
  { key: "planned", name: "В планах", color: "var(--st-planned)" },
  { key: "completed", name: "Просмотрено", color: "var(--st-watched)" },
  { key: "delayed", name: "Отложено", color: "var(--st-delayed)" },
  { key: "abandoned", name: "Брошено", color: "var(--st-dropped)" },
] as const;

export const InfoLists = (props: {
  completed: number;
  planned: number;
  abandoned: number;
  delayed: number;
  watching: number;
  total?: number;
}) => {
  const total =
    props.total ||
    props.watching +
      props.planned +
      props.completed +
      props.delayed +
      props.abandoned;

  const max = Math.max(
    props.watching,
    props.planned,
    props.completed,
    props.delayed,
    props.abandoned,
    1
  );

  return (
    <div className="box">
      <h3 style={{ marginBottom: 14 }}>Смотрят сейчас</h3>
      <div className="ratebars">
        {LIST_ROWS.map((row) => {
          const value = props[row.key];
          return (
            <div className="ratebar" key={`list-${row.key}`}>
              <span className="ratebar-n wide">{row.name}</span>
              <span className="ratebar-track">
                <i
                  className="ratebar-fill"
                  style={{
                    width: `${total ? (value / max) * 100 : 0}%`,
                    background: row.color,
                  }}
                />
              </span>
              <span className="ratebar-pct">{value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
