import { Component } from 'react';
import { logger } from '../lib/logger';

/**
 * Top-level ErrorBoundary.
 * Catches uncaught render errors, logs them (dev only), and shows a recovery screen.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    logger.error('ErrorBoundary caught an error:', error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-5">
        <div className="max-w-md w-full bg-white border border-gray-100 p-10 rounded-sm shadow-sm text-center">
          <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-red-500 mb-3">
            Something went wrong
          </span>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-widest mb-3">
            An unexpected error occurred
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed mb-8">
            We&apos;ve been notified. You can try again, or come back in a moment.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-left text-[11px] bg-gray-50 border border-gray-200 p-3 mb-6 overflow-auto max-h-40">
              {String(this.state.error?.message || this.state.error)}
            </pre>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="px-6 py-3 border border-black text-black text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={this.handleReload}
              className="px-6 py-3 bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-gray-900 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
