import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CartProvider, useCart } from '../context/CartContext';

const TestComponent = () => {
  const { cartItems, addToCart, removeFromCart, updateQuantity, clearCart, cartCount, cartTotal } = useCart();

  return (
    <div>
      <span data-testid="cart-count">{cartCount}</span>
      <span data-testid="cart-total">{cartTotal}</span>
      <span data-testid="cart-items">{cartItems.length}</span>
      <button
        onClick={() => addToCart({ id: '1', name: 'Test Product', price: 1000 }, 'M')}
        data-testid="add-btn"
      >
        Add to Cart
      </button>
      <button onClick={() => removeFromCart('1', 'M')} data-testid="remove-btn">
        Remove from Cart
      </button>
      <button onClick={() => updateQuantity('1', 'M', 2)} data-testid="update-btn">
        Update Quantity
      </button>
      <button onClick={clearCart} data-testid="clear-btn">
        Clear Cart
      </button>
    </div>
  );
};

const renderWithProvider = () =>
  render(
    <CartProvider>
      <TestComponent />
    </CartProvider>
  );

describe('CartContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with an empty cart', () => {
    renderWithProvider();
    expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
    expect(screen.getByTestId('cart-total')).toHaveTextContent('0');
    expect(screen.getByTestId('cart-items')).toHaveTextContent('0');
  });

  it('adds an item to the cart', () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId('add-btn'));
    expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
    expect(screen.getByTestId('cart-total')).toHaveTextContent('1000');
  });

  it('increments quantity when adding the same product+size twice', () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId('add-btn'));
    fireEvent.click(screen.getByTestId('add-btn'));
    expect(screen.getByTestId('cart-count')).toHaveTextContent('2');
    expect(screen.getByTestId('cart-items')).toHaveTextContent('1');
  });

  it('treats the same product in different sizes as separate lines', () => {
    const TestSizes = () => {
      const { addToCart, cartItems } = useCart();
      return (
        <div>
          <span data-testid="lines">{cartItems.length}</span>
          <button onClick={() => addToCart({ id: '1', name: 'P', price: 500 }, 'S')}>S</button>
          <button onClick={() => addToCart({ id: '1', name: 'P', price: 500 }, 'L')}>L</button>
        </div>
      );
    };
    render(
      <CartProvider>
        <TestSizes />
      </CartProvider>
    );
    fireEvent.click(screen.getByText('S'));
    fireEvent.click(screen.getByText('L'));
    expect(screen.getByTestId('lines')).toHaveTextContent('2');
  });

  it('removes an item from the cart', () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId('add-btn'));
    expect(screen.getByTestId('cart-count')).toHaveTextContent('1');
    fireEvent.click(screen.getByTestId('remove-btn'));
    expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
  });

  it('applies a positive delta to the quantity', () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId('add-btn')); // qty = 1
    fireEvent.click(screen.getByTestId('update-btn')); // +2 => qty = 3
    expect(screen.getByTestId('cart-count')).toHaveTextContent('3');
    expect(screen.getByTestId('cart-total')).toHaveTextContent('3000');
  });

  it('clears the cart', () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId('add-btn'));
    fireEvent.click(screen.getByTestId('add-btn'));
    fireEvent.click(screen.getByTestId('clear-btn'));
    expect(screen.getByTestId('cart-count')).toHaveTextContent('0');
    expect(screen.getByTestId('cart-items')).toHaveTextContent('0');
  });

  it('persists the cart to localStorage', async () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId('add-btn'));
    await waitFor(() => {
      const stored = localStorage.getItem('cart');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('1');
    });
  });

  it('restores the cart from localStorage on mount', async () => {
    localStorage.setItem(
      'cart',
      JSON.stringify([{ id: '99', name: 'Stored', price: 2500, size: 'L', quantity: 2 }])
    );

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('cart-count')).toHaveTextContent('2');
      expect(screen.getByTestId('cart-total')).toHaveTextContent('5000');
    });
  });
});
