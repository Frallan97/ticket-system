// Ticket type models

export interface TicketType {
  id: number;
  event_id: number;
  name: string;
  description: string | null;
  price: number;
  quantity_available: number;
  quantity_sold: number;
  sale_start_date: string | null;
  sale_end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTicketTypeRequest {
  event_id: number;
  name: string;
  description?: string;
  price: number;
  quantity_available: number;
  sale_start_date?: string;
  sale_end_date?: string;
}

export interface UpdateTicketTypeRequest {
  name?: string;
  description?: string;
  price?: number;
  quantity_available?: number;
  sale_start_date?: string;
  sale_end_date?: string;
  is_active?: boolean;
}
