import { apiClient } from './client';
import { TicketType, CreateTicketTypeRequest, UpdateTicketTypeRequest } from '@/types/ticketType';

export const ticketTypesApi = {
  // Get ticket types for an event
  getByEventId: async (eventId: number) => {
    const response = await apiClient.get<TicketType[]>(`/events/${eventId}/ticket-types`);
    return response.data;
  },

  // Create ticket type (organizer)
  create: async (eventId: number, data: CreateTicketTypeRequest) => {
    const response = await apiClient.post<TicketType>(`/events/${eventId}/ticket-types`, data);
    return response.data;
  },

  // Update ticket type (organizer)
  update: async (id: number, data: UpdateTicketTypeRequest) => {
    const response = await apiClient.patch<TicketType>(`/ticket-types/${id}`, data);
    return response.data;
  },

  // Delete ticket type (organizer)
  delete: async (id: number) => {
    await apiClient.delete(`/ticket-types/${id}`);
  },
};
