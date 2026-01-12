import { apiClient } from './client';
import { Event, CreateEventRequest, UpdateEventRequest } from '@/types/event';

export const eventsApi = {
  // Public endpoints
  getAll: async (params?: { status?: string; search?: string }) => {
    const response = await apiClient.get<Event[]>('/events', { params });
    return response.data;
  },

  getById: async (id: number) => {
    const response = await apiClient.get<Event>(`/events/${id}`);
    return response.data;
  },

  // Organizer endpoints
  create: async (data: CreateEventRequest) => {
    const response = await apiClient.post<Event>('/events', data);
    return response.data;
  },

  update: async (id: number, data: UpdateEventRequest) => {
    const response = await apiClient.patch<Event>(`/events/${id}`, data);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/events/${id}`);
  },

  uploadImage: async (id: number, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiClient.post(`/events/${id}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getAnalytics: async (id: number) => {
    const response = await apiClient.get(`/events/${id}/analytics`);
    return response.data;
  },

  getBookings: async (id: number) => {
    const response = await apiClient.get(`/events/${id}/bookings`);
    return response.data;
  },

  getCheckinStatus: async (id: number) => {
    const response = await apiClient.get(`/events/${id}/checkin-status`);
    return response.data;
  },
};
