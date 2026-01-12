import { apiClient } from './client';
import { Seat, BulkCreateSeatsRequest } from '@/types/seat';

export const seatsApi = {
  // Get seats for an event
  getSeats: async (eventId: number) => {
    const response = await apiClient.get<Seat[]>(`/events/${eventId}/seats`);
    return response.data;
  },

  // Bulk create seats (organizer)
  bulkCreate: async (eventId: number, data: BulkCreateSeatsRequest) => {
    const response = await apiClient.post(`/events/${eventId}/seats/bulk`, data);
    return response.data;
  },
};
