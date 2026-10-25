import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommunityIdentity, getOrCreateDeviceId } from './useCommunityIdentity';

describe('useCommunityIdentity & getOrCreateDeviceId', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('generates a valid deviceId and persists it in localStorage', () => {
    const { result } = renderHook(() => useCommunityIdentity());
    expect(result.current.deviceId).toBeTruthy();
    expect(result.current.deviceId.length).toBeGreaterThan(6);
    expect(localStorage.getItem('rutasya:device_id')).toBe(result.current.deviceId);
  });

  it('reuses existing deviceId from localStorage', () => {
    localStorage.setItem('rutasya:device_id', 'custom-device-12345');
    const { result } = renderHook(() => useCommunityIdentity());
    expect(result.current.deviceId).toBe('custom-device-12345');
  });

  it('uses volatile session device id when localStorage throws', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage disabled / SecurityError');
    });

    const deviceId1 = getOrCreateDeviceId();
    expect(deviceId1).toMatch(/^vol-/);

    // Subsequent call within same session preserves the volatile ID
    const deviceId2 = getOrCreateDeviceId();
    expect(deviceId2).toBe(deviceId1);

    const { result } = renderHook(() => useCommunityIdentity());
    expect(result.current.deviceId).toBe(deviceId1);

    getItemSpy.mockRestore();
  });

  it('manages alias lifecycle and checks hasAlias correctly', () => {
    const { result } = renderHook(() => useCommunityIdentity());
    expect(result.current.alias).toBe('');
    expect(result.current.hasAlias).toBe(false);

    act(() => {
      result.current.setAlias('  Ana  ');
    });
    expect(result.current.alias).toBe('Ana');
    expect(result.current.hasAlias).toBe(true);
    expect(localStorage.getItem('rutasya:community_alias')).toBe('Ana');

    // Single character alias does not satisfy hasAlias (min 2)
    act(() => {
      result.current.setAlias('A');
    });
    expect(result.current.alias).toBe('A');
    expect(result.current.hasAlias).toBe(false);

    // Truncates alias to 40 characters
    act(() => {
      result.current.setAlias('a'.repeat(50));
    });
    expect(result.current.alias).toBe('a'.repeat(40));

    // Clearing alias removes from storage
    act(() => {
      result.current.setAlias('');
    });
    expect(result.current.alias).toBe('');
    expect(result.current.hasAlias).toBe(false);
    expect(localStorage.getItem('rutasya:community_alias')).toBeNull();
  });
});
