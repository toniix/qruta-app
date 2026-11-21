import { apiClient, operatorClient } from './apiClient';

function unwrap(response) {
  return response.data;
}

export const adminQrCodeService = {
  async getAll() {
    return unwrap(await apiClient.get('/admin/qr-codes'));
  },

  async getById(id) {
    return unwrap(await apiClient.get(`/admin/qr-codes/${id}`));
  },

  async create(data) {
    return unwrap(await apiClient.post('/admin/qr-codes', data));
  },

  async update(id, data) {
    return unwrap(await apiClient.patch(`/admin/qr-codes/${id}`, data));
  },

  async delete(id) {
    await apiClient.delete(`/admin/qr-codes/${id}`);
  },

  async getStats(id) {
    return unwrap(await apiClient.get(`/admin/qr-codes/${id}/stats`));
  },
};

export const operatorQrCodeService = {
  async getAll() {
    return unwrap(await operatorClient.get('/operator/qr-codes'));
  },

  async getById(id) {
    return unwrap(await operatorClient.get(`/operator/qr-codes/${id}`));
  },

  async create(data) {
    return unwrap(await operatorClient.post('/operator/qr-codes', data));
  },

  async update(id, data) {
    return unwrap(await operatorClient.patch(`/operator/qr-codes/${id}`, data));
  },

  async getStats(id) {
    return unwrap(await operatorClient.get(`/operator/qr-codes/${id}/stats`));
  },
};
