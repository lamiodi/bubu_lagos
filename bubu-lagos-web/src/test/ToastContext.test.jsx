import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastProvider, useToast } from '../context/ToastContext';

const TestComponent = () => {
  const { success, error, info, warning } = useToast();
  return (
    <div>
      <button onClick={() => success('Success message')} data-testid="success-btn">Show Success</button>
      <button onClick={() => error('Error message')} data-testid="error-btn">Show Error</button>
      <button onClick={() => info('Info message')} data-testid="info-btn">Show Info</button>
      <button onClick={() => warning('Warning message')} data-testid="warning-btn">Show Warning</button>
    </div>
  );
};

const renderWithProvider = () =>
  render(
    <ToastProvider>
      <TestComponent />
    </ToastProvider>
  );

describe('ToastContext', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows a success toast', async () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId('success-btn'));
    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
    });
  });

  it('shows an error toast', async () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId('error-btn'));
    await waitFor(() => {
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });

  it('shows an info toast', async () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId('info-btn'));
    await waitFor(() => {
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });
  });

  it('shows a warning toast', async () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId('warning-btn'));
    await waitFor(() => {
      expect(screen.getByText('Warning message')).toBeInTheDocument();
    });
  });

  it('auto-dismisses toasts after the default duration', async () => {
    // [NOTE] The component uses setTimeout for auto-dismiss. With React 18 +
    // fake timers, advancing time doesn't synchronously flush state updates, so
    // this test uses real timers with a short wait to verify the dismiss.
    const SHORT_DURATION = 50;
    const FastToast = () => {
      const { addToast } = useToast();
      return (
        <button onClick={() => addToast('Quick toast', 'info', SHORT_DURATION)}>
          Show
        </button>
      );
    };
    render(
      <ToastProvider>
        <FastToast />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Show'));

    await waitFor(() => {
      expect(screen.getByText('Quick toast')).toBeInTheDocument();
    });

    await waitFor(
      () => {
        expect(screen.queryByText('Quick toast')).not.toBeInTheDocument();
      },
      { timeout: 1000 }
    );
  });

  it('dismisses a toast when its close button is clicked', async () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId('info-btn'));

    await waitFor(() => {
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /×/ }));

    await waitFor(() => {
      expect(screen.queryByText('Info message')).not.toBeInTheDocument();
    });
  });

  it('renders multiple toasts at once', async () => {
    renderWithProvider();
    fireEvent.click(screen.getByTestId('success-btn'));
    fireEvent.click(screen.getByTestId('error-btn'));

    await waitFor(() => {
      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Error message')).toBeInTheDocument();
    });
  });
});
