import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MessageSquare,
  Plus,
  AlertTriangle,
  HelpCircle,
  Lightbulb,
  Briefcase,
  Route as RouteIcon,
  User,
  X,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useRoutes } from '../../contexts/RouteContext';
import { useCommunityIdentity } from '../../hooks/useCommunityIdentity';
import {
  communityService,
  COMMUNITY_CATEGORIES,
  getCategoryMeta,
} from '../../services/communityService';
import { ConfirmDialog } from '../../components/admin/common/ConfirmDialog';
import { MemoPostCard } from '../../components/community/PostCard';
import {
  aliasSchema,
  communityCommentSchema,
  communityPostSchema,
  validateWith,
} from '../../schemas';
import {
  ComposeModal,
  AliasModal,
} from '../../components/community/CommunityModals';

const COMPOSE_DRAFT_KEY = 'rutasya:compose-draft';

function readComposeDraft() {
  try {
    return localStorage.getItem(COMPOSE_DRAFT_KEY) || '';
  } catch {
    return '';
  }
}

const CATEGORY_ICONS = {
  ALERTA: AlertTriangle,
  PREGUNTA: HelpCircle,
  RECOMENDACION: Lightbulb,
  OBJETOS_PERDIDOS: Briefcase,
};

const PAGE_SIZE = 20;
// Mismo valor que el backend (CommunityService.COOLDOWN_MS): publicar o comentar
// dos veces seguidas dentro de esta ventana da 400. Lo reflejamos en UI para
// avisar antes de pegar a la API.
const PUBLISH_COOLDOWN_MS = 8_000;

