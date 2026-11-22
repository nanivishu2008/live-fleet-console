import type { TelemetryPoint } from "../../types/history";

type TelemetryMetric =
  | "soc_pct"
  | "battery_temp_c"
  | "speed_kmh";

interface TelemetryChartProps {
  points: TelemetryPoint[];
  title: string;
  metric: TelemetryMetric;
  min: number;
  max: number;
  unit: string;
}

const WIDTH = 700;
const HEIGHT = 280;

const PADDING = {
  top: 20,
  right: 30,
  bottom: 45,
  left: 55,
};

function TelemetryChart({
  points,
  title,
  metric,
  min,
  max,
  unit,
}: TelemetryChartProps) {
  const chartWidth = WIDTH - PADDING.left - PADDING.right;
  const chartHeight = HEIGHT - PADDING.top - PADDING.bottom;

  const valueRange = max - min;

  // Convert telemetry values into SVG coordinates.
  function getX(index: number) {
    if (points.length <= 1) {
      return PADDING.left;
    }

    return (
      PADDING.left +
      (index / (points.length - 1)) * chartWidth
    );
  }

  function getY(value: number) {
    return (
      PADDING.top +
      ((max - value) / valueRange) * chartHeight
    );
  }

  // Separate the line wherever telemetry has a missing-data gap.
  const segments: string[][] = [];

  let currentSegment: string[] = [];

  points.forEach((point, index) => {
    const value = point[metric];

    if (
      point.gap ||
      !Number.isFinite(value) ||
      value < min ||
      value > max
    ) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
      }

      return;
    }

    const x = getX(index);
    const y = getY(value);

    currentSegment.push(`${x},${y}`);
  });

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  // Display a message when no history is available.
  if (points.length === 0) {
    return (
      <section className="rounded-xl border border-stone-800 bg-stone-950/80 p-5 shadow-lg">
        <h3 className="text-lg font-bold text-white">
          {title}
        </h3>

        <p className="mt-6 text-sm italic text-stone-400">
          No telemetry data available.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-stone-800 bg-stone-950/80 p-5 shadow-lg">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">
          {title}
        </h3>
        <span className="text-xs font-medium italic text-orange-400/90">
          {unit}
        </span>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full min-w-[500px]"
          role="img"
          aria-label={`${title} historical chart`}
        >
          {/* Horizontal grid lines and Y-axis labels */}
          {Array.from({ length: 5 }, (_, index) => {
            const value = max - (valueRange * index) / 4;
            const y = PADDING.top + (chartHeight * index) / 4;

            return (
              <g key={index}>
                <line
                  x1={PADDING.left}
                  y1={y}
                  x2={WIDTH - PADDING.right}
                  y2={y}
                  stroke="#292524"
                  strokeDasharray="4 4"
                />

                <text
                  x={PADDING.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="#78716c"
                  fontSize="11"
                  fontStyle="italic"
                >
                  {value.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* X-axis */}
          <line
            x1={PADDING.left}
            y1={HEIGHT - PADDING.bottom}
            x2={WIDTH - PADDING.right}
            y2={HEIGHT - PADDING.bottom}
            stroke="#57534e"
          />

          {/* Y-axis */}
          <line
            x1={PADDING.left}
            y1={PADDING.top}
            x2={PADDING.left}
            y2={HEIGHT - PADDING.bottom}
            stroke="#57534e"
          />

          {/* Telemetry lines */}
          {segments.map((segment, index) => (
            <polyline
              key={index}
              points={segment.join(" ")}
              fill="none"
              stroke="#f97316"
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {/* Data points */}
          {points.map((point, index) => {
            const value = point[metric];

            if (
              point.gap ||
              !Number.isFinite(value) ||
              value < min ||
              value > max
            ) {
              return null;
            }

            return (
              <circle
                key={`${point.timestamp}-${index}`}
                cx={getX(index)}
                cy={getY(value)}
                r="3.5"
                fill="#fb923c"
                stroke="#7c2d12"
                strokeWidth="1"
              />
            );
          })}

          {/* First timestamp */}
          {points.length > 0 && (
            <text
              x={PADDING.left}
              y={HEIGHT - 12}
              fill="#a8a29e"
              fontSize="11"
              fontStyle="italic"
            >
              {new Date(
                points[0].timestamp
              ).toLocaleTimeString()}
            </text>
          )}

          {/* Last timestamp */}
          {points.length > 1 && (
            <text
              x={WIDTH - PADDING.right}
              y={HEIGHT - 12}
              textAnchor="end"
              fill="#a8a29e"
              fontSize="11"
              fontStyle="italic"
            >
              {new Date(
                points[points.length - 1].timestamp
              ).toLocaleTimeString()}
            </text>
          )}

          {/* Unit label */}
          <text
            x={PADDING.left}
            y={12}
            fill="#ea580c"
            fontSize="11"
            fontStyle="italic"
            fontWeight="600"
          >
            {unit}
          </text>
        </svg>
      </div>
    </section>
  );
}

export default TelemetryChart;