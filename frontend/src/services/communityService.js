import { apiClient } from './apiClient';
import { getOrCreateDeviceId } from '../hooks/useCommunityIdentity';

function deviceHeaders() {
  return {
    'X-Device-Id': getOrCreateDeviceId(),
  };
}

export const COMMUNITY_CATEGORIES = [
  {
    id: 'ALERTA',
    label: 'Alerta / Tráfico',
    shortLabel: 'Alertas',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
    activeChipClass: 'bg-rose-600 text-white border-rose-600 shadow-xs',
    dotClass: 'bg-rose-500',
  },
  {
    id: 'PREGUNTA',
    label: '¿Cómo llego?',
    shortLabel: '¿Cómo llego?',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
    activeChipClass: 'bg-amber-500 text-white border-amber-500 shadow-xs',
    dotClass: 'bg-amber-500',
  },
  {
    id: 'RECOMENDACION',
    label: 'Recomendación',
    shortLabel: 'Recomendaciones',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    activeChipClass: 'bg-emerald-600 text-white border-emerald-600 shadow-xs',
    dotClass: 'bg-emerald-500',
  },
  {
    id: 'OBJETOS_PERDIDOS',
    label: 'Objetos perdidos',
    shortLabel: 'Objetos perdidos',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
    activeChipClass: 'bg-purple-600 text-white border-purple-600 shadow-xs',
    dotClass: 'bg-purple-500',
  },
];

export function getCategoryMeta(categoryId) {
  return (
    COMMUNITY_CATEGORIES.find((c) => c.id === categoryId) ||
    COMMUNITY_CATEGORIES[0]
  );
}

export const communityService = {
  async getPosts(
    { category, routeId, cityId, limit = 20, page = 0, sort = 'recent' } = {},
    config = {},
  ) {
    const params = {};
    if (category && category !== 'ALL') params.category = category;
    if (routeId) params.routeId = routeId;
    if (cityId) params.cityId = cityId;
    if (limit) params.limit = limit;
    if (page) params.page = page;
    if (sort && sort !== 'recent') params.sort = sort;

    const response = await apiClient.get('/community/posts', {
      params,
      headers: deviceHeaders(),
      ...config,
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  async createPost({ authorAlias, category, content, routeId, cityId }) {
    const payload = {
      authorAlias,
      category,
      content,
      routeId: routeId || null,
      cityId: cityId || null,
    };
    const response = await apiClient.post('/community/posts', payload, {
      headers: deviceHeaders(),
    });
    return response.data;
  },

  async deleteOwnPost(postId) {
    await apiClient.delete(`/community/posts/${postId}`, {
      headers: deviceHeaders(),
    });
  },

  async toggleLike(postId) {
    const response = await apiClient.post(
      `/community/posts/${postId}/like`,
      {},
      { headers: deviceHeaders() },
    );
    return response.data;
  },

  async getComments(postId) {
    const response = await apiClient.get(`/community/posts/${postId}/comments`, {
      headers: deviceHeaders(),
    });
    return Array.isArray(response.data) ? response.data : [];
  },

  async addComment(postId, { authorAlias, content, website = '' }) {
    const response = await apiClient.post(
      `/community/posts/${postId}/comments`,
      { authorAlias, content, website },
      { headers: deviceHeaders() },
    );
    return response.data;
  },

  async deleteOwnComment(commentId) {
    await apiClient.delete(`/community/comments/${commentId}`, {
      headers: deviceHeaders(),
    });
  },

  async getRouteSummary(routeId) {
    const response = await apiClient.get(`/community/routes/${routeId}/summary`, {
      headers: deviceHeaders(),
    });
    return response.data;
  },

  /* ── Admin Moderation Endpoints ───────────────────────────────────── */

  async getAdminPosts() {
    const response = await apiClient.get('/admin/community/posts');
    return Array.isArray(response.data) ? response.data : [];
  },

  async adminDeletePost(postId) {
    await apiClient.delete(`/admin/community/posts/${postId}`);
  },

  async adminDeleteComment(commentId) {
    await apiClient.delete(`/admin/community/comments/${commentId}`);
  },
};

