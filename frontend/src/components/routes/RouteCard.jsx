import { useState } from 'react';
import { ArrowRight, Clock, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { useRoutes } from '../../contexts/RouteContext';

export function RouteCard({ route }) {
  const { selectedRoute, selectedStop, selectRoute, selectStop } = useRoutes();
  const [isStopsExpanded, setIsStopsExpanded] = useState(false);

  const isSelected = selectedRoute?.id === route.id;

  const handleToggleStopsDropdown = (e) => {
    e.stopPropagation(); // Prevent opening full RouteDrawer
    setIsStopsExpanded((prev) => !prev);
  };

  const handleStopClick = (e, stop) => {
    e.stopPropagation();
    selectRoute(route);
    selectStop(stop);
  };

  return (
    <div
      onClick={() => selectRoute(route)}
      className={`p-4 rounded-2xl cursor-pointer transition-all border ${
        isSelected
          ? 'bg-blue-50/80 border-blue-500 shadow-md ring-2 ring-blue-500/20 scale-[1.01]'
          : 'bg-white border-slate-200/90 hover:border-blue-300 hover:shadow-xs'
      }`}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="w-3.5 h-3.5 rounded-full inline-block shadow-2xs"
            style={{ backgroundColor: route.lineColor || '#2563eb' }}
          />
          <span className="font-bold text-sm text-slate-900">{route.code}</span>
          <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
            {route.lineCode}
          </span>
        </div>
        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
          {route.fare}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-slate-900 text-sm mb-2.5 line-clamp-1">
        {route.name}
      </h3>

      {/* Itinerary Flow */}
      <div className="flex items-center gap-2 text-xs text-slate-600 mb-3 bg-slate-50/80 p-2 rounded-xl border border-slate-100">
        <div className="flex items-center gap-1 font-medium truncate">
          <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
          <span className="truncate">{route.origin}</span>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
        <div className="flex items-center gap-1 font-medium truncate">
          <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span className="truncate">{route.destination}</span>
        </div>
      </div>

      {/* Meta Footer */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>{route.schedule}</span>
        </div>

        {/* Interactive Key Points Dropdown Toggle Pill */}
        <button
          type="button"
          onClick={handleToggleStopsDropdown}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl font-bold transition-all ${
            isStopsExpanded
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200/60'
          }`}
          title="Ver puntos clave del recorrido"
        >
          <span>{route.stops?.length || 0} puntos clave</span>
          {isStopsExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Inline Key Points Dropdown List */}
      {isStopsExpanded && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="mt-3 pt-3 border-t border-blue-100/80 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Puntos clave del recorrido</span>
            <span className="text-blue-600 font-medium normal-case">Toca para ver en mapa</span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {route.stops?.map((stop, idx) => {
              const isStopActive = selectedStop?.id === stop.id;
              return (
                <div
                  key={`${stop.id}-${idx}`}
                  onClick={(e) => handleStopClick(e, stop)}
                  className={`p-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition-all border ${
                    isStopActive
                      ? 'bg-amber-50 border-amber-400 font-semibold text-slate-900 shadow-2xs'
                      : 'bg-slate-50/70 border-slate-100 hover:bg-blue-50 hover:border-blue-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="font-semibold text-xs leading-snug truncate">{stop.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{stop.address}</p>
                    </div>
                  </div>
                  {stop.isAccessible && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex-shrink-0 ml-1">
                      ♿
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
