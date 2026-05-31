import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  color?: 'green' | 'blue' | 'yellow' | 'red';
}

const colorMap = {
  green:  { bg: 'bg-brand-800/20', icon: 'text-brand-400', border: 'border-brand-800/40' },
  blue:   { bg: 'bg-blue-600/20',  icon: 'text-blue-400',  border: 'border-blue-600/40'  },
  yellow: { bg: 'bg-yellow-500/20',icon: 'text-yellow-400',border: 'border-yellow-500/40'},
  red:    { bg: 'bg-red-600/20',   icon: 'text-red-400',   border: 'border-red-600/40'   },
};

export default function KpiCard({ title, value, icon: Icon, trend, color = 'green' }: KpiCardProps) {
  const c = colorMap[color];
  return (
    <div className={`bg-gray-900 border ${c.border} rounded-xl p-5 shadow-glow flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400 font-medium">{title}</span>
        <div className={`${c.bg} p-2 rounded-lg`}>
          <Icon size={18} className={c.icon} />
        </div>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      {trend && <p className="text-xs text-gray-500">{trend}</p>}
    </div>
  );
}
