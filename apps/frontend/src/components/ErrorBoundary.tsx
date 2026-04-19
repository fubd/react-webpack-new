import {Component, type ReactNode} from 'react';
import type {ErrorInfo} from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: unknown;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {hasError: false, error: null};

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {hasError: true, error};
  }

  reset = () => {
    this.setState({hasError: false, error: null});
  };

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div style={{padding: '80px 0', textAlign: 'center'}}>
            <p style={{color: '#64748b', fontSize: 18}}>Something went wrong.</p>
            <p style={{margin: '8px 0', color: '#64748b', fontSize: 14}}>
              <button
                type="button"
                onClick={this.reset}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0ea5e9',
                  cursor: 'pointer',
                  font: 'inherit',
                  textDecoration: 'underline',
                }}
              >
                Try again
              </button>
            </p>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
