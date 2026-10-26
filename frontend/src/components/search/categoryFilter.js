/**
 * Shared category rules for route filtering.
 *
 * Route categorization uses the first-class `category` field ('MICRO' | 'COMBI').
 * Reused by the catalog list (RoutesListPage) and the global
 * search page (SearchPage) so both scopes narrow identically.
 */
export const SEARCH_CATEGORIES = [
  { id: 'all', label: 'Todas las rutas' },
  { id: 'MICRO', label: 'Micros' },
  { id: 'COMBI', label: 'Combis' },
];

/** Match route by transport category ('MICRO' | 'COMBI'). */
export function matchesCategory(route, catId) {
  if (!route || catId === 'all') return true;
  return String(route.category || '').toUpperCase() === String(catId).toUpperCase();
}
