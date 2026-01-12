import { apiClient } from './client';
import { Booking, CreateBookingRequest, BookingDetailResponse } from '@/types/booking';
import { LockSeatsRequest, LockSeatsResponse } from '@/types/seat';

export const bookingsApi = {
  // Lock seats for checkout
  lockSeats: async (data: LockSeatsRequest) => {
    const response = await apiClient.post<LockSeatsResponse>('/bookings/lock-seats', data);
    return response.data;
  },

  // Create booking
  create: async (data: CreateBookingRequest) => {
    const response = await apiClient.post<Booking>('/bookings', data);
    return response.data;
  },

  // Get my bookings
  getMyBookings: async () => {
    const response = await apiClient.get<Booking[]>('/bookings');
    return response.data;
  },

  // Get booking by ID
  getById: async (id: number) => {
    const response = await apiClient.get<BookingDetailResponse>(`/bookings/${id}`);
    return response.data;
  },

  // Get tickets for a booking
  getTickets: async (id: number) => {
    const response = await apiClient.get(`/bookings/${id}/tickets`);
    return response.data;
  },
};
