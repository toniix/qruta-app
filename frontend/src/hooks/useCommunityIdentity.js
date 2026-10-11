import { useState, useCallback } from 'react';

const DEVICE_ID_KEY = 'rutasya:device_id';
const ALIAS_KEY = 'rutasya:community_alias';

function generateUuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'dev-' + Math.random().toString(36).substring(2, 12) + '-' + Date.now().toString(36);
}

export function getOrCreateDeviceId() {
  try {
    let existing = localStorage.getItem(DEVICE_ID_KEY);
    if (!existing || existing.trim().length < 6) {
      existing = generateUuid();
      localStorage.setItem(DEVICE_ID_KEY, existing);
    }
    return existing;
  } catch {
    return 'fallback-device-session';
  }
}

function readStoredAlias() {
  try {
    return localStorage.getItem(ALIAS_KEY) || '';
  } catch {
    return '';
  }
}

export function useCommunityIdentity() {
  const [deviceId] = useState(() => getOrCreateDeviceId());
  const [alias, setAliasState] = useState(() => readStoredAlias());

  const setAlias = useCallback((newAlias) => {
    const clean = (newAlias || '').trim().slice(0, 40);
    setAliasState(clean);
    try {
      if (clean) {
        localStorage.setItem(ALIAS_KEY, clean);
      } else {
        localStorage.removeItem(ALIAS_KEY);
      }
    } catch {
      /* ignore storage errors */
    }
  }, []);

  return {
    deviceId,
    alias,
    setAlias,
    hasAlias: Boolean(alias && alias.trim().length >= 2),
  };
}

