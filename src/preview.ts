import type { Preview } from "./previewSchema";

export type PreviewInput = {
  id?: string;
  duration: number;
  vessels: Array<{
    id: string;
    color: string;
    length: number;
    track: Array<{ time: number; east: number; north: number; heading: number }>;
  }>;
  environment: { kind: string; visibility: "clear" | "restricted"; windFrom?: number };
  conditions?: string[];
  steps?: Array<{ time: number; title: string; body?: string }>;
};

type WorldPoint = { east: number; north: number };
type RawGeography = {
  areas: Array<{ kind: "land" | "divider"; points: WorldPoint[] }>;
  lines: Array<{ kind: "shore" | "lane"; points: WorldPoint[] }>;
  arrows: Array<{ kind: "channel" | "traffic"; from: WorldPoint; to: WorldPoint }>;
  anchors: WorldPoint[];
};

function rect(east0: number, north0: number, east1: number, north1: number): WorldPoint[] {
  return [
    { east: east0, north: north0 }, { east: east1, north: north0 },
    { east: east1, north: north1 }, { east: east0, north: north1 },
  ];
}

function geographyFor(input: PreviewInput): RawGeography {
  const geography: RawGeography = { areas: [], lines: [], arrows: [], anchors: [] };
  const addLine = (kind: "shore" | "lane", points: WorldPoint[]) => geography.lines.push({ kind, points });
  if (input.environment.kind === "channel") {
    if (input.id === "channel-crossing") {
      for (const [e0, e1] of [[-1150, -150], [150, 1150]]) {
        for (const [n0, n1] of [[150, 1200], [-1200, -150]]) geography.areas.push({ kind: "land", points: rect(e0, n0, e1, n1) });
      }
    } else {
      geography.areas.push({ kind: "land", points: rect(-1150, -1200, -150, 1200) });
      geography.areas.push({ kind: "land", points: rect(150, -1200, 1150, 1200) });
    }
    for (const east of [-150, 150]) addLine("shore", [{ east, north: -1200 }, { east, north: 1200 }]);
    for (const direction of [-1, 1]) for (const north of [-300, 100, 500]) {
      geography.arrows.push({ kind: "channel", from: { east: direction * 80, north }, to: { east: direction * 80, north: north + direction * 65 } });
    }
    geography.anchors.push({ east: -150, north: -150 }, { east: 150, north: 150 });
  }
  if (input.environment.kind === "bend") {
    geography.areas.push({ kind: "land", points: rect(-1150, -1200, -150, 1200) });
    geography.areas.push({ kind: "land", points: rect(-150, 150, 1250, 1150) });
    geography.areas.push({ kind: "land", points: rect(150, -1150, 1150, -150) });
    geography.areas.push({ kind: "land", points: rect(150, -410, 410, -150) });
    addLine("shore", [{ east: -150, north: -1200 }, { east: -150, north: 150 }, { east: 1200, north: 150 }]);
    addLine("shore", [{ east: 150, north: -1200 }, { east: 150, north: -150 }, { east: 1200, north: -150 }]);
    geography.anchors.push({ east: -150, north: -150 }, { east: 150, north: 150 });
  }
  if (input.environment.kind === "tss") {
    geography.areas.push({ kind: "divider", points: rect(-1200, 135, 1200, 165) });
    for (const north of [-40, 140, 160, 340]) addLine("lane", [{ east: -1200, north }, { east: 1200, north }]);
    for (const east of [-600, -300, 0, 300, 600]) for (const direction of [-1, 1]) {
      const north = direction === 1 ? 50 : 250;
      geography.arrows.push({ kind: "traffic", from: { east, north }, to: { east: east + direction * 85, north } });
    }
    geography.anchors.push({ east: 0, north: -40 }, { east: 0, north: 340 });
  }
  return geography;
}

export function projectPreview(input: PreviewInput): Preview {
  const points = input.vessels.flatMap((vessel) => vessel.track);
  const rawGeography = geographyFor(input);
  const extents = [...points, ...rawGeography.anchors];
  const minEast = Math.min(...extents.map((p) => p.east));
  const maxEast = Math.max(...extents.map((p) => p.east));
  const minNorth = Math.min(...extents.map((p) => p.north));
  const maxNorth = Math.max(...extents.map((p) => p.north));
  const spanEast = maxEast - minEast || 1;
  const spanNorth = maxNorth - minNorth || 1;
  const scale = Math.min(196 / spanEast, 96 / spanNorth);
  const usedWidth = spanEast * scale;
  const usedHeight = spanNorth * scale;
  const offsetX = (220 - usedWidth) / 2;
  const offsetY = (120 - usedHeight) / 2;
  const project = (p: WorldPoint) => ({ x: offsetX + (p.east - minEast) * scale, y: 120 - offsetY - (p.north - minNorth) * scale });

  return {
    width: 220,
    height: 120,
    duration: input.duration,
    tracks: input.vessels.map((vessel) => ({
      id: vessel.id,
      color: vessel.color,
      length: vessel.length,
      route: vessel.track.map((p) => ({
        time: p.time,
        ...project(p),
        heading: ((p.heading % 360) + 360) % 360,
      })),
    })),
    environment: { ...input.environment },
    geography: {
      areas: rawGeography.areas.map((area) => ({ kind: area.kind, points: area.points.map(project) })),
      lines: rawGeography.lines.map((line) => ({ kind: line.kind, points: line.points.map(project) })),
      arrows: rawGeography.arrows.map((arrow) => ({ kind: arrow.kind, from: project(arrow.from), to: project(arrow.to) })),
    },
    conditions: (input.conditions ?? []).slice(0, 2),
    stages: (input.steps ?? []).map(({ time, title, body }) => ({ time, title, body: body ?? "" })),
  };
}

export function samplePreviewTrack(route: Preview["tracks"][number]["route"], time: number) {
  if (route.length === 1) return { x: route[0].x, y: route[0].y, heading: route[0].heading };
  const t = Math.max(route[0].time, Math.min(time, route.at(-1)!.time));
  let i = route.findIndex((p) => p.time >= t);
  if (i <= 0) i = 1;
  const a = route[i - 1];
  const b = route[i];
  const f = (t - a.time) / (b.time - a.time || 1);
  const delta = ((b.heading - a.heading + 540) % 360) - 180;
  return {
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    heading: (((a.heading + delta * f) % 360) + 360) % 360,
  };
}
