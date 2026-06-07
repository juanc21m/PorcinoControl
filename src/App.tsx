import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import SplashScreen from './components/SplashScreen';
import ProtectedLayout from './components/ProtectedLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Traceability from './pages/Traceability';
import Etapas from './pages/Etapas';
import Inventory from './pages/Inventory';
import Supplies from './pages/Supplies';
import Semen from './pages/Semen';
import Finances from './pages/Finances';
import Contacts from './pages/Contacts';
import DatabasePortal from './pages/DatabasePortal';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
          {/* Flujo de entrada */}
          <Route path="/" element={<SplashScreen />} />
          <Route path="/login" element={<Login />} />

          {/* Rutas protegidas del ERP */}
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/traceability" element={<Traceability />} />
            <Route path="/etapas" element={<Etapas />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/supplies" element={<Supplies />} />
            <Route path="/semen" element={<Semen />} />
            <Route path="/finances" element={<Finances />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/portal" element={<DatabasePortal />} />
          </Route>

          {/* Cualquier otra ruta vuelve al splash */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
