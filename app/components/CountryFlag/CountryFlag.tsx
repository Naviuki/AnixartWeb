import { countryFlagSpec } from "#/api/countryFlags";

// Флаг страны рисуется из полос в SVG: так он виден всегда,
// независимо от того, установлен ли в системе шрифт с эмодзи.
export const CountryFlag = (props: {
  country?: string | null;
  size?: number;
  className?: string;
}) => {
  const spec = countryFlagSpec(props.country);
  if (!spec) return null;

  const size = props.size || 18;
  const w = size;
  const h = Math.round(size * 0.7);
  const parts: React.ReactNode[] = [];

  spec.parts.forEach((part, index) => {
    const key = `flag-${index}`;
    switch (part.type) {
      case "h": {
        // Горизонтальные полосы одинаковой высоты
        const band = h / part.colors.length;
        part.colors.forEach((color, i) => {
          parts.push(
            <rect
              key={`${key}-${i}`}
              x={0}
              y={Math.round(i * band)}
              width={w}
              height={Math.ceil(band) + 1}
              fill={color}
            />
          );
        });
        break;
      }
      case "v": {
        const band = w / part.colors.length;
        part.colors.forEach((color, i) => {
          parts.push(
            <rect
              key={`${key}-${i}`}
              x={Math.round(i * band)}
              y={0}
              width={Math.ceil(band) + 1}
              height={h}
              fill={color}
            />
          );
        });
        break;
      }
      case "circle":
        parts.push(
          <circle
            key={key}
            cx={w / 2}
            cy={h / 2}
            r={Math.min(w, h) * 0.3}
            fill={part.color}
          />
        );
        break;
      case "canton":
        parts.push(
          <rect key={key} x={0} y={0} width={w * 0.45} height={h * 0.55} fill={part.color} />
        );
        break;
      case "cross":
        parts.push(
          <g key={key} fill={part.color}>
            <rect x={0} y={h * 0.38} width={w} height={h * 0.24} />
            <rect x={w * 0.3} y={0} width={w * 0.16} height={h} />
          </g>
        );
        break;
      case "triangle":
        parts.push(
          <polygon key={key} points={`0,0 0,${h} ${w * 0.4},${h / 2}`} fill={part.color} />
        );
        break;
    }
  });

  return (
    <svg
      className={props.className}
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
      focusable="false"
      style={{ display: "inline-block", verticalAlign: "-1px", borderRadius: 2 }}
    >
      <rect width={w} height={h} fill={spec.bg} />
      {parts}
      <rect
        width={w}
        height={h}
        fill="none"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth={1}
        rx={2}
      />
    </svg>
  );
};
