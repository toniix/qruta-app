import { apiClient } from './apiClient';

/**
 * Platform-admin operations over transport operators and their portal users.
 * All calls go through /api/admin/**, which requires the ADMIN role.
 */
export const adminOperatorService = {
  async getAllOperators() {
    const response = await apiClient.get('/admin/operators');
    return response.data;
  },

  async getOperator(id) {
    const response = await apiClient.get(`/admin/operators/${id}`);
    return response.data;
  },

  async createOperator(data) {
    const response = await apiClient.post('/admin/operators', data);
    return response.data;
  },

  async updateOperator(id, data) {
    const response = await apiClient.put(`/admin/operators/${id}`, data);
    return response.data;
  },

  async setOperatorActive(id, active) {
    const response = await apiClient.patch(`/admin/operators/${id}/active`, { active });
    return response.data;
  },

  async getOperatorUsers(operatorId) {
    const response = await apiClient.get(`/admin/operators/${operatorId}/users`);
    return response.data;
  },

  async createOperatorUser(operatorId, data) {
    const response = await apiClient.post(`/admin/operators/${operatorId}/users`, data);
    return response.data;
  },

  async updateOperatorUser(operatorId, userId, data) {
    const response = await apiClient.put(
      `/admin/operators/${operatorId}/users/${userId}`,
      data,
    );
    return response.data;
  },

  async resetOperatorUserPassword(operatorId, userId, password) {
    const response = await apiClient.post(
      `/admin/operators/${operatorId}/users/${userId}/reset-password`,
      { password },
    );
    return response.data;
  },

  async setOperatorUserActive(operatorId, userId, active) {
    const response = await apiClient.patch(
      `/admin/operators/${operatorId}/users/${userId}/active`,
      { active },
    );
    return response.data;
  },
};

export default adminOperatorService;