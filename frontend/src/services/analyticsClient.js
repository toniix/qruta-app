import { getOrCreateDeviceId } from '../hooks/useCommunityIdentity';
import { getSelectedCityId } from '../utils/cityCache';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
const EVENTS_URL = `${API_BASE}/analytics/events`;

const FLUSH_DELAY_MS = 5000;
const MAX_BATCH = 50;

let queue = [];
let flushTimer = null;
let deviceHashPromise = null;
let lifecycleBound = false;

async function sha256Hex(text) {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function resolveDeviceHash() {
  if (!deviceHashPromise) {
    deviceHashPromise = sha256Hex(getOrCreateDeviceId());
  }
  return deviceHashPromise;
}

function bindLifecycleFlush() {
  if (lifecycleBound || typeof window === 'undefined') return;
  lifecycleBound = true;
  window.addEventListener('pagehide', flushAnalytics);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushAnalytics();
  });
}

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushAnalytics();
  }, FLUSH_DELAY_MS);
}

/**
 * Sends the queued events anonymously. Prefers `sendBeacon` so the request survives
 * navigation; falls back to `fetch` with `keepalive`. Telemetry must never throw into
 * the UI, so every failure path is swallowed.
 */
export function flushAnalytics() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length === 0) return;

  const events = queue.splice(0, queue.length);
  const body = JSON.stringify({ events });

  try {
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(EVENTS_URL, blob)) return;
    }
  } catch {
    // fall through to fetch
  }

  try {
    fetch(EVENTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* offline or blocked: drop the batch rather than retry forever */
  }
}

/**
 * Records one usage event. The client hashes the local device id so the raw UUID never
 * leaves the device; the server adds a daily salt before persisting, so even this hash
 * cannot be correlated across days.
 *
 * @param {string} category one of EventCategory values (route_view, route_search, ...)
 * @param {{routeId?: string, stopId?: string, transportLineId?: string, campaign?: string}} [properties]
 */
export async function trackEvent(category, properties = {}) {
  bindLifecycleFlush();
  try {
    const deviceId = await resolveDeviceHash();
    if (!deviceId) return;

    queue.push({
      category,
      deviceId,
      routeId: properties.routeId || null,
      stopId: properties.stopId || null,
      transportLineId: properties.transportLineId || null,
      cityId: properties.cityId || getSelectedCityId() || null,
      campaign: properties.campaign || null,
      recordedAt: new Date().toISOString(),
    });

    if (queue.length >= MAX_BATCH) flushAnalytics();
    else scheduleFlush();
  } catch {
    /* telemetry is best-effort */
  }
}
