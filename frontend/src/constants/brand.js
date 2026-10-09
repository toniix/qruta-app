/**
 * Single source of truth for the brand hex, for code paths that must parse or
 * round-trip a real hex value (Leaflet icon shading, admin color pickers, mock
 * data). For CSS rendering prefer `var(--color-brand-primary)` / the
 * `bg-brand-gradient` utility from `src/index.css`.
 */
export const BRAND_PRIMARY = '#2563eb';
export const BRAND_PRIMARY_DARK = '#1d4ed8';
