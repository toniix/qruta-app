import { apiClient } from "./apiClient";

export const adminStopService = {
  async getAllStops() {
    const response = await apiClient.get("/admin/stops");
    return response.data;
  },

  async createStop(data) {
    const response = await apiClient.post("/admin/stops", data);
    return response.data;
  },

  async updateStop(id, data) {
    const response = await apiClient.put(`/admin/stops/${id}`, data);
    return response.data;
  },

  async deleteStop(id) {
    await apiClient.delete(`/admin/stops/${id}`);
  },

  /**
   * Uploads (or replaces) the single reference image of a stop.
   *
   * `apiClient` sets a default `Content-Type: application/json`. Axios runs its
   * default `transformRequest` BEFORE the browser sets a multipart boundary, and
   * that transform serializes any FormData to JSON whenever the resolved content
   * type contains `application/json` (axios >= 1.x). That produced a
   * `{"file":{}}` JSON body, which the backend rejects with 415.
   *
   * Clearing the header per-call keeps the body as FormData so the browser can
   * set `multipart/form-data; boundary=...` itself.
   */
  async uploadStopImage(id, file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await apiClient.post(
      `/admin/stops/${id}/image`,
      formData,
      {
        headers: { "Content-Type": undefined },
      },
    );
    console.log("uploadStopImage response:", response);
    return response.data;
  },

  async removeStopImage(id) {
    const response = await apiClient.delete(`/admin/stops/${id}/image`);
    return response.data;
  },
};
