import {Component, type ReactNode} from 'react';
import type {ErrorInfo} from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {hasError: false};

  static getDerivedStateFromError(): ErrorBoundaryState {
    return {hasError: true};
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div style={{padding: '80px 0', textAlign: 'center'}}>
          <p style={{color: '#64748b', fontSize: 18}}>
            Something went wrong.
          </p>
          <p style={{margin: '8px 0', color: '#64748b', fontSize: 14}}>
            Try refreshing the page.          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
