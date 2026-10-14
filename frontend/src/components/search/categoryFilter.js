/**
 * Shared category rules for route filtering.
 *
 * There is no backend category field, so detection stays client-side as a
 * substring approximation over route name, transport line name and
 * description. Reused by the catalog list (RoutesListPage) and the global
 * search page (SearchPage) so both scopes narrow identically.
 */
export const SEARCH_CATEGORIES = [
  { id: 'all', label: 'Todas' },
  { id: 'urbano', label: 'Urbano' },
  { id: 'interurbano', label: 'Interurbano' },
  { id: 'nocturno', label: 'Nocturno' },
];

/** Match category as a whole word so "interurbano" never matches "urbano". */
export function matchesCategory(route, catId) {
  if (!route || catId === 'all') return true;
  const pattern = new RegExp(`\\b${catId}\\b`, 'i');
  return (
    pattern.test(route.name || '') ||
    pattern.test(route.transportLineName || '') ||
    pattern.test(route.description || '')
  );
}
