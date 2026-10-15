import { MessageSquare, X, AlertTriangle, Send, Loader2 } from 'lucide-react';
import { COMMUNITY_CATEGORIES } from '../../services/communityService';

export function ComposeModal({
  open,
  formAlias,
  setFormAlias,
  formCategory,
  setFormCategory,
  formRouteId,
  setFormRouteId,
  formContent,
  setFormContent,
  honeypot,
  setHoneypot,
  formError,
  submitting,
  cooldownRemaining = 0,
  routes,
  firstFieldRef,
  categoryIcons,
  onClose,
  onSubmit,
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compose-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-overlay border border-slate-200/80 p-5 space-y-4 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-primary" aria-hidden="true" />
            <h2 id="compose-modal-title" className="text-base font-bold text-slate-900">
              Nueva publicación en Comunidad
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="relative p-1.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 after:absolute after:-inset-1.5 after:content-['']"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {formError && (
          <div
            role="alert"
            className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs font-semibold flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="sr-only" aria-live="polite">
            Publicación sin cuenta: tu alias se guarda solo en este dispositivo.
          </div>
          <div>
            <label
              htmlFor="community-alias"
              className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1"
            >
              Tu nombre o alias público *
            </label>
            <input
              id="community-alias"
              ref={firstFieldRef}
              type="text"
              required
              minLength={2}
              maxLength={40}
              autoComplete="nickname"
              value={formAlias}
              onChange={(e) => setFormAlias(e.target.value)}
              placeholder="Ej. Carlos Ica, Pasajero UNICA..."
              aria-invalid={Boolean(formError)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-primary outline-none"
            />
          </div>

          <div>
            <span
              id="community-category-label"
              className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1.5"
            >
              Categoría *
            </span>
            <div
              className="grid grid-cols-2 gap-2"
              role="group"
              aria-labelledby="community-category-label"
            >
              {COMMUNITY_CATEGORIES.map((cat) => {
                const Icon = categoryIcons[cat.id] || MessageSquare;
                const active = formCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormCategory(cat.id)}
                    aria-pressed={active}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${
                      active
                        ? `${cat.badgeClass} ring-2 ring-brand-primary/20`
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="community-route"
              className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1"
            >
              Etiquetar Ruta (Opcional)
            </label>
            <select
              id="community-route"
              value={formRouteId}
              onChange={(e) => setFormRouteId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-brand-primary outline-none"
            >
              <option value="">— Ninguna ruta en específico —</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  [{r.code}] {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label
                htmlFor="community-content"
                className="block text-[11px] font-bold uppercase tracking-wide text-slate-500"
              >
                Mensaje *
              </label>
              <span className="text-[11px] text-slate-500" aria-live="polite">
                {formContent.length}/600
              </span>
            </div>
            <textarea
              id="community-content"
              rows={4}
              required
              minLength={4}
              maxLength={600}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              placeholder="Comparte el estado del tráfico, pregunta qué línea tomar o deja una recomendación útil..."
              aria-describedby="community-content-hint"
              className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 focus:border-brand-primary outline-none resize-none"
            />
            <p id="community-content-hint" className="sr-only">
              Máximo 600 caracteres. Sé claro y respetuoso.
            </p>
            {/* Honeypot anti-spam: los humanos no lo ven ni lo completan */}
            <input
              type="text"
              name="website"
              autoComplete="off"
              tabIndex={-1}
              aria-hidden="true"
              value={honeypot || ''}
              onChange={(e) => setHoneypot(e.target.value)}
              className="hidden"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white text-xs font-bold shadow-xs disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="w-4 h-4" aria-hidden="true" />
              )}
              <span>Publicar ahora</span>
            </button>
          </div>
          {cooldownRemaining > 0 && (
            <p role="status" className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/70 rounded-lg px-2.5 py-1.5">
              Publicaste hace muy poco. Podrás publicar de nuevo en {cooldownRemaining}s.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export function AliasModal({
  open,
  tempAlias,
  setTempAlias,
  aliasError,
  inputRef,
  pendingComment,
  onClose,
  onSubmit,
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="alias-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={onSubmit}
        className="bg-white w-full max-w-sm rounded-2xl shadow-overlay border border-slate-200 p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 id="alias-modal-title" className="text-sm font-bold text-slate-900">
            Tu alias en la Comunidad
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="relative p-1 text-slate-500 hover:text-slate-600 after:absolute after:-inset-3 after:content-['']"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Se guarda en este dispositivo sin necesidad de crear cuenta ni contraseña.
          {pendingComment ? ' Después de guardar podrás reintentar tu comentario.' : ''}
          Si borrás los datos del navegador, perdés tus publicaciones asociadas a este
          dispositivo.
        </p>
        {aliasError && (
          <div
            role="alert"
            className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs font-semibold flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{aliasError}</span>
          </div>
        )}
        <label htmlFor="community-temp-alias" className="sr-only">
          Tu alias público
        </label>
        <input
          id="community-temp-alias"
          ref={inputRef}
          type="text"
          required
          minLength={2}
          maxLength={40}
          autoComplete="nickname"
          value={tempAlias}
          onChange={(e) => setTempAlias(e.target.value)}
          placeholder="Ej. Carlos Ica"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-primary outline-none"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-brand-primary text-white text-xs font-bold"
          >
            Guardar alias
          </button>
        </div>
      </form>
    </div>
  );
}
