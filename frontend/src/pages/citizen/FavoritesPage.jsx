import { useNavigate } from 'react-router-dom';
import { Heart, Trash2, ArrowRight } from 'lucide-react';
import { useFavorites } from '../../hooks/useFavorites';
import { useRoutes } from '../../contexts/RouteContext';

export function FavoritesPage() {
  const { favorites, removeFavorite } = useFavorites();
  const { routes, selectRoute } = useRoutes();
  const navigate = useNavigate();

  const handleOpen = (fav) => {
    const full =
      routes.find((r) => String(r.id) === String(fav.id)) ||
      { id: fav.id, code: fav.code, name: fav.name, color: fav.color, fare: fav.fare, transportLineName: fav.transportLineName };
    selectRoute(full);
    navigate(`/mapa/ruta/${fav.id}`);
  };

  return (
    <div className="flex flex-col h-[100dvh] h-screen bg-surface-page overflow-hidden">
      <header className="bg-white pt-10 pb-4 px-5 border-b border-slate-200/80 shrink-0 z-20">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-brand-primary shrink-0" />
          <h1 className="text-xl font-bold text-ink-primary tracking-tight">
            Favoritos
          </h1>
        </div>
        <p className="text-xs text-ink-muted font-medium mt-0.5">
          {favorites.length === 0
            ? 'Guarda las rutas que más usas para acceder rápido.'
            : `${favorites.length} ${favorites.length === 1 ? 'ruta guardada' : 'rutas guardadas'}`}
        </p>
      </header>

      <main className="flex-1 overflow-y-auto hide-scrollbar p-5 space-y-4 max-w-xl mx-auto w-full pb-28">
        {favorites.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-slate-200/80 shadow-card space-y-3 animate-fade-in">
            <Heart className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-ink-primary">
              Aún no tienes favoritos
            </h3>
            <p className="text-xs text-ink-muted">
              Toca el corazón en cualquier ruta para guardarla aquí.
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
                    style={{ backgroundColor: fav.color || 'var(--color-brand-primary)' }}
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
                  className="p-2 rounded-xl text-slate-500 hover:text-state-error hover:bg-red-50 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => handleOpen(fav)}
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
