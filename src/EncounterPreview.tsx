import { useEffect, useId, useMemo, useState } from "react";
import { samplePreviewTrack } from "./preview";
import type { Preview } from "./previewSchema";

function routePath(route: Preview["tracks"][number]["route"]) {
  return route.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");
}

function pointsPath(points: Array<{ x: number; y: number }>, close = false) {
  return `${points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ")}${close ? " Z" : ""}`;
}

export default function EncounterPreview({ preview, active }: { preview: Preview; active: boolean }) {
  const [time, setTime] = useState(0);
  const ids = useId().replaceAll(":", "");
  const prefersReducedMotion = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  useEffect(() => {
    if (!active || prefersReducedMotion) return;
    let frame = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const elapsed = ((now - start) / 1000) % 6;
      setTime((elapsed / 6) * preview.duration);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, prefersReducedMotion, preview.duration]);

  const shownTime = active && !prefersReducedMotion ? time : 0;
  const environment = preview.environment;
  const firstCondition = preview.conditions[0];
  const stage = [...preview.stages].reverse().find((candidate) => candidate.time <= shownTime) ?? preview.stages[0];

  return (
    <div className="encounter-preview" aria-hidden="true" data-environment={environment.kind}>
      <svg viewBox={`0 0 ${preview.width} ${preview.height}`} role="presentation" focusable="false">
        <defs>
          <linearGradient id={`${ids}-water`} x2="0" y2="1"><stop stopColor="#153d45" /><stop offset="1" stopColor="#102e39" /></linearGradient>
          <pattern id={`${ids}-grid`} width="22" height="22" patternUnits="userSpaceOnUse"><path d="M 22 0 L 0 0 0 22" fill="none" stroke="#85c5c2" strokeOpacity=".065" strokeWidth=".5" /></pattern>
          <marker id={`${ids}-channel-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3.5" markerHeight="3.5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#b6d8bc" /></marker>
          <marker id={`${ids}-traffic-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3.5" markerHeight="3.5" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="#a8cad0" /></marker>
        </defs>
        <rect width="220" height="120" rx="5" fill={`url(#${ids}-water)`} />
        <rect width="220" height="120" rx="5" fill={`url(#${ids}-grid)`} />
        {preview.geography.areas.map((area, index) => <path key={`area-${index}`} d={pointsPath(area.points, true)} fill={area.kind === "land" ? "#78836b" : "#a1669c"} fillOpacity={area.kind === "land" ? ".86" : ".58"} stroke={area.kind === "land" ? "#c5c59d" : "#ca8cc0"} strokeOpacity=".62" strokeWidth={area.kind === "land" ? ".9" : ".65"} />)}
        {preview.geography.lines.map((line, index) => <path key={`line-${index}`} d={pointsPath(line.points)} fill="none" stroke={line.kind === "shore" ? "#d3caa1" : "#91b0b1"} strokeOpacity={line.kind === "shore" ? ".72" : ".58"} strokeWidth={line.kind === "shore" ? "1.1" : ".65"} strokeDasharray={line.kind === "lane" ? "2 2" : undefined} />)}
        {preview.geography.arrows.map((arrow, index) => <path key={`arrow-${index}`} d={pointsPath([arrow.from, arrow.to])} fill="none" stroke={arrow.kind === "channel" ? "#b6d8bc" : "#a8cad0"} strokeOpacity=".82" strokeWidth=".9" markerEnd={`url(#${ids}-${arrow.kind === "channel" ? "channel" : "traffic"}-arrow)`} />)}
        {environment.windFrom !== undefined && <g transform={`rotate(${environment.windFrom} 201 18)`} stroke="#d8e6d5" strokeWidth="1.2" fill="none" opacity=".8"><path d="M201 28V9 M197 14L201 9 205 14" /><path d="M195 24H207" /></g>}
        {environment.visibility === "restricted" && <g fill="none" stroke="#d4e4df" strokeWidth="1" opacity=".18"><path d="M8 21H212 M8 25H212 M8 29H212 M8 93H212 M8 97H212 M8 101H212" /><circle cx="110" cy="60" r="20" strokeDasharray="2 3" /></g>}
        {firstCondition && <text x="8" y="10" fill="#d6e3dc" opacity=".76" fontSize="4.2" fontFamily="system-ui, sans-serif">{firstCondition.length > 72 ? `${firstCondition.slice(0, 69)}…` : firstCondition}</text>}
        {stage && <text x="8" y="115" fill="#d6e3dc" opacity=".72" fontSize="4.5" fontFamily="system-ui, sans-serif">{stage.title.length > 44 ? `${stage.title.slice(0, 41)}…` : stage.title}</text>}
        {preview.tracks.map((track) => {
          const point = samplePreviewTrack(track.route, shownTime);
          const size = Math.max(3.7, Math.min(6.3, 3.3 + track.length / 70));
          return <g key={track.id}>
            <path d={routePath(track.route)} fill="none" stroke={track.color} strokeOpacity=".26" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d={routePath(track.route)} fill="none" stroke={track.color} strokeOpacity=".84" strokeWidth=".85" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 2.5" />
            <circle cx={track.route[0].x} cy={track.route[0].y} r="1.1" fill={track.color} opacity=".8" />
            <g transform={`translate(${point.x} ${point.y}) rotate(${point.heading})`}>
              <ellipse cy="1.2" rx={size + 1} ry="2.1" fill="#06171b" opacity=".5" />
              <path d={`M0 ${-size - 1} Q${size * 0.43} ${-size * 0.1} ${size * 0.34} ${size} L0 ${size * 0.62} L${-size * 0.34} ${size} Q${-size * 0.43} ${-size * 0.1} 0 ${-size - 1}Z`} fill={track.color} stroke="#edf5ed" strokeWidth=".7" />
              <path d={`M0 ${-size + 1}V${size * .25}`} stroke="#11353a" strokeWidth=".65" opacity=".8" />
            </g>
          </g>;
        })}
      </svg>
    </div>
  );
}
