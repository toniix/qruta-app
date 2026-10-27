import { scheduleNonCriticalTask } from './scheduler';

/**
 * Dynamic loaders for citizen route chunks.
 * Invoking a loader starts the network download and registers the module
 * in the browser/bundler cache so subsequent transitions don't suspend.
 */
export const ROUTE_LOADERS = {
  '/rutas': () => import('../pages/citizen/RoutesListPage'),
  '/mapa': () => import('../pages/citizen/HomeMapPage'),
  '/buscar': () => import('../pages/citizen/SearchPage'),
  '/comunidad': () => import('../pages/citizen/CommunityPage'),
  '/lugares': () => import('../pages/citizen/PlacesPage'),
};

const prefetchedRoutes = new Set();

/**
 * Prefetches a route module if not already prefetched or in cache.
 *
 * @param {string} path - Target route path (e.g. '/rutas' or '/mapa/ruta/123').
 * @returns {Promise<any>|undefined} Loader promise or undefined if already prefetched.
 */
export function prefetchRoute(path) {
  if (!path) return;

  const baseKey =
    Object.keys(ROUTE_LOADERS).find(
      (key) => path === key || path.startsWith(key + '/')
    ) || path;

  if (prefetchedRoutes.has(baseKey)) return;

  const loader = ROUTE_LOADERS[baseKey];
  if (typeof loader === 'function') {
    prefetchedRoutes.add(baseKey);
    return loader().catch(() => {
      // Allow retry if download failed (e.g. temporary network offline)
      prefetchedRoutes.delete(baseKey);
    });
  }
}

/**
 * Schedules prefetching of high-priority citizen routes when the main thread is idle.
 * Respects Save-Data mode if enabled by the user or device.
 *
 * @param {string[]} [routes=['/rutas', '/mapa']] - Route paths to prefetch.
 * @param {number} [timeout=2000] - Max deadline for requestIdleCallback.
 * @returns {Function} Cancel function.
 */
export function scheduleIdlePrefetch(routes = ['/rutas', '/mapa'], timeout = 2000) {
  if (
    typeof navigator !== 'undefined' &&
    navigator.connection &&
    navigator.connection.saveData === true
  ) {
    // Respect user's data-saver preference; do not prefetch
    return () => {};
  }

  return scheduleNonCriticalTask(() => {
    routes.forEach((route) => prefetchRoute(route));
  }, timeout);
}

/**
 * Clears the internal prefetch tracking set (primarily for test isolation).
 */
export function _resetPrefetchCache() {
  prefetchedRoutes.clear();
}
