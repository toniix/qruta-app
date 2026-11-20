import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminQrCodeService, operatorQrCodeService } from './qrCodeService';
import { apiClient, operatorClient } from './apiClient';

vi.mock('./apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
  operatorClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('qrCodeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('adminQrCodeService', () => {
    it('calls GET /admin/qr-codes for getAll', async () => {
      const mockData = [{ id: '1', code: 'abc' }];
      apiClient.get.mockResolvedValueOnce({ data: mockData });

      const result = await adminQrCodeService.getAll();
      expect(apiClient.get).toHaveBeenCalledWith('/admin/qr-codes');
      expect(result).toEqual(mockData);
    });

    it('calls POST /admin/qr-codes for create', async () => {
      const payload = { label: 'Nuevo QR', targetType: 'HOME' };
      apiClient.post.mockResolvedValueOnce({ data: { id: '2', ...payload } });

      const result = await adminQrCodeService.create(payload);
      expect(apiClient.post).toHaveBeenCalledWith('/admin/qr-codes', payload);
      expect(result.id).toBe('2');
    });

    it('calls PATCH /admin/qr-codes/:id for update', async () => {
      apiClient.patch.mockResolvedValueOnce({ data: { id: '1', status: 'PAUSED' } });

      const result = await adminQrCodeService.update('1', { status: 'PAUSED' });
      expect(apiClient.patch).toHaveBeenCalledWith('/admin/qr-codes/1', { status: 'PAUSED' });
      expect(result.status).toBe('PAUSED');
    });
  });

  describe('operatorQrCodeService', () => {
    it('calls GET /operator/qr-codes for getAll', async () => {
      const mockData = [{ id: 'op-1', code: 'xyz' }];
      operatorClient.get.mockResolvedValueOnce({ data: mockData });

      const result = await operatorQrCodeService.getAll();
      expect(operatorClient.get).toHaveBeenCalledWith('/operator/qr-codes');
      expect(result).toEqual(mockData);
    });

    it('calls POST /operator/qr-codes for create', async () => {
      const payload = { label: 'QR Operador', targetType: 'ROUTE', targetId: 'r-1' };
      operatorClient.post.mockResolvedValueOnce({ data: { id: 'op-2', ...payload } });

      const result = await operatorQrCodeService.create(payload);
      expect(operatorClient.post).toHaveBeenCalledWith('/operator/qr-codes', payload);
      expect(result.id).toBe('op-2');
    });
  });
});
