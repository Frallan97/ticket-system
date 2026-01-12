import { apiClient } from './client';
import {
  ValidateTicketRequest,
  ValidateTicketResponse,
  CheckinTicketRequest,
  CheckinTicketResponse,
} from '@/types/ticket';

export const ticketsApi = {
  // Get QR code for a ticket
  getQRCode: async (ticketCode: string) => {
    const response = await apiClient.get(`/tickets/${ticketCode}/qr`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Validate a ticket
  validate: async (data: ValidateTicketRequest) => {
    const response = await apiClient.post<ValidateTicketResponse>(
      `/tickets/${data.ticket_code}/validate`,
      data
    );
    return response.data;
  },

  // Check in a ticket
  checkin: async (data: CheckinTicketRequest) => {
    const response = await apiClient.post<CheckinTicketResponse>(
      `/tickets/${data.ticket_code}/checkin`,
      data
    );
    return response.data;
  },
};
