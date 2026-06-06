import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import { useAppStore } from '../store/appStore';
import { useAuth } from '../context/AuthContext';

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
      <div className="flex min-h-screen bg-gray-950">
        <Navbar />
        <main className="ml-56 flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </>
  );
}
