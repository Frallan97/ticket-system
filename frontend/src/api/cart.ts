import { apiClient } from './client';
import { Cart, AddToCartRequest, UpdateCartItemRequest, MergeCartRequest, CartItem } from '@/types/cart';

// Get or generate cart session ID from localStorage
export const getCartSessionId = (): string => {
  let sessionId = localStorage.getItem('cart_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('cart_session_id', sessionId);
  }
  return sessionId;
};

export const cartApi = {
  // Get current cart
  getCart: async () => {
    const sessionId = getCartSessionId();
    const response = await apiClient.get<Cart>('/cart', {
      headers: {
        'X-Cart-Session': sessionId,
      },
    });
    return response.data;
  },

  // Add item to cart
  addToCart: async (data: AddToCartRequest) => {
    const sessionId = getCartSessionId();
    const response = await apiClient.post<CartItem>('/cart/items', data, {
      headers: {
        'X-Cart-Session': sessionId,
      },
    });
    return response.data;
  },

  // Update cart item quantity
  updateItem: async (itemId: number, data: UpdateCartItemRequest) => {
    const sessionId = getCartSessionId();
    await apiClient.put(`/cart/items/${itemId}`, data, {
      headers: {
        'X-Cart-Session': sessionId,
      },
    });
  },

  // Remove item from cart
  removeItem: async (itemId: number) => {
    const sessionId = getCartSessionId();
    await apiClient.delete(`/cart/items/${itemId}`, {
      headers: {
        'X-Cart-Session': sessionId,
      },
    });
  },

  // Clear entire cart
  clearCart: async () => {
    const sessionId = getCartSessionId();
    await apiClient.delete('/cart', {
      headers: {
        'X-Cart-Session': sessionId,
      },
    });
  },

  // Merge guest cart to authenticated user cart
  migrateCart: async () => {
    const guestSessionId = localStorage.getItem('cart_session_id');
    if (!guestSessionId) {
      return; // No guest cart to migrate
    }

    // Generate new session ID for authenticated user
    const newSessionId = crypto.randomUUID();
    localStorage.setItem('cart_session_id', newSessionId);

    const response = await apiClient.post<Cart>('/cart/merge', {
      guest_session_id: guestSessionId,
    } as MergeCartRequest, {
      headers: {
        'X-Cart-Session': newSessionId,
      },
    });

    return response.data;
  },
};
