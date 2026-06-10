import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Navbar from './Navbar';
import ErrorBoundary from './ErrorBoundary';
import { useAppStore } from '../store/appStore';
import { useAuth } from '../context/AuthContext';
import { LOGO_URL, APP_NAME } from '../lib/brand';

/**
 * Corre el motor biológico cuando cambia el hato o la fecha simulada: aplica
 * mutaciones automáticas y publica alerts / kpis / agenda médica en el estado
 * global. Solo se monta dentro del área autenticada.
 */
function BiologicalDaemon() {
  const animals = useAppStore(s => s.animals);
  const currentDate = useAppStore(s => s.currentDate);
  const runBiologicalEngine = useAppStore(s => s.runBiologicalEngine);

  useEffect(() => {
    runBiologicalEngine();
  }, [animals, currentDate, runBiologicalEngine]);

  return null;
}

/**
 * Carga el estado desde Supabase una sola vez al entrar al área autenticada.
 * Sin esto, los dashboards y tablas mostrarían el estado vacío en memoria.
 */
function DataLoader() {
  const fetchAll = useAppStore(s => s.fetchAll);
  const loaded = useAppStore(s => s.loaded);

  useEffect(() => {
    if (!loaded) void fetchAll();
  }, [loaded, fetchAll]);

  return null;
}

/**
 * Guarda de rutas: si no hay sesión, redirige a `/login`. Si la hay, renderiza
 * el chrome del ERP (navbar + contenido) con el daemon biológico activo.
 */
export default function ProtectedLayout() {
  const { isAuthenticated, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Mientras Supabase restaura la sesión persistida, esperar (evita un rebote
  // al /login en cada recarga antes de saber si hay sesión válida).
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-950">
        <div className="h-8 w-8 rounded-full border-2 border-brand-700 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <>
      <DataLoader />
      <BiologicalDaemon />
      <div className="min-h-screen bg-gray-950">
        {/* Sidebar: fija en escritorio, drawer deslizable en móvil */}
        <Navbar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Overlay oscuro detrás del drawer en móvil */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
          />
        )}

        {/* Barra superior móvil con botón hamburguesa */}
        <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-4 bg-primary-900 border-b border-primary-700/60">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
            className="text-gray-300 hover:text-white -ml-1 p-1"
          >
            <Menu size={24} />
          </button>
          <span className="bg-white rounded-md p-1 inline-flex items-center">
            <img src={LOGO_URL} alt={APP_NAME} className="h-7 w-auto object-contain" />
          </span>
        </header>

        {/* Contenido. min-w-0 evita que tablas/gráficas fuercen scroll horizontal. */}
        <main className="md:ml-56 min-w-0 p-4 sm:p-6 overflow-x-hidden">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </>
  );
}
