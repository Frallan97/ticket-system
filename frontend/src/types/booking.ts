// Booking types matching backend models

import { Ticket } from './ticket';

export interface Booking {
  id: number;
  customer_id: string;
  event_id: number;
  booking_reference: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'refunded';
  payment_status: 'pending' | 'completed' | 'failed';
  customer_email: string;
  customer_name: string;
  customer_phone: string | null;
  booking_date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBookingRequest {
  event_id: number;
  session_id: string;
  customer_email: string;
  customer_name: string;
  customer_phone?: string;
  items: BookingItemRequest[];
}

export interface BookingItemRequest {
  ticket_type_id: number;
  quantity: number;
  seat_ids?: number[];
}

export interface BookingDetailResponse extends Booking {
  tickets: Ticket[];
}
