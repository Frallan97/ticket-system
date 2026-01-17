export interface Cart {
  id: number;
  session_id: string;
  items: CartItem[];
  total_items: number;
  total_price: number;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: number;
  cart_id: number;
  event_id: number;
  event_title: string;
  event_date: string;
  venue_name: string;
  ticket_type_id: number;
  ticket_type_name: string;
  price: number;
  quantity: number;
  subtotal: number;
  seat_ids?: number[];
  seat_details?: SeatDetail[];
  created_at: string;
  updated_at: string;
}

export interface SeatDetail {
  seat_id: number;
  section: string;
  row_label: string;
  seat_number: string;
}

export interface AddToCartRequest {
  event_id: number;
  ticket_type_id: number;
  quantity: number;
  seat_ids?: number[];
}

export interface UpdateCartItemRequest {
  quantity: number;
}

export interface MergeCartRequest {
  guest_session_id: string;
}
