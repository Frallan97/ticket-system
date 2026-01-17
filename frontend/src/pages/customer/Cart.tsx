import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Trash2, AlertCircle, ArrowRight, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CartItem } from '@/types/cart';

export const Cart = () => {
  const { cart, loading, itemCount, totalPrice, updateQuantity, removeItem, clearCart } = useCart();
  const navigate = useNavigate();
  const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());

  // Group cart items by event
  const groupedItems = cart?.items.reduce((acc, item) => {
    if (!acc[item.event_id]) {
      acc[item.event_id] = [];
    }
    acc[item.event_id].push(item);
    return acc;
  }, {} as Record<number, CartItem[]>) || {};

  const handleQuantityChange = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    setUpdatingItems(prev => new Set(prev).add(itemId));
    try {
      await updateQuantity(itemId, newQuantity);
      toast.success('Quantity updated');
    } catch (error) {
      console.error('Failed to update quantity:', error);
      toast.error('Failed to update quantity', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      await removeItem(itemId);
      toast.success('Item removed from cart');
    } catch (error) {
      console.error('Failed to remove item:', error);
      toast.error('Failed to remove item', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

  const handleClearCart = async () => {
    if (!confirm('Are you sure you want to clear your entire cart?')) return;

    try {
      await clearCart();
      toast.success('Cart cleared');
    } catch (error) {
      console.error('Failed to clear cart:', error);
      toast.error('Failed to clear cart');
    }
  };

  const handleProceedToCheckout = () => {
    // For cart checkout, we'll need to modify the checkout page
    // For now, redirect to the first event's checkout
    const firstEventId = Object.keys(groupedItems)[0];
    if (firstEventId) {
      navigate(`/checkout/${firstEventId}`);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!cart || itemCount === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">
              Start browsing events to add tickets to your cart
            </p>
            <Button asChild>
              <Link to="/events">Browse Events</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Shopping Cart</h1>
          <p className="text-muted-foreground mt-1">
            {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart
          </p>
        </div>
        <Button variant="ghost" asChild>
          <Link to="/events">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Continue Shopping
          </Link>
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {Object.entries(groupedItems).map(([eventId, items]) => {
            const firstItem = items[0];
            return (
              <Card key={eventId}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    <Link
                      to={`/events/${eventId}`}
                      className="hover:underline"
                    >
                      {firstItem.event_title}
                    </Link>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(firstItem.event_date), 'PPP')} at {firstItem.venue_name}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold">{item.ticket_type_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          ${item.price.toFixed(2)} each
                        </p>

                        {/* Show seat details if present */}
                        {item.seat_details && item.seat_details.length > 0 && (
                          <div className="mt-2 text-sm">
                            <p className="font-medium">Seats:</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {item.seat_details.map((seat) => (
                                <span
                                  key={seat.seat_id}
                                  className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs"
                                >
                                  {seat.section} - Row {seat.row_label}, Seat {seat.seat_number}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Quantity control (only for non-seated tickets) */}
                      {!item.seat_details || item.seat_details.length === 0 ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const value = parseInt(e.target.value);
                              if (value > 0) {
                                handleQuantityChange(item.id, value);
                              }
                            }}
                            disabled={updatingItems.has(item.id)}
                            className="w-20"
                          />
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">
                          Qty: {item.quantity}
                        </div>
                      )}

                      {/* Price and remove */}
                      <div className="text-right">
                        <p className="font-bold">${item.subtotal.toFixed(2)}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id)}
                          className="mt-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}

          {itemCount > 0 && (
            <Button
              variant="outline"
              onClick={handleClearCart}
              className="w-full"
            >
              Clear Cart
            </Button>
          )}
        </div>

        {/* Order Summary */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service Fee</span>
                  <span>$0.00</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {cart.expires_at && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Cart expires: {format(new Date(cart.expires_at), 'PPp')}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleProceedToCheckout}
              >
                Proceed to Checkout
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <Button variant="outline" className="w-full" asChild>
                <Link to="/events">Continue Shopping</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
