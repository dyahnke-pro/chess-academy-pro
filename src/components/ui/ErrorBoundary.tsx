import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-1 items-center justify-center p-8"
          data-testid="error-boundary-fallback"
        >
          <div className="text-center max-w-sm">
            <AlertTriangle
              size={48}
              className="mx-auto mb-4"
              style={{ color: 'var(--color-error)' }}
            />
            <h2
              className="text-xl font-bold mb-2"
              style={{ color: 'var(--color-text)' }}
            >
              Something went wrong
            </h2>
            <p
              className="text-sm mb-6"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Refresh to continue.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: 'var(--color-accent)', color: 'var(--color-bg)' }}
              data-testid="error-refresh-btn"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
