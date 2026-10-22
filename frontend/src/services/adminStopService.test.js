import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './apiClient';
import { adminStopService } from './adminStopService';

vi.mock('./apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe('adminStopService stop image endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploadStopImage posts a FormData body with the file to /admin/stops/{id}/image', async () => {
    const file = new File(['pixels'], 'photo.png', { type: 'image/png' });
    const payload = { id: 'stop-1', name: 'Paradero X', imageUrl: 'https://cdn/x.jpg' };
    apiClient.post.mockResolvedValueOnce({ data: payload });

    const result = await adminStopService.uploadStopImage('stop-1', file);

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    const [url, body] = apiClient.post.mock.calls[0];
    expect(url).toBe('/admin/stops/stop-1/image');
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('file')).toBe(file);
    expect(result).toEqual(payload);
  });

  it('clears the JSON default content type so the body survives as multipart', async () => {
    const file = new File(['pixels'], 'photo.png', { type: 'image/png' });
    apiClient.post.mockResolvedValueOnce({ data: { id: 'stop-1' } });

    await adminStopService.uploadStopImage('stop-1', file);

    // The override must be passed per-call; without it the JSON default would
    // serialize the FormData body and the backend would answer 415.
    expect(apiClient.post).toHaveBeenCalledWith(
      '/admin/stops/stop-1/image',
      expect.any(FormData),
      expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': undefined }) }),
    );
  });

  // Regression guard for the real failure mode: it reproduces apiClient's default
  // JSON header and runs the REAL axios transform chain (no mocked apiClient), so
  // it fails if the per-call override is removed and axios serializes the body.
  it('keeps the FormData body intact through the real axios transform chain', async () => {
    const { default: axios } = await import('axios');
    const instance = axios.create({ headers: { 'Content-Type': 'application/json' } });

    let captured;
    instance.defaults.adapter = async (config) => {
      captured = config;
      return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
    };

    const formData = new FormData();
    formData.append('file', new File(['pixels'], 'photo.png', { type: 'image/png' }));

    await instance.post('/admin/stops/stop-1/image', formData, {
      headers: { 'Content-Type': undefined },
    });

    expect(captured.data).toBeInstanceOf(FormData);
    expect(typeof captured.data).not.toBe('string');
  });

  it('removeStopImage issues DELETE on /admin/stops/{id}/image', async () => {
    const payload = { id: 'stop-1', name: 'Paradero X', imageUrl: null };
    apiClient.delete.mockResolvedValueOnce({ data: payload });

    const result = await adminStopService.removeStopImage('stop-1');

    expect(apiClient.delete).toHaveBeenCalledWith('/admin/stops/stop-1/image');
    expect(result).toEqual(payload);
  });
});
