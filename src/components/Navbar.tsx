import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, GitBranch, DollarSign, Database, PiggyBank, Package, Workflow, Contact, LogOut, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/dashboard',   label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/traceability',label: 'Trazabilidad',   icon: GitBranch },
  { to: '/etapas',      label: 'Etapas',          icon: Workflow },
  { to: '/inventory',   label: 'Inventario',      icon: Package },
  { to: '/finances',    label: 'Finanzas',        icon: DollarSign },
  { to: '/contacts',    label: 'Contactos',       icon: Contact },
  { to: '/portal',      label: 'DB Portal',       icon: Database },
];

interface NavbarProps {
  /** En móvil controla si el drawer está abierto. */
  open: boolean;
  /** Cierra el drawer (al navegar, tocar overlay o el botón X). */
  onClose: () => void;
}

export default function Navbar({ open, onClose }: NavbarProps) {
  const { logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  // RBAC: el DB Portal solo es visible para el admin.
  const visibleLinks = links.filter(l => l.to !== '/portal' || isAdmin);

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen w-64 sm:w-56 bg-gray-900 border-r border-gray-800 flex flex-col z-50
        transform transition-transform duration-200 ease-out
        md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
    >
      {/* Logo + cerrar (móvil) */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
        <div className="w-9 h-9 rounded-full bg-brand-800 flex items-center justify-center shadow-glow">
          <PiggyBank size={20} className="text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">PorciControl</span>
        <button
          onClick={onClose}
          aria-label="Cerrar menú"
          className="ml-auto md:hidden text-gray-400 hover:text-white p-1 -mr-1"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {visibleLinks.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-brand-800 text-white shadow-glow'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-2 py-3 border-t border-gray-800 space-y-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-all"
        >
          <LogOut size={18} />
          Cerrar Sesión
        </button>
        <p className="text-xs text-gray-600 px-3">v1.0.0</p>
      </div>
    </aside>
  );
}
