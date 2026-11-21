"use client";

import { useEffect, useRef, useState } from "react";

import { formatDisplayDate } from "@/utils/dates";

// Series color: cyan-600, validated for the dark chart surface (OKLCH L inside
// the dark band, chroma >= 0.1, >= 3:1 contrast) with the dataviz validator.
const LINE_COLOR = "#0891b2";
const SURFACE = "#0c0e15";
const GRID = "rgb(255 255 255 / 0.08)";
const HEIGHT = 220;
const MARGIN = { top: 16, right: 40, bottom: 28, left: 28 };
const TICKS = [0, 1, 2, 3, 4, 5];

const shortDate = (iso) => (iso ? formatDisplayDate(new Date(iso)) : "");

/**
 * Average score per interview over time (one series, so no legend: the card
 * title names it). Hover or focus + arrow keys show each point's details, and
 * the same data is available as a table below the chart.
 */
export default function ScoreTrendChart({ points }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const x = (index) => MARGIN.left + (points.length === 1 ? innerWidth / 2 : (index / (points.length - 1)) * innerWidth);
  const y = (score) => MARGIN.top + innerHeight - (score / 5) * innerHeight;

  const linePath = points.map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point.score)}`).join(" ");
  const areaPath = `${linePath} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const last = points.length - 1;

  const nearestIndex = (clientX, rect) => {
    const pointerX = clientX - rect.left;
    let nearest = 0;
    points.forEach((_, index) => {
      if (Math.abs(x(index) - pointerX) < Math.abs(x(nearest) - pointerX)) nearest = index;
    });
    return nearest;
  };

  const onKeyDown = (event) => {
    if (event.key === "ArrowRight") setActive((index) => Math.min(last, (index ?? -1) + 1));
    else if (event.key === "ArrowLeft") setActive((index) => Math.max(0, (index ?? last + 1) - 1));
    else if (event.key === "Escape") setActive(null);
    else return;
    event.preventDefault();
  };

  const point = active !== null ? points[active] : null;

  return (
    <div>
      <div ref={containerRef} className="relative" style={{ height: HEIGHT }}>
        {width > 0 && (
          <svg width={width} height={HEIGHT} className="overflow-visible" aria-hidden="true">
            {TICKS.map((tick) => (
              <g key={tick}>
                <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke={GRID} strokeWidth="1" />
                <text x={MARGIN.left - 10} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px]">
                  {tick}
                </text>
              </g>
            ))}

            {points.length > 1 && (
              <>
                <path d={areaPath} fill={LINE_COLOR} fillOpacity="0.1" />
                <path d={linePath} fill="none" stroke={LINE_COLOR} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              </>
            )}

            {point && (
              <line x1={x(active)} x2={x(active)} y1={MARGIN.top} y2={y(0)} stroke="rgb(255 255 255 / 0.25)" strokeWidth="1" />
            )}

            {/* End point (and the hovered point) carry a 2px ring in the surface color. */}
            {[last, ...(active !== null && active !== last ? [active] : [])].map((index) => (
              <circle key={index} cx={x(index)} cy={y(points[index].score)} r="4.5" fill={LINE_COLOR} stroke={SURFACE} strokeWidth="2" />
            ))}

            <text x={x(last) + 10} y={y(points[last].score)} dy="0.32em" className="fill-foreground text-xs font-semibold">
              {points[last].score.toFixed(1)}
            </text>

            <text x={x(0)} y={HEIGHT - 6} textAnchor={points.length === 1 ? "middle" : "start"} className="fill-muted-foreground text-[11px]">
              {shortDate(points[0].date)}
            </text>
            {points.length > 1 && (
              <text x={x(last)} y={HEIGHT - 6} textAnchor="end" className="fill-muted-foreground text-[11px]">
                {shortDate(points[last].date)}
              </text>
            )}
          </svg>
        )}

        {/* Hit area for the crosshair: the whole plot, not the 2px line. */}
        <div
          role="img"
          tabIndex={0}
          aria-label={`Average score per interview, ${points.length} ${points.length === 1 ? "interview" : "interviews"}, latest ${points[last].score.toFixed(1)} out of 5. Use the arrow keys to read each point.`}
          className="absolute inset-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onPointerMove={(event) => setActive(nearestIndex(event.clientX, event.currentTarget.getBoundingClientRect()))}
          onPointerLeave={() => setActive(null)}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
        />

        {point && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 w-max max-w-[220px] -translate-x-1/2 -translate-y-full rounded-lg border border-white/10 bg-[#0b1020]/95 px-3 py-2 shadow-xl"
            style={{ left: x(active), top: y(point.score) - 12 }}
          >
            <p className="text-base font-semibold">
              {point.score.toFixed(1)}
              <span className="text-xs font-normal text-muted-foreground"> / 5</span>
            </p>
            <p className="truncate text-xs text-foreground/80">{point.label}</p>
            <p className="text-xs text-muted-foreground">{shortDate(point.date)}</p>
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">View as a table</summary>
        <table className="mt-3 w-full text-left">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="py-1.5 font-medium">Date</th>
              <th className="py-1.5 font-medium">Interview</th>
              <th className="py-1.5 text-right font-medium">Score</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {points.map((row) => (
              <tr key={row.id} className="border-t border-white/5">
                <td className="py-1.5 text-muted-foreground">{shortDate(row.date)}</td>
                <td className="py-1.5">{row.label}</td>
                <td className="py-1.5 text-right">{row.score.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
