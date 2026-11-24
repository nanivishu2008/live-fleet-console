import { useState, useRef, type MouseEvent } from "react";
import type { TelemetryPoint } from "../../types/history";

type TelemetryMetric = "soc_pct" | "battery_temp_c" | "speed_kmh";

export interface AlertPeriod {
  start: number;
  end: number;
  rule: string;
}

interface TelemetryChartProps {
  points: TelemetryPoint[];
  title: string;
  metric: TelemetryMetric;
  min: number;
  max: number;
  unit: string;
  hoveredTime: number | null;
  onHoverTimeChange: (time: number | null) => void;
  zoomRange: [number, number] | null;
  onZoomChange: (range: [number, number] | null) => void;
  alertPeriods?: AlertPeriod[];
}

const WIDTH = 650;
const HEIGHT = 220;

const PADDING = {
  top: 25,
  right: 25,
  bottom: 35,
  left: 45,
};

export default function TelemetryChart({
  points,
  title,
  metric,
  min,
  max,
  unit,
  hoveredTime,
  onHoverTimeChange,
  zoomRange,
  onZoomChange,
  alertPeriods = [],
}: TelemetryChartProps) {
  const chartWidth = WIDTH - PADDING.left - PADDING.right;
  const chartHeight = HEIGHT - PADDING.top - PADDING.bottom;
  const valueRange = max - min;

  const svgRef = useRef<SVGSVGElement>(null);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragCurrent, setDragCurrent] = useState<number | null>(null);

  // Parse points with timestamps
  const validPoints = points
    .map((p) => ({
      ...p,
      time: new Date(p.ts || p.timestamp || 0).getTime(),
    }))
    .filter((p) => !isNaN(p.time))
    .sort((a, b) => a.time - b.time);

  // Time boundaries
  const totalMinTime = validPoints.length > 0 ? validPoints[0].time : 0;
  const totalMaxTime = validPoints.length > 1 ? validPoints[validPoints.length - 1].time : totalMinTime + 1000;

  const activeMinTime = zoomRange ? zoomRange[0] : totalMinTime;
  const activeMaxTime = zoomRange ? zoomRange[1] : totalMaxTime;
  const activeTimeRange = Math.max(1000, activeMaxTime - activeMinTime);

  // Visible points in active zoom window
  const visiblePoints = validPoints.filter(
    (p) => p.time >= activeMinTime && p.time <= activeMaxTime
  );

  function getX(time: number) {
    const fraction = (time - activeMinTime) / activeTimeRange;
    return PADDING.left + Math.max(0, Math.min(1, fraction)) * chartWidth;
  }

  function getY(value: number) {
    const fraction = (value - min) / valueRange;
    return PADDING.top + (1 - Math.max(0, Math.min(1, fraction))) * chartHeight;
  }

  // Build segments, breaking lines if gap > 2 * expected step
  const segments: string[][] = [];
  let currentSegment: string[] = [];

  const medianStep =
    visiblePoints.length > 2
      ? (activeMaxTime - activeMinTime) / visiblePoints.length
      : 60000;

  for (let i = 0; i < visiblePoints.length; i++) {
    const p = visiblePoints[i];
    const prev = i > 0 ? visiblePoints[i - 1] : null;

    // Detect real time gap
    if (prev && p.time - prev.time > medianStep * 2.8) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
      }
    }

    const x = getX(p.time);
    const y = getY(p[metric]);
    currentSegment.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  // Hover detection
  function handleMouseMove(e: MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseSvgX = ((e.clientX - rect.left) / rect.width) * WIDTH;

    if (mouseSvgX >= PADDING.left && mouseSvgX <= WIDTH - PADDING.right) {
      const timeFraction = (mouseSvgX - PADDING.left) / chartWidth;
      const hoverTime = activeMinTime + timeFraction * activeTimeRange;
      onHoverTimeChange(hoverTime);

      if (dragStart !== null) {
        setDragCurrent(mouseSvgX);
      }
    } else {
      if (dragStart === null) onHoverTimeChange(null);
    }
  }

  function handleMouseLeave() {
    if (dragStart === null) {
      onHoverTimeChange(null);
    }
  }

  // Brush to zoom handlers
  function handleMouseDown(e: MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseSvgX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    if (mouseSvgX >= PADDING.left && mouseSvgX <= WIDTH - PADDING.right) {
      setDragStart(mouseSvgX);
      setDragCurrent(mouseSvgX);
    }
  }

  function handleMouseUp() {
    if (dragStart !== null && dragCurrent !== null) {
      const startX = Math.min(dragStart, dragCurrent);
      const endX = Math.max(dragStart, dragCurrent);

      if (endX - startX > 15) {
        const time1 = activeMinTime + ((startX - PADDING.left) / chartWidth) * activeTimeRange;
        const time2 = activeMinTime + ((endX - PADDING.left) / chartWidth) * activeTimeRange;
        onZoomChange([Math.round(time1), Math.round(time2)]);
      }
    }
    setDragStart(null);
    setDragCurrent(null);
  }

  // Nearest point to crosshair
  let activePoint: (typeof visiblePoints)[0] | null = null;
  if (hoveredTime !== null && visiblePoints.length > 0) {
    let bestDist = Infinity;
    for (const p of visiblePoints) {
      const dist = Math.abs(p.time - hoveredTime);
      if (dist < bestDist) {
        bestDist = dist;
        activePoint = p;
      }
    }
  }

  // Brush selection coordinates
  const brushBox =
    dragStart !== null && dragCurrent !== null && Math.abs(dragCurrent - dragStart) > 4
      ? {
          x: Math.min(dragStart, dragCurrent),
          width: Math.abs(dragCurrent - dragStart),
        }
      : null;

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-950/80 p-3.5 shadow-lg select-none">
      <div className="mb-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm">{title}</span>
          <span className="font-medium italic text-orange-400">({unit})</span>
        </div>

        {activePoint && (
          <div className="rounded bg-stone-900 border border-stone-800 px-2 py-0.5 text-xs text-stone-200">
            <span className="text-orange-400 font-bold">{activePoint[metric].toFixed(1)} {unit}</span>
            <span className="text-stone-500 ml-1.5 italic text-[11px]">
              {new Date(activePoint.time).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      <div className="w-full relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full h-auto cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          role="img"
          aria-label={`${title} telemetry graph with brush zoom and crosshair`}
        >
          {/* Shaded Alert Periods */}
          {alertPeriods.map((period, i) => {
            const startX = Math.max(PADDING.left, getX(period.start));
            const endX = Math.min(WIDTH - PADDING.right, getX(period.end));
            if (endX <= startX) return null;
            return (
              <g key={i}>
                <rect
                  x={startX}
                  y={PADDING.top}
                  width={endX - startX}
                  height={chartHeight}
                  fill="rgba(239, 68, 68, 0.15)"
                />
                <text
                  x={startX + 4}
                  y={PADDING.top + 12}
                  fill="#f87171"
                  fontSize="9"
                  fontStyle="italic"
                  fontWeight="bold"
                >
                  Alert: {period.rule}
                </text>
              </g>
            );
          })}

          {/* Grid lines and Y labels */}
          {Array.from({ length: 5 }, (_, index) => {
            const val = max - (valueRange * index) / 4;
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
                  x={PADDING.left - 6}
                  y={y + 3.5}
                  textAnchor="end"
                  fill="#78716c"
                  fontSize="10"
                  fontStyle="italic"
                >
                  {val.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* X and Y Axis lines */}
          <line
            x1={PADDING.left}
            y1={HEIGHT - PADDING.bottom}
            x2={WIDTH - PADDING.right}
            y2={HEIGHT - PADDING.bottom}
            stroke="#57534e"
          />
          <line
            x1={PADDING.left}
            y1={PADDING.top}
            x2={PADDING.left}
            y2={HEIGHT - PADDING.bottom}
            stroke="#57534e"
          />

          {/* Telemetry line segments */}
          {segments.map((segment, index) => (
            <polyline
              key={index}
              points={segment.join(" ")}
              fill="none"
              stroke="#f97316"
              strokeWidth="2.2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {/* Data point circles */}
          {visiblePoints.map((point, index) => (
            <circle
              key={`${point.time}-${index}`}
              cx={getX(point.time)}
              cy={getY(point[metric])}
              r="2.5"
              fill="#fb923c"
              stroke="#7c2d12"
              strokeWidth="0.8"
            />
          ))}

          {/* X Axis Time Labels */}
          {visiblePoints.length > 0 && (
            <>
              <text
                x={PADDING.left}
                y={HEIGHT - 12}
                fill="#a8a29e"
                fontSize="10"
                fontStyle="italic"
              >
                {new Date(activeMinTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </text>
              <text
                x={WIDTH - PADDING.right}
                y={HEIGHT - 12}
                textAnchor="end"
                fill="#a8a29e"
                fontSize="10"
                fontStyle="italic"
              >
                {new Date(activeMaxTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </text>
            </>
          )}

          {/* Synced Crosshair line */}
          {hoveredTime !== null && hoveredTime >= activeMinTime && hoveredTime <= activeMaxTime && (
            <g>
              <line
                x1={getX(hoveredTime)}
                y1={PADDING.top}
                x2={getX(hoveredTime)}
                y2={HEIGHT - PADDING.bottom}
                stroke="#fb923c"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              {activePoint && (
                <circle
                  cx={getX(activePoint.time)}
                  cy={getY(activePoint[metric])}
                  r="5"
                  fill="#f97316"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              )}
            </g>
          )}

          {/* Brush Zoom Drag Box */}
          {brushBox && (
            <rect
              x={brushBox.x}
              y={PADDING.top}
              width={brushBox.width}
              height={chartHeight}
              fill="rgba(249, 115, 22, 0.25)"
              stroke="#f97316"
              strokeWidth="1"
            />
          )}
        </svg>

        {/* Non-overflowing safe HTML Tooltip overlay */}
        {activePoint && hoveredTime !== null && (
          <div
            style={{
              left: `${Math.min(
                WIDTH - 130,
                Math.max(PADDING.left + 5, getX(activePoint.time) - 50)
              ) / (WIDTH / 100)}%`,
              top: `${Math.max(10, getY(activePoint[metric]) - 38)}px`,
            }}
            className="pointer-events-none absolute z-20 rounded bg-stone-900/95 border border-orange-500/50 px-2 py-1 text-[11px] font-semibold text-white shadow-xl backdrop-blur-sm"
          >
            <div>
              {activePoint[metric].toFixed(1)} {unit}
            </div>
            <div className="text-[9px] font-normal italic text-stone-400">
              {new Date(activePoint.time).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
