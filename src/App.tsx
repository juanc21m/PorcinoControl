import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Traceability from './pages/Traceability';
import Etapas from './pages/Etapas';
import Inventory from './pages/Inventory';
import Finances from './pages/Finances';
import Contacts from './pages/Contacts';
import DatabasePortal from './pages/DatabasePortal';
import { useAppStore } from './store/appStore';

/**
 * Corre el motor biológico cuando cambia el hato o la fecha simulada: aplica
 * mutaciones automáticas (p.ej. jubilación a los 8 partos → Descarte/Matadero)
 * y publica alerts / kpis / agenda médica en el estado global.
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

export default function App() {
  return (
    <BrowserRouter>
      <BiologicalDaemon />
      <div className="flex min-h-screen bg-gray-950">
        <Navbar />
        <main className="ml-56 flex-1 p-6 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/traceability" element={<Traceability />} />
            <Route path="/etapas" element={<Etapas />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/finances" element={<Finances />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/portal" element={<DatabasePortal />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
