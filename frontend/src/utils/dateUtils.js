/**
 * Date and time helper utilities
 */

/** Returns a time-based greeting string in Spanish */
export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return '¡Buenos días';
  if (hour < 19) return '¡Buenas tardes';
  return '¡Buenas noches';
}
