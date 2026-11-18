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

  // Звезда по внешнему и внутреннему радиусу: count > 1 — большая и мелкие вокруг
  const starPoints = (cx: number, cy: number, outer: number, inner: number) => {
    const points: string[] = [];
    for (let index = 0; index < 10; index++) {
      const radius = index % 2 === 0 ? outer : inner;
      const angle = (Math.PI / 5) * index - Math.PI / 2;
      points.push(`${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`);
    }
    return points.join(" ");
  };

  // Юнион Джек: диагонали, затем прямой крест. box — область отрисовки
  const unionJack = (key: string, x: number, y: number, bw: number, bh: number) => {
    const thin = Math.max(0.5, bh * 0.11);
    const thick = Math.max(0.8, bh * 0.22);
    const upright = Math.max(0.6, bh * 0.16);
    return (
      <g key={key}>
        <g stroke="#ffffff" strokeWidth={thick} strokeLinecap="butt">
          <line x1={x} y1={y} x2={x + bw} y2={y + bh} />
          <line x1={x + bw} y1={y} x2={x} y2={y + bh} />
        </g>
        <g stroke="#c8102e" strokeWidth={thin} strokeLinecap="butt">
          <line x1={x} y1={y} x2={x + bw} y2={y + bh} />
          <line x1={x + bw} y1={y} x2={x} y2={y + bh} />
        </g>
        <g fill="#ffffff">
          <rect x={x} y={y + bh / 2 - upright} width={bw} height={upright * 2} />
          <rect x={x + bw / 2 - upright * 0.6} y={y} width={upright * 1.2} height={bh} />
        </g>
        <g fill="#c8102e">
          <rect x={x} y={y + bh / 2 - upright * 0.6} width={bw} height={upright * 1.2} />
          <rect x={x + bw / 2 - upright * 0.36} y={y} width={upright * 0.72} height={bh} />
        </g>
      </g>
    );
  };

  spec.parts.forEach((part, index) => {
    const key = `flag-${index}`;
    switch (part.type) {
      case "h": {
        // Горизонтальные полосы; weights задают разную высоту (флаг Испании)
        const weights = part.weights || part.colors.map(() => 1);
        const total = weights.reduce((sum, value) => sum + value, 0) || 1;
        let offset = 0;
        part.colors.forEach((color, i) => {
          const band = (h / total) * weights[i];
          parts.push(
            <rect
              key={`${key}-${i}`}
              x={0}
              y={Math.round(offset)}
              width={w}
              height={Math.ceil(band) + 1}
              fill={color}
            />
          );
          offset += band;
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
      case "diamond":
        parts.push(
          <polygon
            key={key}
            points={`${w / 2},${h * 0.1} ${w * 0.9},${h / 2} ${w / 2},${h * 0.9} ${w * 0.1},${h / 2}`}
            fill={part.color}
          />
        );
        break;
      case "ring":
        parts.push(
          <circle
            key={key}
            cx={w / 2}
            cy={h / 2}
            r={Math.min(w, h) * 0.3}
            fill="none"
            stroke={part.color}
            strokeWidth={Math.max(0.5, h * 0.07)}
          />
        );
        break;
      case "crescent":
        // Полумесяц: круг цвета флага, сдвинутый вправо, вырезает из белого
        parts.push(
          <g key={key}>
            <circle cx={w * 0.44} cy={h / 2} r={Math.min(w, h) * 0.32} fill={part.color} />
            <circle cx={w * 0.53} cy={h / 2} r={Math.min(w, h) * 0.26} fill={spec.bg} />
          </g>
        );
        break;
      case "star": {
        const count = part.count || 1;
        const outer = Math.min(w, h) * (count > 1 ? 0.16 : 0.24);
        // Одна звезда — по центру; несколько — крупная слева и мелкие вокруг
        if (count === 1) {
          parts.push(
            <polygon key={key} points={starPoints(w * 0.5, h * 0.5, outer, outer * 0.42)} fill={part.color} />
          );
          break;
        }
        const bigX = part.place === "fly" ? w * 0.74 : w * 0.24;
        const bigY = part.place === "fly" ? h * 0.5 : h * 0.34;
        parts.push(
          <polygon key={`${key}-main`} points={starPoints(bigX, bigY, outer * 1.6, outer * 0.67)} fill={part.color} />
        );
        for (let i = 1; i < count; i++) {
          const angle = -0.9 + (i - 1) * 0.42;
          parts.push(
            <polygon
              key={`${key}-${i}`}
              points={starPoints(
                bigX + Math.cos(angle) * outer * 3.1,
                bigY + Math.sin(angle) * outer * 2.4,
                outer,
                outer * 0.42
              )}
              fill={part.color}
            />
          );
        }
        break;
      }
      case "leaf":
        parts.push(
          <path
            key={key}
            fill={part.color}
            transform={`translate(${w * 0.28} ${h * 0.14}) scale(${w * 0.44} ${h * 0.72})`}
            d="M0.5 0.02 L0.42 0.24 L0.28 0.15 L0.31 0.34 L0.14 0.27 L0.19 0.44 L0.05 0.43 L0.22 0.57 L0.18 0.67 L0.38 0.65 L0.34 0.98 L0.66 0.98 L0.62 0.65 L0.82 0.67 L0.78 0.57 L0.95 0.43 L0.81 0.44 L0.86 0.27 L0.69 0.34 L0.72 0.15 L0.58 0.24 Z"
          />
        );
        break;
      case "unionJack":
        parts.push(
          part.canton ?
            unionJack(key, 0, 0, w * 0.45, h * 0.55)
          : unionJack(key, 0, 0, w, h)
        );
        break;
      case "taegeuk": {
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) * 0.29;
        parts.push(
          <g key={key} transform={`rotate(-33.69 ${cx} ${cy})`}>
            <circle cx={cx} cy={cy} r={r} fill="#0047a0" />
            <path
              fill="#cd2e3a"
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} A ${r / 2} ${r / 2} 0 0 1 ${cx} ${cy} A ${r / 2} ${r / 2} 0 0 0 ${cx - r} ${cy} Z`}
            />
          </g>
        );
        break;
      }
      case "trigrams": {
        const groups = [
          { x: w * 0.22, y: h * 0.2, angle: -33.69, solid: [true, true, true] },
          { x: w * 0.78, y: h * 0.2, angle: 33.69, solid: [true, false, true] },
          { x: w * 0.22, y: h * 0.8, angle: 33.69, solid: [false, true, false] },
          { x: w * 0.78, y: h * 0.8, angle: -33.69, solid: [false, false, false] },
        ];
        const length = w * 0.16;
        const thickness = Math.max(0.65, h * 0.055);
        const gap = h * 0.035;
        groups.forEach((group, groupIndex) => {
          const bars: React.ReactNode[] = [];
          group.solid.forEach((solid, lineIndex) => {
            const y = (lineIndex - 1) * (thickness + gap) - thickness / 2;
            if (solid) {
              bars.push(
                <rect key={lineIndex} x={-length / 2} y={y} width={length} height={thickness} />
              );
            } else {
              const half = length * 0.42;
              bars.push(
                <g key={lineIndex}>
                  <rect x={-length / 2} y={y} width={half} height={thickness} />
                  <rect x={length / 2 - half} y={y} width={half} height={thickness} />
                </g>
              );
            }
          });
          parts.push(
            <g
              key={`${key}-${groupIndex}`}
              fill="#000000"
              transform={`translate(${group.x} ${group.y}) rotate(${group.angle})`}
            >
              {bars}
            </g>
          );
        });
        break;
      }
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
