import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string | null;
  errorStack: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: null, errorStack: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message,
      errorStack: error.stack ?? null,
    };
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
              className="text-sm mb-4"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Refresh to continue.
            </p>
            {this.state.errorMessage && (
              <div
                className="text-left text-xs mb-4 p-3 rounded-lg overflow-auto max-h-48"
                style={{ background: 'var(--color-surface)', color: 'var(--color-error)' }}
                data-testid="error-details"
              >
                <p className="font-bold mb-1">{this.state.errorMessage}</p>
                {this.state.errorStack && (
                  <pre className="whitespace-pre-wrap break-all opacity-70 text-[10px] leading-tight">
                    {this.state.errorStack}
                  </pre>
                )}
              </div>
            )}
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
