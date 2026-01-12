// Seat and seat locking types

export interface Seat {
  id: number;
  event_id: number;
  section: string;
  row_label: string;
  seat_number: string;
  ticket_type_id: number | null;
  is_available: boolean;
  created_at: string;
}

export interface SeatLock {
  id: number;
  seat_id: number;
  session_id: string;
  locked_at: string;
  expires_at: string;
}

export interface LockSeatsRequest {
  event_id: number;
  seat_ids: number[];
  session_id: string;
}

export interface LockSeatsResponse {
  success: boolean;
  expires_at: string;
  locked_seat_ids: number[];
}

export interface BulkCreateSeatsRequest {
  event_id: number;
  sections: SeatSection[];
}

export interface SeatSection {
  section_name: string;
  rows: SeatRow[];
}

export interface SeatRow {
  row_label: string;
  seat_count: number;
  ticket_type_id?: number;
}
