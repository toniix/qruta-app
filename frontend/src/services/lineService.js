import { apiClient } from './apiClient';
import { MOCK_LINES } from './mockData';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

export const lineService = {
  async getAllLines() {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 200));
      return MOCK_LINES;
    }
    const response = await apiClient.get('/lines');
    return response.data;
  },

  async createLine(lineData) {
    if (USE_MOCK) {
      const newLine = {
        id: `line-${Date.now()}`,
        ...lineData,
      };
      MOCK_LINES.push(newLine);
      return newLine;
    }
    const response = await apiClient.post('/lines', lineData);
    return response.data;
  },
};
