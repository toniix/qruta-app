import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './apiClient';
import { adminOperatorService } from './adminOperatorService';

vi.mock('./apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
  },
}));

describe('adminOperatorService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls the admin operator collection endpoints', async () => {
    apiClient.get.mockResolvedValueOnce({ data: [{ id: 'operator-1' }] });
    apiClient.post.mockResolvedValueOnce({ data: { id: 'operator-2' } });

    expect(await adminOperatorService.getAllOperators()).toEqual([{ id: 'operator-1' }]);
    expect(apiClient.get).toHaveBeenCalledWith('/admin/operators');

    expect(await adminOperatorService.createOperator({ name: 'Nuevo' })).toEqual({
      id: 'operator-2',
    });
    expect(apiClient.post).toHaveBeenCalledWith('/admin/operators', { name: 'Nuevo' });
  });

  it('calls the operator and nested user item endpoints', async () => {
    apiClient.get.mockResolvedValue({ data: { id: 'operator-1' } });
    apiClient.put.mockResolvedValue({ data: { id: 'operator-1' } });
    apiClient.patch.mockResolvedValue({ data: { ok: true } });
    apiClient.post.mockResolvedValue({ data: { id: 'user-1' } });

    await adminOperatorService.getOperator('operator-1');
    expect(apiClient.get).toHaveBeenCalledWith('/admin/operators/operator-1');

    await adminOperatorService.updateOperator('operator-1', { name: 'Actualizado' });
    expect(apiClient.put).toHaveBeenCalledWith('/admin/operators/operator-1', {
      name: 'Actualizado',
    });

    await adminOperatorService.setOperatorActive('operator-1', false);
    expect(apiClient.patch).toHaveBeenCalledWith('/admin/operators/operator-1/active', {
      active: false,
    });

    await adminOperatorService.getOperatorUsers('operator-1');
    expect(apiClient.get).toHaveBeenCalledWith('/admin/operators/operator-1/users');

    await adminOperatorService.createOperatorUser('operator-1', { email: 'u@x.pe' });
    expect(apiClient.post).toHaveBeenCalledWith('/admin/operators/operator-1/users', {
      email: 'u@x.pe',
    });

    await adminOperatorService.updateOperatorUser('operator-1', 'user-1', { role: 'EDITOR' });
    expect(apiClient.put).toHaveBeenCalledWith('/admin/operators/operator-1/users/user-1', {
      role: 'EDITOR',
    });

    await adminOperatorService.resetOperatorUserPassword('operator-1', 'user-1', 'clave123');
    expect(apiClient.post).toHaveBeenCalledWith(
      '/admin/operators/operator-1/users/user-1/reset-password',
      { password: 'clave123' }
    );

    await adminOperatorService.setOperatorUserActive('operator-1', 'user-1', true);
    expect(apiClient.patch).toHaveBeenCalledWith(
      '/admin/operators/operator-1/users/user-1/active',
      { active: true }
    );
  });
});
