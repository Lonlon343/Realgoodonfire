import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Unerwarteter Fehler in der App:', error, info?.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-realbg px-5 py-10 flex items-center justify-center" role="alert">
          <div className="w-full max-w-sm rounded-squircle bg-white p-8 text-center shadow-xl border border-slate-100">
            <span className="text-5xl block mb-4" aria-hidden="true">🍔</span>
            <h1 className="text-2xl font-black text-realgreen tracking-tight mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
              Da ist etwas schiefgelaufen.
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              Lade die App neu, um es noch einmal zu versuchen.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full rounded-squircle bg-realgreen px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-transform hover:scale-[1.01]"
            >
              Neu laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
