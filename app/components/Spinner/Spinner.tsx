export const Spinner = (props: { size?: "base" | "md" | "lg" }) => {
  let size = 32;
  if (props.size == "md") {
    size = 48;
  }
  if (props.size == "lg") {
    size = 64;
  }
  return (
    <div
      role="status"
      aria-label="Загрузка"
      className="spinner"
      style={{ width: size, height: size }}
    />
  );
};
