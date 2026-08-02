import { apiClient } from './apiClient';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

export const cityService = {
  async getAllCities() {
    if (USE_MOCK) {
      return [
        {
          id: 'city-ica',
          name: 'Ica',
          department: 'Ica',
          country: 'Perú',
        },
      ];
    }
    const response = await apiClient.get('/cities');
    return response.data;
  },
};
