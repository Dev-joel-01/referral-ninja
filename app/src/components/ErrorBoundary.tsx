import type { ReactNode } from 'react';
import { Component } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch() {
    // You could log to an error reporting service here
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-ninja-black flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
              <h1 className="text-2xl font-heading text-red-400 mb-2">
                Something went wrong
              </h1>
              <p className="text-ninja-sage mb-4">
                We apologize for the inconvenience. Please try refreshing the page.
              </p>
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <pre className="text-xs text-red-300 bg-red-950/20 p-2 rounded mb-4 overflow-auto max-h-40">
                  {this.state.error.toString()}
                </pre>
              )}
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-ninja-green/20 hover:bg-ninja-green/30 text-ninja-green border border-ninja-green/30 rounded-lg px-4 py-2 transition-colors"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