// Caché SWR en memoria (vive mientras el SPA está montado): entrar a Comunidad
// pinta instantáneo y revalida en segundo plano. TTL corto para no mostrar
// likes/counts viejos. Sin login no hay usuario, la clave es filtro+orden.
const FEED_CACHE_TTL_MS = 60_000;
const feedCache = new Map();
function feedCacheKey(category, routeId, sort) {
  return `${category || 'ALL'}|${routeId || ''}|${sort || 'recent'}`;
}
function readFeedCache(key) {
  const hit = feedCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > FEED_CACHE_TTL_MS) {
    feedCache.delete(key);
    return null;
  }
  return hit;
}
function writeFeedCache(key, entry) {
  // Guardamos solo la primera página + estado; el scroll infinito pide el resto
  feedCache.set(key, { ...entry, ts: Date.now() });
  if (feedCache.size > 20) {
    const oldest = feedCache.keys().next().value;
    feedCache.delete(oldest);
  }
}
function invalidateFeedCache() {
  // Crear/borrar cambia el feed: la próxima entrada refetchea (los likes quedan
  // stale como máximo 60s, compromiso aceptado para no perder el instant paint)
  feedCache.clear();
}

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
  const [sortOrder, setSortOrder] = useState('recent');
  const [mineOnly, setMineOnly] = useState(false);
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [error, setError] = useState(null);

  // Compose modal state
  const [showComposeModal, setShowComposeModal] = useState(initialCreateOpen);
  const [formAlias, setFormAlias] = useState(alias);
  const [formCategory, setFormCategory] = useState('ALERTA');
  const [formRouteId, setFormRouteId] = useState(routeFilterId);
  const [formContent, setFormContent] = useState(readComposeDraft);
  const [honeypot, setHoneypot] = useState('');
  const [submittingPost, setSubmittingPost] = useState(false);
  const [formError, setFormError] = useState(null);

  // Keep the compose draft across navigation/refresh; cleared on successful post via setFormContent('')
  useEffect(() => {
    try {
      if (formContent) {
        localStorage.setItem(COMPOSE_DRAFT_KEY, formContent);
      } else {
        localStorage.removeItem(COMPOSE_DRAFT_KEY);
      }
    } catch {
      /* private mode or storage full — in-memory draft still works */
    }
  }, [formContent]);

  // Edit alias inline modal
  const [showAliasModal, setShowAliasModal] = useState(false);
  const [tempAlias, setTempAlias] = useState(alias);
  const [aliasError, setAliasError] = useState(null);

  // Expanded comments per post: { [postId]: { open: boolean, loading: boolean, items: [], text: '', sending: boolean } }
  const [commentsMap, setCommentsMap] = useState({});

  // Delete-post confirm dialog + inline action errors (replaces window.confirm/alert)
  const [deletePostTarget, setDeletePostTarget] = useState(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [actionError, setActionError] = useState(null);
  // Cooldown anti-spam visible: timestamp hasta el cual no se puede volver a publicar
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [nowTick, setNowTick] = useState(() => Date.now());
  // Post donde se intentó comentar durante el cooldown (feedback inline ahí mismo)
  const [commentBlockedPostId, setCommentBlockedPostId] = useState(null);
  // When commenting without alias, remember which post triggered the alias modal
  const [pendingCommentPostId, setPendingCommentPostId] = useState(null);
  const composeFirstFieldRef = useRef(null);
  const aliasInputRef = useRef(null);

  const cooldownRemaining = Math.max(
    0,
    Math.ceil((cooldownUntil - nowTick) / 1000),
  );
  const coolingDown = cooldownRemaining > 0;

  // Al terminar el cooldown se limpia el aviso inline del comentario.
  // Ajuste en fase de render (patrón documentado) en vez de setState en efecto.
  const [wasCoolingDown, setWasCoolingDown] = useState(coolingDown);
  if (wasCoolingDown && !coolingDown) {
    setWasCoolingDown(false);
    setCommentBlockedPostId(null);
  } else if (!wasCoolingDown && coolingDown) {
    setWasCoolingDown(true);
  }

  // Tick de 1s solo mientras dura el cooldown (para la cuenta regresiva)
  useEffect(() => {
    if (Date.now() >= cooldownUntil) return undefined;
    const t = setInterval(() => {
      const n = Date.now();
      if (n >= cooldownUntil) clearInterval(t);
      setNowTick(n);
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownUntil]);

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
    const hit = readFeedCache(
      feedCacheKey(catId === 'ALL' ? null : catId, routeFilterId || null, sortOrder),
    );
    if (hit) {
      setPosts(hit.posts);
      setPage(hit.page);
      setHasMore(hit.hasMore);
      setLoading(false);
    } else {
      setPosts([]);
      setPage(0);
      setHasMore(true);
    }
    setError(null);
    setSelectedCategory(catId);
  };

  const handleSortChange = (next) => {
    if (next === sortOrder) return;
    const hit = readFeedCache(
      feedCacheKey(
        selectedCategory === 'ALL' ? null : selectedCategory,
        routeFilterId || null,
        next,
      ),
    );
    if (hit) {
      setPosts(hit.posts);
      setPage(hit.page);
      setHasMore(hit.hasMore);
      setLoading(false);
    } else {
      setPosts([]);
      setPage(0);
      setHasMore(true);
    }
    setError(null);
    setSortOrder(next);
  };

  const loadPage = useCallback(async (targetPage, { initial = false, signal, revalidate = false } = {}) => {
    if (revalidate) {
      setIsRevalidating(true);
    } else if (initial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    if (!revalidate) setError(null);
    let cancelled = false;
    try {
      const data = await communityService.getPosts(
        {
          category: selectedCategory === 'ALL' ? null : selectedCategory,
          routeId: routeFilterId || null,
          limit: PAGE_SIZE,
          page: targetPage,
          sort: sortOrder,
        },
        signal ? { signal } : undefined,
      );
      const key = feedCacheKey(
        selectedCategory === 'ALL' ? null : selectedCategory,
        routeFilterId || null,
        sortOrder,
      );
      if (targetPage === 0) {
        setPosts(data);
        setPage(0);
        const more = data.length >= PAGE_SIZE;
        setHasMore(more);
        writeFeedCache(key, { posts: data, page: 0, hasMore: more });
      } else {
        setPosts((prev) => {
          const merged = [...prev, ...data];
          writeFeedCache(key, {
            posts: merged.slice(0, PAGE_SIZE),
            page: 0,
            hasMore: true,
          });
          return merged;
        });
        setPage(targetPage);
        setHasMore(data.length >= PAGE_SIZE);
      }
    } catch (err) {
      if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') {
        // Request abortado por uno más nuevo: NO tocar loading, el request vivo manda
        cancelled = true;
        return;
      }
      console.error('Error al cargar publicaciones de la comunidad:', err);
      // En revalidación silenciosa no pisamos el feed con error, solo avisamos
      if (!revalidate) {
        setError('No se pudieron cargar las publicaciones. Verifica tu conexión.');
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
        setLoadingMore(false);
        setIsRevalidating(false);
      }
    }
  }, [selectedCategory, routeFilterId, sortOrder]);

  const fetchPosts = useCallback(
    (signal) => loadPage(0, { initial: true, signal }),
    [loadPage],
  );

  // Clave del feed según los filtros actuales.
  const feedKey = feedCacheKey(
    selectedCategory === 'ALL' ? null : selectedCategory,
    routeFilterId || null,
    sortOrder,
  );

  // Hidratación instantánea desde caché en fase de render (stale-while-revalidate):
  // pinta sin flash y evita setState sincrónico dentro del efecto.
  const [paintedFeedKey, setPaintedFeedKey] = useState(null);
  if (paintedFeedKey !== feedKey) {
    setPaintedFeedKey(feedKey);
    const cached = readFeedCache(feedKey);
    if (cached) {
      setPosts(cached.posts);
      setPage(cached.page);
      setHasMore(cached.hasMore);
      setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    // Envoltorio async: los setState ocurren en continuaciones async, no en el cuerpo del efecto.
    (async () => {
      const cached = readFeedCache(feedKey);
      if (cached) {
        // Revalidamos en segundo plano sin pisar lo ya pintado
        await loadPage(0, { revalidate: true, signal: controller.signal });
      } else {
        await loadPage(0, { initial: true, signal: controller.signal });
      }
    })();
    return () => controller.abort();
  }, [loadPage, feedKey]);

  // Scroll infinito: cuando el centinela entra en vista, pide la siguiente página
  const sentinelRef = useRef(null);
  useEffect(() => {
    if (!hasMore || loading || loadingMore || error) return undefined;
    const el = sentinelRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadPage(page + 1);
        }
      },
      { rootMargin: '400px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, error, page, loadPage]);

  const visiblePosts = useMemo(() => {
    if (!mineOnly) return posts;
    return posts.filter((p) => p.ownedByMe);
  }, [posts, mineOnly]);

  const handleClearRouteFilter = () => {
    setPosts([]);
    setPage(0);
    setHasMore(true);
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
    navigate(`/mapa/ruta/${post.routeId}`, { state: { from: "/comunidad" } });
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    setFormError(null);

    const result = validateWith(communityPostSchema, {
      authorAlias: (formAlias || '').trim(),
      category: formCategory,
      content: (formContent || '').trim(),
      routeId: formRouteId || null,
    });
    if (!result.ok) {
      setFormError(Object.values(result.fieldErrors)[0]);
      return;
    }
    if (coolingDown) {
      setFormError(
        `Publicaste hace muy poco. Esperá ${cooldownRemaining}s antes de publicar de nuevo.`,
      );
      return;
    }

    const cleanAlias = result.data.authorAlias;
    const cleanContent = result.data.content;

    setSubmittingPost(true);
    try {
      setAlias(cleanAlias);
      const created = await communityService.createPost({
        authorAlias: cleanAlias,
        category: formCategory,
        content: cleanContent,
        routeId: formRouteId || null,
        website: honeypot,
      });

      // Nuevo post primero; si hay paginación activa, igual aparece arriba sin recargar
      setPosts((prev) => [created, ...prev]);
      invalidateFeedCache();
      setMineOnly(false);
      setFormContent('');
      setCooldownUntil(Date.now() + PUBLISH_COOLDOWN_MS);
      setNowTick(Date.now());
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
      setActionError(
        err.response?.data?.message || 'No se pudo registrar tu reacción. Intenta de nuevo.',
      );
    }
  };

  const handleDeletePost = async (postId) => {
    setDeletingPost(true);
    try {
      await communityService.deleteOwnPost(postId);
      setPosts((prev) => prev.filter((p) => String(p.id) !== String(postId)));
      invalidateFeedCache();
      setDeletePostTarget(null);
    } catch (err) {
      setActionError(
        err.response?.data?.message || 'No se pudo eliminar la publicación.',
      );
    } finally {
      setDeletingPost(false);
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

  const sendComment = async (postId, aliasToUse) => {
    const state = commentsMap[postId];
    const cleanText = (state?.text || '').trim();
    const result = validateWith(communityCommentSchema, {
      authorAlias: aliasToUse,
      content: cleanText,
    });
    if (!result.ok) {
      setActionError(Object.values(result.fieldErrors)[0]);
      return;
    }

    setCommentsMap((prev) => ({
      ...prev,
      [postId]: { ...prev[postId], sending: true },
    }));

    try {
      const created = await communityService.addComment(postId, {
        authorAlias: aliasToUse,
        content: cleanText,
        website: '',
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
      /* eslint-disable react-hooks/purity -- Timestamps de cooldown: Date.now es impuro a propósito; esto corre en un handler tras acción del usuario, nunca durante el render. */
      setCooldownUntil(Date.now() + PUBLISH_COOLDOWN_MS);
      setNowTick(Date.now());
      /* eslint-enable react-hooks/purity */
      setCommentBlockedPostId(null);
    } catch (err) {
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: { ...prev[postId], sending: false },
      }));
      setActionError(
        err.response?.data?.message || 'No se pudo enviar el comentario.',
      );
    }
  };

  const handleAddComment = async (e, postId) => {
    e.preventDefault();
    const activeAlias = alias.trim();
    if (activeAlias.length < 2) {
      // Sin prompt nativo: abrimos el modal de alias accesible y retomamos al guardar
      setTempAlias('');
      setPendingCommentPostId(postId);
      setShowAliasModal(true);
      return;
    }
    if (coolingDown) {
      // Feedback inline junto al input, no un banner lejos del botón
      setCommentBlockedPostId(postId);
      return;
    }
    await sendComment(postId, activeAlias);
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
      setActionError(
        err.response?.data?.message || 'No se pudo eliminar el comentario.',
      );
    }
  };

  const handleSaveAlias = (e) => {
    e.preventDefault();
    const parsed = aliasSchema.safeParse(tempAlias);
    if (!parsed.success) {
      setAliasError(parsed.error.issues[0]?.message || 'Alias inválido.');
      return;
    }
    const clean = parsed.data;
    setAlias(clean);
    setAliasError(null);
    setShowAliasModal(false);
    // Si venía de comentar, enviamos automáticamente con el alias nuevo
    const pending = pendingCommentPostId;
    setPendingCommentPostId(null);
    if (pending) {
      // HACK: defer un tick para que el estado de alias ya esté aplicado
      setTimeout(() => sendComment(pending, clean), 0);
    }
  };

  // Escape cierra modales + foco inicial accesible (sin focus-trap pesado, suficiente para 2 modales simples)
  useEffect(() => {
    if (!showComposeModal && !showAliasModal) return undefined;
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setShowComposeModal(false);
        setShowAliasModal(false);
        setPendingCommentPostId(null);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showComposeModal, showAliasModal]);

  useEffect(() => {
    if (showComposeModal) {
      // HACK: pequeño delay para que el modal monte antes del focus
      const t = setTimeout(() => composeFirstFieldRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [showComposeModal]);

  useEffect(() => {
    if (showAliasModal) {
      const t = setTimeout(() => aliasInputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [showAliasModal]);

  return (
    <div className="flex flex-col h-[100dvh] h-screen bg-surface-page overflow-hidden">
      {/* ── Top Header ──────────────────────────────────────────────────── */}
      <header className="bg-white pt-10 pb-3.5 px-5 border-b border-slate-200/80 shrink-0 z-20 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-brand-primary shrink-0" />
              <h1 className="text-xl font-bold text-ink-primary tracking-tight">
                Comunidad QRuta
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
        <div
          className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-0.5"
          role="group"
          aria-label="Filtrar por categoría"
        >
          <button
            type="button"
            onClick={() => handleCategoryChange('ALL')}
            aria-pressed={selectedCategory === 'ALL'}
            className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold border transition-all shrink-0 cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-brand-navy text-brand-lime border-border-navy shadow-xs'
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
                aria-pressed={active}
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
              <RouteIcon className="w-4 h-4 text-brand-primary shrink-0" aria-hidden="true" />
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
              <X className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Ver todas</span>
            </button>
          </div>
        )}

        {/* Sort + Mine controls */}
        <div className="flex items-center gap-2">
          <div
            className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-0.5"
            role="group"
            aria-label="Ordenar publicaciones"
          >
            <button
              type="button"
              onClick={() => handleSortChange('recent')}
              aria-pressed={sortOrder === 'recent'}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                sortOrder === 'recent'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-500'
              }`}
            >
              Recientes
            </button>
            <button
              type="button"
              onClick={() => handleSortChange('popular')}
              aria-pressed={sortOrder === 'popular'}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-colors ${
                sortOrder === 'popular'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-500'
              }`}
            >
              Más útiles
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMineOnly((v) => !v)}
            aria-pressed={mineOnly}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
              mineOnly
                ? 'bg-brand-primary text-white border-brand-primary'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            Mis publicaciones
          </button>

          {isRevalidating && !loading && (
            <span
              className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400"
              role="status"
            >
              <span className="w-3 h-3 rounded-full border-2 border-slate-300 border-t-brand-primary animate-spin" />
              Actualizando…
            </span>
          )}
        </div>
      </header>

      {/* ── Feed Content ────────────────────────────────────────────────── */}
      <main
        className="flex-1 overflow-y-auto hide-scrollbar p-4 sm:p-5 space-y-4 max-w-2xl mx-auto w-full pb-28"
        aria-live="polite"
        aria-busy={loading}
      >
        {/* Inline action error banner (replaces window.alert) */}
        {actionError && (
          <div
            role="alert"
            className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-3 text-xs font-semibold flex items-center justify-between gap-2"
          >
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError(null)}
              aria-label="Descartar error"
              className="shrink-0 text-rose-500 hover:text-rose-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

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
            <p className="text-xs text-brand-primary font-bold mt-0.5">
              Toca aquí para compartir con otros pasajeros →
            </p>
          </div>
        </button>

        {loading ? (
          <div className="space-y-3 py-4" role="status" aria-label="Cargando publicaciones">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                aria-hidden="true"
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
              onClick={() => fetchPosts()}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-primary bg-blue-50 px-3.5 py-2 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reintentar
            </button>
          </div>
        ) : visiblePosts.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/80 shadow-card space-y-3 animate-fade-in">
            <MessageSquare className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
            <h3 className="text-sm font-bold text-ink-primary">
              {mineOnly
                ? 'Aún no tienes publicaciones'
                : 'Aún no hay publicaciones en esta sección'}
            </h3>
            <p className="text-xs text-ink-muted max-w-xs mx-auto">
              {mineOnly
                ? 'Cuando publiques con este dispositivo, las verás aquí.'
                : 'Sé el primero en compartir una alerta de ruta, recomendación o pregunta con la comunidad.'}
            </p>
            <button
              type="button"
              onClick={openComposeModal}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-brand-primary px-4 py-2.5 rounded-xl hover:bg-brand-primary-dark transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              {mineOnly ? 'Crear publicación' : 'Crear primera publicación'}
            </button>
          </div>
        ) : (
          <>
            {visiblePosts.map((post) => {
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
                <MemoPostCard
                  key={post.id}
                  post={post}
                  catMeta={catMeta}
                  CatIcon={CatIcon}
                  commentState={commentState}
                  onToggleLike={handleToggleLike}
                  onToggleComments={handleToggleComments}
                  onDeletePost={(id) => setDeletePostTarget(id)}
                  onOpenRoute={handleOpenRouteOnMap}
                  commentSectionProps={{
                    onToggleComments: handleToggleComments,
                    onTextChange: handleCommentTextChange,
                    onAddComment: handleAddComment,
                    onDeleteComment: handleDeleteComment,
                    alias,
                    hasAlias,
                    cooldownRemaining,
                    commentBlockedPostId,
                  }}
                />
              );
            })}
            <div ref={sentinelRef} aria-hidden="true" className="h-2" />
            {loadingMore && (
              <div className="flex items-center justify-center py-4 text-xs text-slate-500 gap-2" role="status">
                <span className="w-4 h-4 rounded-full border-2 border-brand-primary/30 border-t-brand-primary animate-spin" />
                <span>Cargando más publicaciones...</span>
              </div>
            )}
            {!hasMore && visiblePosts.length > 0 && (
              <p className="text-center text-[11px] text-slate-400 py-2">
                Ya viste todas las publicaciones de esta sección.
              </p>
            )}
          </>
        )}
      </main>

      <ComposeModal
        open={showComposeModal}
        formAlias={formAlias}
        setFormAlias={setFormAlias}
        formCategory={formCategory}
        setFormCategory={setFormCategory}
        formRouteId={formRouteId}
        setFormRouteId={setFormRouteId}
        formContent={formContent}
        setFormContent={setFormContent}
        honeypot={honeypot}
        setHoneypot={setHoneypot}
        formError={formError}
        submitting={submittingPost}
        cooldownRemaining={cooldownRemaining}
        routes={routes}
        firstFieldRef={composeFirstFieldRef}
        categoryIcons={CATEGORY_ICONS}
        onClose={() => setShowComposeModal(false)}
        onSubmit={handleCreatePost}
      />

      <AliasModal
        open={showAliasModal}
        tempAlias={tempAlias}
        setTempAlias={(v) => {
          setTempAlias(v);
          setAliasError(null);
        }}
        aliasError={aliasError}
        inputRef={aliasInputRef}
        pendingComment={pendingCommentPostId}
        onClose={() => {
          setShowAliasModal(false);
          setPendingCommentPostId(null);
          setAliasError(null);
        }}
        onSubmit={handleSaveAlias}
      />

      {/* Delete Post Confirm Dialog */}
      <ConfirmDialog
        open={deletePostTarget != null}
        title="¿Eliminar tu publicación?"
        description="Esta acción no se puede deshacer. Tu publicación y sus comentarios se eliminarán permanentemente."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        tone="danger"
        loading={deletingPost}
        onCancel={() => setDeletePostTarget(null)}
        onConfirm={() => handleDeletePost(deletePostTarget)}
      />
    </div>
  );
}
