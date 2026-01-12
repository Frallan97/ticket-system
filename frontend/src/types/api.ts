// Common API response types

export interface ApiError {
  error: string;
  message?: string;
  details?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
