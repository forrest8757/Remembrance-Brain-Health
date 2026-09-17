/** Shared sRGB palette for the mesh, still renders, and named domain controls. */
export const BRAIN_PALETTE = [
  { color: '#B8AEDF', name: 'Lavender' },
  { color: '#9FC8E8', name: 'Powder blue' },
  { color: '#9FAFE0', name: 'Periwinkle' },
  { color: '#D4B7D9', name: 'Dusty lilac' },
  { color: '#A8D9E0', name: 'Pale aqua' },
] as const;

const COLORS = BRAIN_PALETTE.map(({ color }) => [
  parseInt(color.slice(1, 3), 16) / 255,
  parseInt(color.slice(3, 5), 16) / 255,
  parseInt(color.slice(5, 7), 16) / 255,
]);

// Broad, bilateral educational zones around the explorer's surface viewpoints.
// These are intentionally not presented as a segmented anatomical atlas.
const ZONES = [
  { center: [0.48, 0.45, -0.18], radius: [0.6, 0.55, 0.7] },
  { center: [0.25, 0.36, 0.7], radius: [0.6, 0.55, 0.52] },
  { center: [0.51, -0.13, 0.08], radius: [0.55, 0.28, 0.65] },
  { center: [0.5, 0.08, 0.35], radius: [0.45, 0.24, 0.36] },
  { center: [0.24, -0.48, -0.59], radius: [0.55, 0.38, 0.55] },
];

/** sRGB color at a point in the centered, max-dimension-2 uploaded mesh. */
export function brainZoneColor(x: number, y: number, z: number): number[] {
  const point = [Math.abs(x), y, z];
  let first = 0;
  let second = 1;
  const distances = ZONES.map(({ center, radius }) =>
    point.reduce((sum, value, axis) => sum + ((value - center[axis]) / radius[axis]) ** 2, 0),
  );
  if (distances[second] < distances[first]) [first, second] = [second, first];
  for (let i = 2; i < distances.length; i++) {
    if (distances[i] < distances[first]) {
      second = first;
      first = i;
    } else if (distances[i] < distances[second]) {
      second = i;
    }
  }
  // Mostly solid zones, with a narrow soft edge rather than a rainbow gradient.
  const blend = Math.max(0, 1 - (distances[second] - distances[first]) / 0.16) * 0.5;
  return COLORS[first].map((value, channel) =>
    value * (1 - blend) + COLORS[second][channel] * blend,
  );
}