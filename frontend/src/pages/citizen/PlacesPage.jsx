import { useNavigate } from 'react-router-dom';
import { MapPin, Trash2, ArrowRight } from 'lucide-react';
import { usePlaces } from '../../hooks/usePlaces';

export function PlacesPage() {
  const { places, removePlace } = usePlaces();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-[100dvh] h-screen bg-surface-page overflow-hidden">
      <header className="bg-white pt-10 pb-4 px-5 border-b border-slate-200/80 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-brand-primary shrink-0" />
          <h1 className="text-xl font-bold text-ink-primary tracking-tight">
            Lugares
          </h1>
        </div>
        <p className="text-xs text-ink-muted font-medium mt-0.5">
          {places.length === 0
            ? 'Guarda paraderos y destinos frecuentes para llegar más rápido.'
            : `${places.length} ${places.length === 1 ? 'lugar guardado' : 'lugares guardados'}`}
        </p>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar p-5 space-y-4 max-w-xl mx-auto w-full pb-28">
        {places.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-slate-200/80 shadow-card space-y-3 animate-fade-in">
            <MapPin className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-ink-primary">
              Aún no tienes lugares guardados
            </h3>
            <p className="text-xs text-ink-muted">
              Guarda tu casa, el trabajo u otros destinos que visites seguido.
            </p>
            <button
              onClick={() => navigate('/mapa')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-brand-primary px-4 py-2 rounded-xl hover:bg-brand-primary-dark transition-colors"
            >
              Explorar el mapa
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          places.map((place) => (
            <div
              key={place.id}
              className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-card space-y-3 hover:shadow-raised hover:border-blue-200 transition-all duration-200"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand-primary flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink-primary text-sm leading-tight truncate">
                      {place.name}
                    </p>
                    {place.address && (
                      <p className="text-xs text-ink-muted mt-0.5 truncate">
                        {place.address}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removePlace(place.id)}
                  aria-label={`Quitar ${place.name} de lugares`}
                  className="p-2 rounded-xl text-slate-500 hover:text-state-error hover:bg-red-50 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => navigate('/mapa')}
                className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold text-brand-primary bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl border border-blue-200/60 transition-colors"
              >
                Ver en el mapa
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </main>
    </div>
  );
}
