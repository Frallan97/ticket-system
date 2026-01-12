// Analytics types

export interface EventAnalytics {
  event_id: number;
  total_tickets_sold: number;
  total_revenue: number;
  tickets_by_type: TicketTypeBreakdown[];
  sales_over_time: SalesDataPoint[];
  checked_in_count: number;
  remaining_capacity: number;
}

export interface TicketTypeBreakdown {
  ticket_type_id: number;
  ticket_type_name: string;
  quantity_sold: number;
  revenue: number;
  percentage: number;
}

export interface SalesDataPoint {
  date: string;
  tickets_sold: number;
  revenue: number;
}

export interface CheckinStatusResponse {
  event_id: number;
  total_tickets: number;
  checked_in_count: number;
  remaining_count: number;
  checkin_percentage: number;
}
