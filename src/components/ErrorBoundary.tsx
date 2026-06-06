import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
  componentStack: string | null;
}

/**
 * Captura errores de *render* (que los try/catch de eventos/efectos no atrapan),
 * evita la pantalla blanca / overlay y muestra un mensaje legible con el stack
 * del componente culpable. También lo registra en consola para diagnóstico.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] error de render capturado:', error, info.componentStack);
    this.setState({ componentStack: info.componentStack ?? null });
  }

  handleReset = () => this.setState({ error: null, componentStack: null });

  render() {
    const { error, componentStack } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="w-full max-w-xl bg-gray-900 border border-red-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
              <AlertTriangle className="text-red-400" size={20} />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">Ocurrió un error al mostrar esta sección</h2>
              <p className="text-gray-400 text-sm">La app sigue activa; puedes reintentar o navegar a otra sección.</p>
            </div>
          </div>

          <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs text-red-300 font-mono overflow-auto max-h-48">
            <p className="font-semibold">{error.name}: {error.message}</p>
            {componentStack && (
              <pre className="mt-2 text-gray-500 whitespace-pre-wrap">{componentStack.trim()}</pre>
            )}
          </div>

          <button
            onClick={this.handleReset}
            className="mt-4 bg-brand-800 hover:bg-brand-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }
}
