import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  colorScheme = 'blue',
  to,
  onClick,
}) {
  const schemes = {
    blue: {
      iconBg: 'bg-blue-50 text-blue-600 border-blue-100',
      accent: 'border-l-blue-600',
    },
    emerald: {
      iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      accent: 'border-l-emerald-600',
    },
    amber: {
      iconBg: 'bg-amber-50 text-amber-600 border-amber-100',
      accent: 'border-l-amber-500',
    },
    purple: {
      iconBg: 'bg-purple-50 text-purple-600 border-purple-100',
      accent: 'border-l-purple-600',
    },
    rose: {
      iconBg: 'bg-rose-50 text-rose-600 border-rose-100',
      accent: 'border-l-rose-600',
    },
  };

  const scheme = schemes[colorScheme] || schemes.blue;

  const content = (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card transition-all duration-200 hover:shadow-raised hover:border-slate-300 border-l-4 ${scheme.accent} flex flex-col justify-between`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 tabular-nums">
              {value}
            </span>
          </div>
        </div>

        {Icon && (
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${scheme.iconBg} transition-transform duration-200 group-hover:scale-105`}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="mt-3.5 flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
        <span className="text-slate-500 truncate font-medium">{subtitle}</span>
        {to && (
          <span className="inline-flex items-center text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform">
            Ver más
            <ArrowUpRight className="ml-0.5 h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block focus:outline-none">
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left focus:outline-none">
        {content}
      </button>
    );
  }

  return content;
}
