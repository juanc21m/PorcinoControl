import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, GitBranch, DollarSign, Database, Package, MapPin, ArrowRightLeft, Contact, LogOut, X, Boxes, FileSpreadsheet, Sun, Moon, Users as UsersIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LOGO_URL, APP_NAME } from '../lib/brand';

const links = [
  { to: '/dashboard',   label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/traceability',label: 'Trazabilidad',   icon: GitBranch },
  { to: '/ubicacion',   label: 'Ubicación',       icon: MapPin },
  { to: '/movilizacion',label: 'Movilización',    icon: ArrowRightLeft },
  { to: '/inventory',   label: 'Inventario',      icon: Package },
  { to: '/supplies',    label: 'Insumos',         icon: Boxes },
  { to: '/finances',    label: 'Finanzas',        icon: DollarSign },
  { to: '/contacts',    label: 'Contactos',       icon: Contact },
  { to: '/reports',     label: 'Reportes',        icon: FileSpreadsheet },
  { to: '/usuarios',    label: 'Usuarios',        icon: UsersIcon },
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
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  // RBAC: el DB Portal solo es visible para el admin.
  // RBAC: Usuarios y DB Portal solo son visibles para el Admin.
  const ADMIN_ONLY = ['/portal', '/usuarios'];
  const visibleLinks = links.filter(l => !ADMIN_ONLY.includes(l.to) || isAdmin);

  const handleLogout = async () => {
    onClose();
    try {
      await logout();
    } finally {
      // Salimos al login incluso si el backend falló al cerrar sesión.
      navigate('/login', { replace: true });
    }
  };

  // La altura va en dvh y no en vh: en móvil el viewport de 100vh incluye el
  // espacio que tapa la barra del navegador, así que el pie del menú (tema y
  // cerrar sesión) quedaba fuera de pantalla, y al ser un aside fijo no había
  // forma de desplazarse hasta él.
  return (
    <aside
      className={`fixed left-0 top-0 h-dvh w-64 sm:w-56 bg-gray-900 border-r border-gray-800 flex flex-col z-50
        shadow-[2px_0_8px_rgba(0,0,0,0.08)]
        transform transition-transform duration-200 ease-out
        md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
    >
      {/* Logo centrado con aire */}
      <div className="relative border-b border-gray-800 p-5 flex items-center justify-center">
        <img src={LOGO_URL} alt={APP_NAME} className="w-full max-w-[150px] h-auto object-contain" />
        <button
          onClick={onClose}
          aria-label="Cerrar menú"
          className="absolute right-3 top-3 md:hidden text-gray-400 hover:text-gray-50 p-1"
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
                  ? 'bg-brand-500/15 text-brand-400 font-semibold'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-50'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* pb con safe-area: en iPhone el indicador de inicio tapa el último botón. */}
      <div className="px-2 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-gray-800 space-y-2">
        {/* Interruptor de tema (preferencia local, por dispositivo) */}
        <button
          onClick={toggleTheme}
          aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-50 transition-colors"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
          <span>{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
          <span
            aria-hidden="true"
            className={`ml-auto relative w-9 h-5 rounded-full transition-colors ${isDark ? 'bg-brand-600' : 'bg-gray-700'}`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-gray-50 shadow transition-transform ${isDark ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
            />
          </span>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-50 transition-colors"
        >
          <LogOut size={18} />
          Cerrar Sesión
        </button>
        <p className="text-xs text-gray-400 px-3">v1.0.0</p>
      </div>
    </aside>
  );
}
