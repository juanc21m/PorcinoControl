import { NavLink } from 'react-router-dom';
import { LayoutDashboard, GitBranch, DollarSign, Database, PiggyBank, Package, Workflow, Contact } from 'lucide-react';

const links = [
  { to: '/',            label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/traceability',label: 'Trazabilidad',   icon: GitBranch },
  { to: '/etapas',      label: 'Etapas',          icon: Workflow },
  { to: '/inventory',   label: 'Inventario',      icon: Package },
  { to: '/finances',    label: 'Finanzas',        icon: DollarSign },
  { to: '/contacts',    label: 'Contactos',       icon: Contact },
  { to: '/portal',      label: 'DB Portal',       icon: Database },
];

export default function Navbar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-gray-900 border-r border-gray-800 flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800">
        <div className="w-9 h-9 rounded-full bg-brand-800 flex items-center justify-center shadow-glow">
          <PiggyBank size={20} className="text-white" />
        </div>
        <span className="text-white font-bold text-lg tracking-tight">PorciControl</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
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

      <div className="px-4 py-3 border-t border-gray-800">
        <p className="text-xs text-gray-600">v1.0.0 — Demo</p>
      </div>
    </aside>
  );
}
