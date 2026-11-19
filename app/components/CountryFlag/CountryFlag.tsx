import { countryFlagSrc } from "#/api/countryFlags";

// Флаг страны рисуется готовым SVG из public/flags: так он виден всегда,
// независимо от того, установлен ли в системе шрифт с эмодзи.
export const CountryFlag = (props: {
  country?: string | null;
  size?: number;
  className?: string;
}) => {
  const src = countryFlagSrc(props.country);
  if (!src) return null;

  // size — ширина флага; пропорция 4:3, как у исходных SVG
  const width = props.size || 18;
  const height = Math.round(width * 0.75);

  return (
    // SVG-флаги лежат локально и крошечные: оптимизатор next/image для них
    // требует dangerouslyAllowSVG и только добавит лишний запрос
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={props.className}
      src={src}
      alt=""
      aria-hidden="true"
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      style={{
        display: "inline-block",
        verticalAlign: "-2px",
        width,
        height,
        objectFit: "cover",
        borderRadius: 2,
        boxShadow: "0 0 0 1px rgba(128,128,128,0.35)",
      }}
    />
  );
};
