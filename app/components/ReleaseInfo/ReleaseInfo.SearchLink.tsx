import Link from "next/link";

// Ссылка на поиск по этому же значению (студия, автор, жанр).
export const ReleaseInfoSearchLink = (props: {
  title: string;
  searchBy: string;
}) => {
  return (
    <Link
      style={{ color: "inherit" }}
      className="accent"
      href={`/search?query=${props.title}&params={"where"%3A"releases"%2C"searchBy"%3A"${props.searchBy}"}`}
    >
      {props.title}
    </Link>
  );
};
