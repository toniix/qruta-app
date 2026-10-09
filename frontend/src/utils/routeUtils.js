/**
 * Route Utility functions and palettes
 */

export const ROUTE_PALETTES = [
  { bg: 'bg-red-500',    ring: 'ring-red-200' },
  { bg: 'bg-blue-600',   ring: 'ring-blue-200' },
  { bg: 'bg-green-600',  ring: 'ring-green-200' },
  { bg: 'bg-purple-600', ring: 'ring-purple-200' },
  { bg: 'bg-amber-500',  ring: 'ring-amber-200' },
  { bg: 'bg-pink-500',   ring: 'ring-pink-200' },
];

/** Pick a color pair for a route based on its stored color or index */
export function getRoutePalette(idx) {
  return ROUTE_PALETTES[idx % ROUTE_PALETTES.length];
}
