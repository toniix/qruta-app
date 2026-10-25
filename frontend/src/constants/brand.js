/**
 * Single source of truth for QRuta brand and transit palette hex values.
 * For CSS rendering prefer CSS variables (e.g. `var(--color-brand-lime)`, `var(--color-brand-navy)`)
 * or `@theme` utility classes.
 */

// Brand & Dark Surfaces
export const BRAND_NAVY = '#111B2E';
export const BRAND_SURFACE_NAVY = '#17243A';
export const BRAND_SURFACE_NAVY_ELEVATED = '#20314D';
export const BRAND_BORDER_NAVY = '#29364A';

// QRuta Lime Accents
export const BRAND_LIME = '#B7F34A';
export const BRAND_LIME_HOVER = '#A6E83A';
export const BRAND_LIME_SOFT = '#EAF9C8';

// Accessible Light Mode Green
export const BRAND_PRIMARY_GREEN = '#537D13';

// Transit Map Routes
export const ROUTE_COLORS = {
  lime: '#B7F34A',
  blue: '#60A5FA',
  violet: '#A78BFA',
  orange: '#FB923C',
};

export const TRANSIT_COLOR_PALETTE = [
  '#B7F34A', // Route Lime
  '#60A5FA', // Route Blue
  '#A78BFA', // Route Violet
  '#FB923C', // Route Orange
  '#35B779', // Success Emerald
  '#F5B942', // Warning Amber
  '#F97066', // Error Coral
  '#111B2E', // Surface Navy
];

// Compatibility aliases
export const BRAND_PRIMARY = '#111B2E';
export const BRAND_PRIMARY_DARK = '#0B1220';
export const DEFAULT_ROUTE_COLOR = '#60A5FA';
