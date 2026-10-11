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

/** Formats an ISO timestamp into a concise Spanish relative string (e.g., 'hace 5 min') */
export function formatRelativeTime(dateInput) {
  if (!dateInput) return 'Ahora';
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return 'Reciente';

  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSeconds < 60) return 'Hace un momento';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;

  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
  });
}
