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
 * Guarda de rutas: si no hay sesión, redirige a `/login`. Si la hay, renderiza
 * el chrome del ERP (navbar + contenido) con el daemon biológico activo.
 */
export default function ProtectedLayout() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return (
    <>
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
