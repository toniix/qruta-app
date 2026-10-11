import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MessageSquare,
  Plus,
  ThumbsUp,
  MessageCircle,
  Trash2,
  Send,
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  Briefcase,
  Route as RouteIcon,
  User,
  X,
  Loader2,
  RefreshCw,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useRoutes } from '../../contexts/RouteContext';
import { useCommunityIdentity } from '../../hooks/useCommunityIdentity';
import {
  communityService,
  COMMUNITY_CATEGORIES,
  getCategoryMeta,
} from '../../services/communityService';
import { formatRelativeTime } from '../../utils/dateUtils';

const CATEGORY_ICONS = {
  ALERTA: AlertTriangle,
  PREGUNTA: HelpCircle,
  RECOMENDACION: Lightbulb,
  OBJETOS_PERDIDOS: Briefcase,
};

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function CommunityPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { routes, selectRoute } = useRoutes();
  const { alias, setAlias, hasAlias } = useCommunityIdentity();

  const routeFilterId = searchParams.get('routeId') || '';
  const initialCreateOpen = searchParams.get('compose') === '1';

  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Compose modal state
  const [showComposeModal, setShowComposeModal] = useState(initialCreateOpen);
  const [formAlias, setFormAlias] = useState(alias);
  const [formCategory, setFormCategory] = useState('ALERTA');
  const [formRouteId, setFormRouteId] = useState(routeFilterId);
  const [formContent, setFormContent] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);
  const [formError, setFormError] = useState(null);

  // Edit alias inline modal
  const [showAliasModal, setShowAliasModal] = useState(false);
  const [tempAlias, setTempAlias] = useState(alias);

  // Expanded comments per post: { [postId]: { open: boolean, loading: boolean, items: [], text: '', sending: boolean } }
  const [commentsMap, setCommentsMap] = useState({});

  const filteredRouteObj = useMemo(() => {
    if (!routeFilterId) return null;
    return routes.find((r) => String(r.id) === String(routeFilterId)) || null;
  }, [routeFilterId, routes]);

  const openComposeModal = useCallback(() => {
    setFormError(null);
    setFormAlias(alias);
    setFormRouteId(routeFilterId);
    setShowComposeModal(true);
  }, [alias, routeFilterId]);

  const handleCategoryChange = (catId) => {
    if (catId === selectedCategory) return;
    setLoading(true);
    setError(null);
    setSelectedCategory(catId);
  };

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await communityService.getPosts({
        category: selectedCategory === 'ALL' ? null : selectedCategory,
        routeId: routeFilterId || null,
      });
      setPosts(data);
    } catch (err) {
      console.error('Error al cargar publicaciones de la comunidad:', err);
      setError('No se pudieron cargar las publicaciones. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, routeFilterId]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const data = await communityService.getPosts({
          category: selectedCategory === 'ALL' ? null : selectedCategory,
          routeId: routeFilterId || null,
        });
        if (isMounted) {
          setPosts(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error al cargar publicaciones de la comunidad:', err);
          setError('No se pudieron cargar las publicaciones. Verifica tu conexión.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [selectedCategory, routeFilterId]);

  const handleClearRouteFilter = () => {
    setLoading(true);
    const next = new URLSearchParams(searchParams);
    next.delete('routeId');
    next.delete('compose');
    setSearchParams(next, { replace: true });
  };

  const handleOpenRouteOnMap = (post) => {
    if (!post.routeId) return;
    const matched = routes.find((r) => String(r.id) === String(post.routeId)) || {
      id: post.routeId,
      code: post.routeCode,
      name: post.routeName,
      color: post.routeColor,
    };
    selectRoute(matched);
    navigate(`/mapa/ruta/${post.routeId}`);
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    setFormError(null);

    const cleanAlias = (formAlias || '').trim();
    const cleanContent = (formContent || '').trim();

    if (cleanAlias.length < 2) {
      setFormError('Por favor ingresa un alias o nombre de al menos 2 letras.');
      return;
    }
    if (cleanContent.length < 4) {
      setFormError('Escribe un mensaje de al menos 4 caracteres.');
      return;
    }

    setSubmittingPost(true);
    try {
      setAlias(cleanAlias);
      const created = await communityService.createPost({
        authorAlias: cleanAlias,
        category: formCategory,
        content: cleanContent,
        routeId: formRouteId || null,
      });

      setPosts((prev) => [created, ...prev]);
      setFormContent('');
      setShowComposeModal(false);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.content ||
        'No se pudo publicar tu mensaje. Intenta nuevamente.';
      setFormError(msg);
    } finally {
      setSubmittingPost(false);
    }
  };

  const handleToggleLike = async (postId) => {
    try {
      const updated = await communityService.toggleLike(postId);
      setPosts((prev) =>
        prev.map((p) => (String(p.id) === String(postId) ? updated : p)),
      );
    } catch (err) {
      console.error('Error al actualizar reacción:', err);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('¿Deseas eliminar tu publicación?')) return;
    try {
      await communityService.deleteOwnPost(postId);
      setPosts((prev) => prev.filter((p) => String(p.id) !== String(postId)));
    } catch (err) {
      alert(
        err.response?.data?.message || 'No se pudo eliminar la publicación.',
      );
    }
  };

  const handleToggleComments = async (postId) => {
    const current = commentsMap[postId];
    if (current?.open) {
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: { ...prev[postId], open: false },
      }));
      return;
    }

    setCommentsMap((prev) => ({
      ...prev,
      [postId]: {
        open: true,
        loading: true,
        items: prev[postId]?.items || [],
        text: prev[postId]?.text || '',
        sending: false,
      },
    }));

    try {
      const items = await communityService.getComments(postId);
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: {
          ...prev[postId],
          open: true,
          loading: false,
          items,
        },
      }));
    } catch {
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: { ...prev[postId], loading: false },
      }));
    }
  };

  const handleCommentTextChange = (postId, text) => {
    setCommentsMap((prev) => ({
      ...prev,
      [postId]: { ...prev[postId], text },
    }));
  };

  const handleAddComment = async (e, postId) => {
    e.preventDefault();
    const state = commentsMap[postId];
    const cleanText = (state?.text || '').trim();
    if (cleanText.length < 2) return;

    let activeAlias = alias.trim();
    if (activeAlias.length < 2) {
      const prompted = window.prompt(
        'Ingresa tu nombre o alias para comentar en la comunidad:',
        '',
      );
      if (!prompted || prompted.trim().length < 2) return;
      activeAlias = prompted.trim();
      setAlias(activeAlias);
    }

    setCommentsMap((prev) => ({
      ...prev,
      [postId]: { ...prev[postId], sending: true },
    }));

    try {
      const created = await communityService.addComment(postId, {
        authorAlias: activeAlias,
        content: cleanText,
      });

      setCommentsMap((prev) => ({
        ...prev,
        [postId]: {
          ...prev[postId],
          sending: false,
          text: '',
          items: [...(prev[postId]?.items || []), created],
        },
      }));

      setPosts((prev) =>
        prev.map((p) =>
          String(p.id) === String(postId)
            ? { ...p, commentsCount: (p.commentsCount || 0) + 1 }
            : p,
        ),
      );
    } catch (err) {
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: { ...prev[postId], sending: false },
      }));
      alert(
        err.response?.data?.message || 'No se pudo enviar el comentario.',
      );
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      await communityService.deleteOwnComment(commentId);
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: {
          ...prev[postId],
          items: (prev[postId]?.items || []).filter(
            (c) => String(c.id) !== String(commentId),
          ),
        },
      }));
      setPosts((prev) =>
        prev.map((p) =>
          String(p.id) === String(postId)
            ? { ...p, commentsCount: Math.max(0, (p.commentsCount || 1) - 1) }
            : p,
        ),
      );
    } catch (err) {
      alert(
        err.response?.data?.message || 'No se pudo eliminar el comentario.',
      );
    }
  };

  const handleSaveAlias = (e) => {
    e.preventDefault();
    if (tempAlias.trim().length >= 2) {
      setAlias(tempAlias.trim());
      setShowAliasModal(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] h-screen bg-surface-page overflow-hidden">
      {/* ── Top Header ──────────────────────────────────────────────────── */}
      <header className="bg-white pt-10 pb-3.5 px-5 border-b border-slate-200/80 shrink-0 z-20 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-brand-primary shrink-0" />
              <h1 className="text-xl font-bold text-ink-primary tracking-tight">
                Comunidad RutaYa
              </h1>
            </div>
            <p className="text-xs text-ink-muted font-medium mt-0.5">
              Alertas en vivo, consultas y reportes entre pasajeros.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setTempAlias(alias);
                setShowAliasModal(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl transition-colors max-w-[140px] truncate"
              title="Cambiar mi alias público"
            >
              <User className="w-3.5 h-3.5 text-brand-primary shrink-0" />
              <span className="truncate">
                {hasAlias ? alias : 'Elegir alias'}
              </span>
            </button>

            <button
              type="button"
              onClick={openComposeModal}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-brand-primary hover:bg-brand-primary-dark px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Publicar</span>
            </button>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-0.5">
          <button
            type="button"
            onClick={() => handleCategoryChange('ALL')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all shrink-0 ${
              selectedCategory === 'ALL'
                ? 'bg-brand-primary text-white border-brand-primary shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Todos
          </button>

          {COMMUNITY_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id] || MessageSquare;
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryChange(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all shrink-0 ${
                  active
                    ? cat.activeChipClass
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.shortLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Active Route Filter Banner */}
        {routeFilterId && (
          <div className="flex items-center justify-between gap-2 bg-blue-50/90 border border-blue-200/80 rounded-xl px-3 py-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <RouteIcon className="w-4 h-4 text-brand-primary shrink-0" />
              <span className="text-slate-700 truncate">
                Filtrando por ruta:{' '}
                <strong className="text-slate-900">
                  {filteredRouteObj
                    ? `${filteredRouteObj.code} - ${filteredRouteObj.name}`
                    : 'Ruta seleccionada'}
                </strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearRouteFilter}
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-primary hover:text-brand-primary-dark shrink-0"
            >
              <X className="w-3.5 h-3.5" />
              <span>Ver todas</span>
            </button>
          </div>
        )}
      </header>

      {/* ── Feed Content ────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto hide-scrollbar p-4 sm:p-5 space-y-4 max-w-2xl mx-auto w-full pb-28">
        {/* Quick Prompt Banner */}
        <button
          type="button"
          onClick={openComposeModal}
          className="w-full bg-white rounded-2xl p-3.5 border border-slate-200/80 shadow-card flex items-center gap-3 text-left hover:border-blue-300 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand-primary flex items-center justify-center font-bold text-xs shrink-0">
            {hasAlias ? getInitials(alias) : <Sparkles className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-500 truncate">
              ¿Hay tráfico, desvío o buscas qué ruta tomar hoy?
            </p>
            <p className="text-[11px] text-brand-primary font-bold mt-0.5">
              Toca aquí para compartir con otros pasajeros →
            </p>
          </div>
        </button>

        {loading ? (
          <div className="space-y-3 py-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-2xl p-4 border border-slate-200/70 shadow-card space-y-3 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-200" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 bg-slate-200 rounded w-1/3" />
                    <div className="h-2.5 bg-slate-100 rounded w-1/4" />
                  </div>
                </div>
                <div className="h-12 bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-rose-200 shadow-card space-y-3">
            <AlertTriangle className="w-7 h-7 text-rose-500 mx-auto" />
            <p className="text-xs font-semibold text-slate-700">{error}</p>
            <button
              type="button"
              onClick={fetchPosts}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary bg-blue-50 px-3.5 py-2 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reintentar
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/80 shadow-card space-y-3 animate-fade-in">
            <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-ink-primary">
              Aún no hay publicaciones en esta sección
            </h3>
            <p className="text-xs text-ink-muted max-w-xs mx-auto">
              Sé el primero en compartir una alerta de ruta, recomendación o pregunta con la comunidad.
            </p>
            <button
              type="button"
              onClick={openComposeModal}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-brand-primary px-4 py-2.5 rounded-xl hover:bg-brand-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              Crear primera publicación
            </button>
          </div>
        ) : (
          posts.map((post) => {
            const catMeta = getCategoryMeta(post.category);
            const CatIcon = CATEGORY_ICONS[post.category] || MessageSquare;
            const commentState = commentsMap[post.id] || {
              open: false,
              loading: false,
              items: [],
              text: '',
              sending: false,
            };

            return (
              <article
                key={post.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-card space-y-3 transition-all hover:border-slate-300"
              >
                {/* Post Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200/80">
                      {getInitials(post.authorAlias)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {post.authorAlias}
                        </span>
                        {post.ownedByMe && (
                          <span className="text-[10px] font-bold bg-blue-50 text-brand-primary px-1.5 py-0.5 rounded-md border border-blue-200/60">
                            Tú
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {formatRelativeTime(post.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${catMeta.badgeClass}`}
                    >
                      <CatIcon className="w-3 h-3" />
                      <span>{catMeta.label}</span>
                    </span>

                    {post.ownedByMe && (
                      <button
                        type="button"
                        onClick={() => handleDeletePost(post.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Eliminar mi publicación"
                        aria-label="Eliminar mi publicación"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Post Content */}
                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line break-words">
                  {post.content}
                </p>

                {/* Tagged Route Pill (Bidirectional link to Map) */}
                {post.routeId && (
                  <button
                    type="button"
                    onClick={() => handleOpenRouteOnMap(post)}
                    className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-2.5 bg-slate-50 hover:bg-blue-50/70 border border-slate-200/90 hover:border-blue-200 rounded-xl px-3 py-2 text-left transition-colors group"
                  >
                    <span
                      className="px-2 py-0.5 rounded-lg text-white font-bold text-[11px] uppercase tracking-wider shrink-0"
                      style={{
                        backgroundColor:
                          post.routeColor || 'var(--color-brand-primary)',
                      }}
                    >
                      {post.routeCode || 'Ruta'}
                    </span>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-brand-primary truncate">
                      {post.routeName || 'Ver recorrido en el mapa'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-primary shrink-0" />
                  </button>
                )}

                {/* Post Actions Bar: Like & Comments */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleToggleLike(post.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                      post.likedByMe
                        ? 'bg-blue-50 text-brand-primary border border-blue-200/80'
                        : 'text-slate-600 hover:bg-slate-100 border border-transparent'
                    }`}
                  >
                    <ThumbsUp
                      className="w-3.5 h-3.5"
                      fill={post.likedByMe ? 'currentColor' : 'none'}
                    />
                    <span>Útil</span>
                    {post.likesCount > 0 && (
                      <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-white/80 text-[11px]">
                        {post.likesCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleToggleComments(post.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      commentState.open
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>
                      {post.commentsCount > 0
                        ? `${post.commentsCount} ${post.commentsCount === 1 ? 'comentario' : 'comentarios'}`
                        : 'Comentar'}
                    </span>
                  </button>
                </div>

                {/* Expandable Comments Section */}
                {commentState.open && (
                  <div className="pt-2 space-y-3 border-t border-slate-100 animate-fade-in">
                    {commentState.loading ? (
                      <div className="flex items-center justify-center py-3 text-xs text-slate-500 gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />
                        <span>Cargando comentarios...</span>
                      </div>
                    ) : commentState.items.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-2">
                        Aún no hay respuestas. ¡Escribe el primer comentario!
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {commentState.items.map((comment) => (
                          <div
                            key={comment.id}
                            className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/60 flex items-start justify-between gap-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900">
                                  {comment.authorAlias}
                                </span>
                                {comment.ownedByMe && (
                                  <span className="text-[10px] font-bold text-brand-primary">
                                    • Tú
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400">
                                  {formatRelativeTime(comment.createdAt)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 mt-0.5 break-words">
                                {comment.content}
                              </p>
                            </div>
                            {comment.ownedByMe && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteComment(post.id, comment.id)
                                }
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                                title="Eliminar comentario"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Comment Form */}
                    <form
                      onSubmit={(e) => handleAddComment(e, post.id)}
                      className="flex items-center gap-2"
                    >
                      <input
                        type="text"
                        value={commentState.text || ''}
                        onChange={(e) =>
                          handleCommentTextChange(post.id, e.target.value)
                        }
                        maxLength={400}
                        placeholder={
                          hasAlias
                            ? `Responder como ${alias}...`
                            : 'Escribe una respuesta...'
                        }
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-primary px-3 py-2 text-xs text-slate-900 outline-none transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={
                          commentState.sending ||
                          !(commentState.text || '').trim()
                        }
                        className="p-2 rounded-xl bg-brand-primary text-white hover:bg-brand-primary-dark disabled:opacity-50 transition-colors shrink-0"
                        aria-label="Enviar comentario"
                      >
                        {commentState.sending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </form>
                  </div>
                )}
              </article>
            );
          })
        )}
      </main>

      {/* ── Compose New Post Modal ──────────────────────────────────────── */}
      {showComposeModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="compose-modal-title"
        >
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-overlay border border-slate-200/80 p-5 space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-brand-primary" />
                <h2
                  id="compose-modal-title"
                  className="text-base font-bold text-slate-900"
                >
                  Nueva publicación en Comunidad
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowComposeModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreatePost} className="space-y-4">
              {/* Author Alias */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                  Tu nombre o alias público *
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  maxLength={40}
                  value={formAlias}
                  onChange={(e) => setFormAlias(e.target.value)}
                  placeholder="Ej. Carlos Ica, Pasajero UNICA..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-primary outline-none"
                />
              </div>

              {/* Category Picker */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
                  Categoría *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {COMMUNITY_CATEGORIES.map((cat) => {
                    const Icon = CATEGORY_ICONS[cat.id] || MessageSquare;
                    const active = formCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setFormCategory(cat.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                          active
                            ? `${cat.badgeClass} ring-2 ring-brand-primary/20`
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Optional Route Tag */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                  Etiquetar Ruta (Opcional)
                </label>
                <select
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

              {/* Content Textarea */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    Mensaje *
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {formContent.length}/600
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  minLength={4}
                  maxLength={600}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Comparte el estado del tráfico, pregunta qué línea tomar o deja una recomendación útil..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-sm text-slate-900 focus:border-brand-primary outline-none resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingPost}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white text-xs font-bold shadow-xs disabled:opacity-60"
                >
                  {submittingPost ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Publicar ahora</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Quick Alias Modal ───────────────────────────────────────────── */}
      {showAliasModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveAlias}
            className="bg-white w-full max-w-sm rounded-2xl shadow-overlay border border-slate-200 p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Tu alias en la Comunidad
              </h3>
              <button
                type="button"
                onClick={() => setShowAliasModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Se guarda en este dispositivo sin necesidad de crear cuenta ni contraseña.
            </p>
            <input
              type="text"
              required
              minLength={2}
              maxLength={40}
              value={tempAlias}
              onChange={(e) => setTempAlias(e.target.value)}
              placeholder="Ej. Carlos Ica"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-primary outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAliasModal(false)}
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
      )}
    </div>
  );
}
