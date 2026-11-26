import { Component } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const title = this.props.fallbackTitle || 'Algo salió mal';
    const description =
      this.props.fallbackDescription ||
      'Ocurrió un error inesperado al cargar esta sección. Puedes intentarlo de nuevo o recargar la página.';

    return (
      <div
        role="alert"
        className="flex flex-1 min-h-[40vh] w-full items-center justify-center p-6"
      >
        <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-card">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
            {description}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Reintentar
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Recargar página
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
