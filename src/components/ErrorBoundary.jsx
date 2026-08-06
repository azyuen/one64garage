import { Component } from 'react';
import { Link, useLocation } from 'react-router-dom';

class Boundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Still logged to console for anyone who does have devtools open.
    console.error('one64garage crashed:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}

export default function ErrorBoundary({ children }) {
  const location = useLocation();

  return (
    <Boundary
      key={location.pathname}
      fallback={(error) => (
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <p className="plate-label mb-2">Something broke</p>
          <h1 className="font-display font-black text-2xl mb-4">This screen hit an error</h1>
          <p className="text-sm text-ink-soft dark:text-paper-soft mb-1">
            The details below will help track down what went wrong — screenshot them if you're reporting this.
          </p>
          <pre className="text-left text-xs font-mono bg-canvas-soft dark:bg-garage-soft border border-canvas-line dark:border-garage-line p-3 my-4 overflow-x-auto whitespace-pre-wrap">
            {error?.message || String(error)}
          </pre>
          <Link to="/" className="btn-primary">
            Back to Garage
          </Link>
        </div>
      )}
    >
      {children}
    </Boundary>
  );
}
