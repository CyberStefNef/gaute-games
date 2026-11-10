// Golf-course pieces: the route map and the scorecard marks. Inline SVG and
// Tailwind only, in the app's colours, so light and dark mode both work.

/** A winding fairway through the stops: done, current (with the ball) and upcoming. */
export function CourseMap({
  total,
  at,
  revealed,
  stops,
}: {
  total: number;
  at: number;
  revealed: boolean;
  stops: string[];
}) {
  const width = 320;
  const height = 110;
  const step = total > 1 ? (width - 56) / (total - 1) : 0;
  const points = Array.from({ length: total }, (_, index) => ({
    x: 28 + index * step,
    y: index % 2 === 0 ? 72 : 42,
  }));
  const path = points
    .map((point, index) => {
      if (index === 0) return `M${point.x} ${point.y}`;
      const prev = points[index - 1];
      const mid = (prev.x + point.x) / 2;
      return `C${mid} ${prev.y} ${mid} ${point.y} ${point.x} ${point.y}`;
    })
    .join(' ');
  return (
    <svg
      role="img"
      aria-label={stops[at] ?? ''}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full max-w-sm"
    >
      <path d={path} fill="none" className="stroke-muted" strokeWidth="18" strokeLinecap="round" />
      <path
        d={path}
        fill="none"
        className="stroke-primary/40"
        strokeWidth="3"
        strokeDasharray="2 7"
        strokeLinecap="round"
      />
      {points.map((point, index) => {
        const done = index < at || (index === at && revealed);
        const current = index === at;
        return (
          <g key={index}>
            <ellipse cx={point.x} cy={point.y + 2} rx="7" ry="2.5" className="fill-border" />
            <path
              d={`M${point.x} ${point.y + 2}V${point.y - 20}`}
              className="stroke-foreground"
              strokeWidth="2"
            />
            <path
              d={`M${point.x} ${point.y - 20}l${current ? 14 : 11} 5l-${current ? 14 : 11} 5z`}
              className={
                done ? 'fill-primary' : current ? 'fill-destructive' : 'fill-muted-foreground/50'
              }
            />
          </g>
        );
      })}
      {points[at] ? (
        <circle
          cx={points[at].x - 12}
          cy={points[at].y + 4}
          r="4"
          className="fill-card stroke-foreground"
          strokeWidth="1.5"
        />
      ) : null}
    </svg>
  );
}

/** One strokes cell on the scorecard, marked like a paper card. */
export function Mark({ strokes, par }: { strokes: number | null | undefined; par: number }) {
  if (strokes === undefined) return <span className="text-muted-foreground">·</span>;
  if (strokes === null) return <span className="text-muted-foreground">–</span>;
  const diff = strokes - par;
  const shape =
    diff <= -2
      ? 'rounded-full border-4 border-double border-primary'
      : diff === -1
        ? 'rounded-full border-2 border-primary'
        : diff === 1
          ? 'border-2 border-muted-foreground'
          : diff >= 2
            ? 'border-4 border-double border-destructive'
            : '';
  return (
    <span className={`inline-flex size-7 items-center justify-center font-semibold ${shape}`}>
      {strokes}
    </span>
  );
}

/** Score against par: E, +2, −1. */
export const formatToPar = (value: number) =>
  value === 0 ? 'E' : value > 0 ? `+${value}` : `−${Math.abs(value)}`;
