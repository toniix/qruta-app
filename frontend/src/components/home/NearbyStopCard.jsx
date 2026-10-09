import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Bus } from 'lucide-react';
import { useRoutes } from '../../contexts/RouteContext';
import { formatDistance } from '../../utils/geoUtils';
import { getRoutePalette } from '../../utils/routeUtils';
import { StopRoutesModal } from './StopRoutesModal';

/** A single nearby stop card showing the stop name + routes that pass through */
export function NearbyStopCard({ stop, routes, distanceKm }) {
  const navigate = useNavigate();
  const { selectRoute } = useRoutes();
  const [activeModalStop, setActiveModalStop] = useState(null);

  // Find routes that have this stop
  const matchingRoutes = routes
    .filter((r) => r.stops?.some((s) => s.id === stop.id))
    .slice(0, 3);

  return (
    <>
      <div
        onClick={() => setActiveModalStop(stop)}
        className="bg-white rounded-2xl p-5 shadow-card border border-slate-100 animate-slide-in-bottom cursor-pointer hover:border-blue-200 transition-all group"
      >
        {/* Stop header */}
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-50">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-slate-900 text-base leading-tight pr-2 group-hover:text-blue-600 transition-colors truncate">
              {stop.name}
            </h3>
            {(stop.reference || stop.address) && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">
                Ref: {stop.reference || stop.address}
              </p>
            )}
          </div>

          {distanceKm != null && (
            <div className="flex items-center gap-1.5 text-blue-600 text-sm font-bold shrink-0 bg-blue-50 px-3 py-1 rounded-full border border-blue-200/50">
              <span>{formatDistance(distanceKm)}</span>
              <ChevronRight className="w-4 h-4 text-blue-500" />
            </div>
          )}
        </div>

        {/* Routes at this stop */}
        <div className="space-y-3">
          {matchingRoutes.length === 0 ? (
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Ver rutas del paradero</span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </div>
          ) : (
            matchingRoutes.map((route, idx) => {
              const { bg } = getRoutePalette(idx);
              return (
                <div
                  key={route.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectRoute(route);
                    navigate(`/mapa/ruta/${route.id}`);
                  }}
                  className="flex items-center justify-between w-full group/btn hover:bg-slate-50 p-1.5 rounded-2xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-xl ${bg} text-white flex items-center justify-center shrink-0 shadow-2xs font-bold text-xs`}
                    >
                      {route.code || <Bus className="w-4 h-4" />}
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <p className="font-bold text-slate-800 text-sm leading-tight group-hover/btn:text-blue-600 transition-colors truncate">
                        {route.name.replace(/^Ruta \w+:\s*/i, '')}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {route.origin} → {route.destination}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-xs font-bold text-slate-500">{route.fare || 'S/ 2.00'}</span>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover/btn:text-slate-700 transition-colors" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Render StopRoutesModal when stop is clicked */}
      {activeModalStop && (
        <StopRoutesModal
          key={activeModalStop.id}
          stop={activeModalStop}
          onClose={() => setActiveModalStop(null)}
        />
      )}
    </>
  );
}
