import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, GitBranch, DollarSign, Database, Package, MapPin, Contact, LogOut, X, Boxes, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { LOGO_URL, APP_NAME } from '../lib/brand';

const links = [
  { to: '/dashboard',   label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/traceability',label: 'Trazabilidad',   icon: GitBranch },
  { to: '/ubicacion',   label: 'Ubicación',       icon: MapPin },
  { to: '/inventory',   label: 'Inventario',      icon: Package },
  { to: '/supplies',    label: 'Insumos',         icon: Boxes },
  { to: '/finances',    label: 'Finanzas',        icon: DollarSign },
  { to: '/contacts',    label: 'Contactos',       icon: Contact },
  { to: '/reports',     label: 'Reportes',        icon: FileSpreadsheet },
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
    try {
      await logout();
    } finally {
      // Salimos al login incluso si el backend falló al cerrar sesión.
      navigate('/login', { replace: true });
    }
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen w-64 sm:w-56 bg-white border-r border-gray-200 flex flex-col z-50
        shadow-[2px_0_5px_rgba(0,0,0,0.05)]
        transform transition-transform duration-200 ease-out
        md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
    >
      {/* Logo centrado con aire */}
      <div className="relative border-b border-gray-200 p-5 flex items-center justify-center">
        <img src={LOGO_URL} alt={APP_NAME} className="w-full max-w-[150px] h-auto object-contain" />
        <button
          onClick={onClose}
          aria-label="Cerrar menú"
          className="absolute right-3 top-3 md:hidden text-gray-400 hover:text-gray-700 p-1"
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
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-2 py-3 border-t border-gray-200 space-y-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          <LogOut size={18} />
          Cerrar Sesión
        </button>
        <p className="text-xs text-gray-400 px-3">v1.0.0</p>
      </div>
    </aside>
  );
}
