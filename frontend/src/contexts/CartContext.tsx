import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Cart, AddToCartRequest } from '@/types/cart';
import { cartApi } from '@/api/cart';
import { useAuth } from './AuthContext';

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  itemCount: number;
  totalPrice: number;
  addToCart: (request: AddToCartRequest) => Promise<void>;
  updateQuantity: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  migrateGuestCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  // Fetch cart from API
  const fetchCart = useCallback(async () => {
    try {
      const cartData = await cartApi.getCart();
      setCart(cartData);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
      // Set empty cart on error
      setCart({
        id: 0,
        session_id: '',
        items: [],
        total_items: 0,
        total_price: 0,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Poll cart every 30 seconds to sync state (e.g., handle seat lock expirations)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        fetchCart();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [loading, fetchCart]);

  // Add item to cart
  const addToCart = async (request: AddToCartRequest) => {
    try {
      await cartApi.addToCart(request);
      await fetchCart(); // Refresh cart after adding
    } catch (error) {
      console.error('Failed to add to cart:', error);
      throw error;
    }
  };

  // Update cart item quantity
  const updateQuantity = async (itemId: number, quantity: number) => {
    try {
      await cartApi.updateItem(itemId, { quantity });
      await fetchCart(); // Refresh cart after update
    } catch (error) {
      console.error('Failed to update cart item:', error);
      throw error;
    }
  };

  // Remove item from cart
  const removeItem = async (itemId: number) => {
    try {
      await cartApi.removeItem(itemId);
      await fetchCart(); // Refresh cart after removal
    } catch (error) {
      console.error('Failed to remove cart item:', error);
      throw error;
    }
  };

  // Clear entire cart
  const clearCart = async () => {
    try {
      await cartApi.clearCart();
      await fetchCart(); // Refresh cart after clearing
    } catch (error) {
      console.error('Failed to clear cart:', error);
      throw error;
    }
  };

  // Migrate guest cart to authenticated user cart
  const migrateGuestCart = async () => {
    try {
      await cartApi.migrateCart();
      await fetchCart(); // Refresh cart after migration
    } catch (error) {
      console.error('Failed to migrate cart:', error);
      // Don't throw - migration failure shouldn't break login flow
    }
  };

  // Computed values
  const itemCount = cart?.total_items || 0;
  const totalPrice = cart?.total_price || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        itemCount,
        totalPrice,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        migrateGuestCart,
        refreshCart: fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};
