import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapPin, Heart, Trash2, ArrowRight, Bookmark } from 'lucide-react';
import { usePlaces } from '../../hooks/usePlaces';
import { useFavorites } from '../../hooks/useFavorites';
import { useRoutes } from '../../contexts/RouteContext';

export function PlacesPage() {
  const { places, removePlace } = usePlaces();
  const { favorites, removeFavorite } = useFavorites();
  const { routes, selectRoute } = useRoutes();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') === 'rutas' ? 'rutas' : 'lugares';

  const handleTabChange = (tab) => {
    setSearchParams({ tab }, { replace: true });
  };

  const handleOpenRoute = (fav) => {
    const full =
      routes.find((r) => String(r.id) === String(fav.id)) || {
        id: fav.id,
        code: fav.code,
        name: fav.name,
        color: fav.color,
        fare: fav.fare,
        transportLineName: fav.transportLineName,
      };
    selectRoute(full);
    navigate(`/mapa/ruta/${fav.id}`);
  };

  return (
    <div className="flex flex-col h-[100dvh] h-screen bg-surface-page overflow-hidden">
      <header className="bg-white pt-10 pb-4 px-5 border-b border-slate-200/80 shrink-0 z-20 space-y-3.5">
        <div>
          <div className="flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-brand-primary shrink-0" />
            <h1 className="text-xl font-bold text-ink-primary tracking-tight">
              Lugares y Rutas Guardadas
            </h1>
          </div>
          <p className="text-xs text-ink-muted font-medium mt-0.5">
            Accede rápido a tus paraderos frecuentes y rutas favoritas.
          </p>
        </div>

        {/* Segmented Tabs: Mis Lugares | Rutas Favoritas */}
        <div
          className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl max-w-xl mx-auto"
          role="tablist"
          aria-label="Secciones guardadas"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'lugares'}
            onClick={() => handleTabChange('lugares')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'lugares'
                ? 'bg-white text-brand-primary shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Mis Lugares</span>
            <span
              className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === 'lugares'
                  ? 'bg-blue-50 text-brand-primary'
                  : 'bg-slate-200/80 text-slate-600'
              }`}
            >
              {places.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'rutas'}
            onClick={() => handleTabChange('rutas')}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'rutas'
                ? 'bg-white text-brand-primary shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Rutas Favoritas</span>
            <span
              className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                activeTab === 'rutas'
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-slate-200/80 text-slate-600'
              }`}
            >
              {favorites.length}
            </span>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar p-5 space-y-4 max-w-xl mx-auto w-full pb-28">
        {activeTab === 'lugares' ? (
          places.length === 0 ? (
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
                    className="relative p-2 rounded-xl text-slate-500 hover:text-state-error hover:bg-red-50 transition-colors shrink-0 after:absolute after:-inset-1.5 after:content-['']"
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
          )
        ) : favorites.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-slate-200/80 shadow-card space-y-3 animate-fade-in">
            <Heart className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-ink-primary">
              Aún no tienes rutas favoritas
            </h3>
            <p className="text-xs text-ink-muted">
              Toca el corazón en cualquier ruta para guardarla aquí y acceder rápido.
            </p>
            <button
              onClick={() => navigate('/rutas')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-brand-primary px-4 py-2 rounded-xl hover:bg-brand-primary-dark transition-colors"
            >
              Ver catálogo de rutas
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          favorites.map((fav) => (
            <div
              key={fav.id}
              className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-card space-y-3 hover:shadow-raised hover:border-blue-200 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="min-w-[3.5rem] h-9 text-white font-bold text-xs rounded-xl flex justify-center items-center shrink-0 uppercase tracking-wider"
                    style={{
                      backgroundColor: fav.color || 'var(--color-brand-primary)',
                    }}
                  >
                    {fav.code || <Heart className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink-primary text-sm leading-tight truncate">
                      {fav.name || 'Ruta guardada'}
                    </p>
                    {fav.transportLineName && (
                      <p className="text-xs text-ink-muted mt-0.5 truncate">
                        {fav.transportLineName}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removeFavorite(fav.id)}
                  aria-label={`Quitar ${fav.name || 'ruta'} de favoritos`}
                  className="relative p-2 rounded-xl text-slate-500 hover:text-state-error hover:bg-red-50 transition-colors shrink-0 after:absolute after:-inset-1.5 after:content-['']"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => handleOpenRoute(fav)}
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
