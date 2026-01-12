// Ticket types

export interface Ticket {
  id: number;
  booking_id: number;
  event_id: number;
  ticket_type_id: number;
  seat_id: number | null;
  ticket_code: string;
  qr_code_data: string;
  price_paid: number;
  attendee_name: string | null;
  attendee_email: string | null;
  is_checked_in: boolean;
  checked_in_at: string | null;
  checked_in_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketDetailResponse extends Ticket {
  event_title?: string;
  venue_name?: string;
  event_date?: string;
  section?: string;
  row_label?: string;
  seat_number?: string;
}

export interface ValidateTicketRequest {
  ticket_code: string;
}

export interface ValidateTicketResponse {
  valid: boolean;
  ticket?: TicketDetailResponse;
  error?: string;
}

export interface CheckinTicketRequest {
  ticket_code: string;
}

export interface CheckinTicketResponse {
  success: boolean;
  ticket?: TicketDetailResponse;
  error?: string;
}
