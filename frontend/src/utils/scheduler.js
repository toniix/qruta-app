/**
 * Schedules a non-critical task using requestIdleCallback if available,
 * falling back to setTimeout so that low-priority work does not block
 * critical rendering or network requests on mobile connections.
 *
 * @param {Function} callback - The task to execute.
 * @param {number} [timeout=1500] - Max deadline for requestIdleCallback.
 * @returns {Function} Cancel function.
 */
export function scheduleNonCriticalTask(callback, timeout = 1500) {
  if (
    typeof window !== "undefined" &&
    typeof window.requestIdleCallback === "function"
  ) {
    const handle = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback(handle);
  }
  const timer = setTimeout(callback, 0);
  return () => clearTimeout(timer);
}
