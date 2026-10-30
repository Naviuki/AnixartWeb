// Линейные иконки интерфейса. Стиль: stroke 1.8, скруглённые концы.
// Дополнительные иконки добавлять сюда же в том же стиле.
const ICONS: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5V21H14v-6h-4v6H3z",
  compass: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.5-12.5-2 5.5-5.5 2 2-5.5 5.5-2Z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35",
  bookmark: "M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z",
  heart: "M12 20s-7-4.35-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5C19 15.65 12 20 12 20Z",
  collection: "M4 5h6v14H4zM14 5h6v9h-6z",
  history: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8-3a8 8 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a8 8 0 0 0-2-1.2L15 3H9l-.5 2.6a8 8 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a8 8 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a8 8 0 0 0 2 1.2L9 21h6l.5-2.6a8 8 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.07-.4.1-.8.1-1.2Z",
  play: "M8 5v14l11-7z",
  plus: "M12 5v14M5 12h14",
  filter: "M3 5h18M6 12h12M10 19h4",
  flame:
    "M12 22c4 0 6-2.5 6-6 0-4-3-5-3-9 0 0-2 1.5-2 4 0 1.5-1 2-1 2s-1-1-1-3c-2 1.5-5 3.5-5 6 0 3.5 2 6 6 6Z",
  calendar: "M3 6h18v15H3zM3 10h18M8 3v4M16 3v4",
  star: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  layers: "m12 3 9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5",
  download: "M12 3v12m0 0 4-4m-4 4-4-4M4 19h16",
  share: "M14 9V5l7 7-7 7v-4.1C9 15 5.6 17.2 3 21c0-6 4-10 11-12Z",
  users:
    "M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
  comment: "M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5Z",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  login: "M10 17l-5-5 5-5m-5 5h12M13 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5",
  logout: "M15 17l5-5-5-5m5 5H9M12 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6",
  edit: "M4 20h4L20 8l-4-4L4 16z",
  trash: "M4 7h16M9 7V5h6v2m-8 0 1 13h8l1-13",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-9v4m0-8h.01",
  sparkle: "m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z",
  trend: "m3 17 6-6 4 4 8-8m0 0h-5m5 0v5",
  film: "M3 4h18v16H3zM7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18",
  check: "m5 13 4 4 10-10",
  chevron: "m9 6 6 6-6 6",
  arrowRight: "M5 12h14m-6-7 7 7-7 7",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  bell: "M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Zm4 9a2 2 0 0 0 4 0",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-14v5l3 2",
  x: "M6 6l12 12M18 6 6 18",
  link: "M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  photo: "M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6",
  like: "M7 22V10l5-7 1 1v5h5a2 2 0 0 1 2 2.3l-1.2 8A2 2 0 0 1 16.8 22H7ZM7 22H3V10h4",
  dislike:
    "M17 2v12l-5 7-1-1v-5H6a2 2 0 0 1-2-2.3l1.2-8A2 2 0 0 1 7.2 2H17ZM17 2h4v12h-4",
  userPlus:
    "M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM18 8v6M15 11h6",
  userMinus:
    "M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM15 11h6",
  ban: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM5.6 5.6l12.8 12.8",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  refresh: "M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5",
  sort: "M7 4v16m0 0-3-3m3 3 3-3M13 7h8M13 12h6M13 17h4",
  telegram:
    "M22 3 2 10.5l6.5 2.2L11 20l3.4-4.8L20 18 22 3Zm-13.5 9.7L22 3",
  github:
    "M9 19c-4 1.5-4-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 4.5-1.8 4.5-5a3.9 3.9 0 0 0-1-2.7 3.7 3.7 0 0 0-.1-2.7s-1.2-.3-3.9 1.5a13 13 0 0 0-7 0C4.3 3.2 3.1 3.5 3.1 3.5a3.7 3.7 0 0 0-.1 2.7A3.9 3.9 0 0 0 2 8.9c0 3.2 1.7 4.7 4.5 5-.6.6-.6 1.2-.5 2V21",
  coin: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3-11.5a3 3 0 0 0-2.5-1.2c-1.5 0-2.5.8-2.5 1.7 0 2.5 5 1.2 5 3.6 0 1-1 1.7-2.5 1.7a3 3 0 0 1-2.5-1.2M12 6.5v11",
  pin: "M12 17v5M9 3h6l-1 6 4 4H6l4-4-1-6Z",
};

export const Icon = (props: {
  name: string;
  size?: number;
  className?: string;
  fill?: boolean;
  style?: React.CSSProperties;
}) => {
  const d = ICONS[props.name] || ICONS.info;
  const size = props.size || 20;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={props.fill ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={props.className}
      style={props.style}
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
};
