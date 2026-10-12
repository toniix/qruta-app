import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MessageSquare,
  Trash2,
  Heart,
  MessageCircle,
  Eye,
  RefreshCw,
  User,
  Clock,
  Loader2,
  X,
} from 'lucide-react';
import { AdminDataTable } from '../../../components/admin/common/AdminDataTable';
import { AdminFilterBar } from '../../../components/admin/common/AdminFilterBar';
import { ConfirmDialog } from '../../../components/admin/common/ConfirmDialog';
import { AdminDrawer } from '../../../components/admin/common/AdminDrawer';
import {
  communityService,
  COMMUNITY_CATEGORIES,
  getCategoryMeta,
} from '../../../services/communityService';
import { adminRouteService } from '../../../services/adminRouteService';
import { adminLineService } from '../../../services/adminLineService';
import { cityService } from '../../../services/cityService';
import { formatRelativeTime } from '../../../utils/dateUtils';
import { useAdminToast } from '../../../hooks/useAdminToast';
import { BRAND_PRIMARY } from '../../../constants/brand';

export function CommunityModerationPage() {
  const toast = useAdminToast();
  const [posts, setPosts] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [lines, setLines] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterCityId, setFilterCityId] = useState('');
  const [filterLineId, setFilterLineId] = useState('');
  const [filterRouteId, setFilterRouteId] = useState('');

  // Delete Post state
  const [deletePostConfirm, setDeletePostConfirm] = useState(null);
  const [deletingPost, setDeletingPost] = useState(false);

  // Comments inspection Drawer
  const [inspectingPost, setInspectingPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);

  // Delete Comment state
  const [deleteCommentConfirm, setDeleteCommentConfirm] = useState(null);
  const [deletingComment, setDeletingComment] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [postsData, routesData, linesData, citiesData] = await Promise.all([
        communityService.getAdminPosts(),
        adminRouteService.getAllRoutes().catch(() => []),
        adminLineService.getAllLines().catch(() => []),
        cityService.getAdminCities().catch(() => []),
      ]);
      setPosts(Array.isArray(postsData) ? postsData : []);
      setRoutes(Array.isArray(routesData) ? routesData : []);
      setLines(Array.isArray(linesData) ? linesData : []);
      setCities(Array.isArray(citiesData) ? citiesData : []);
    } catch (err) {
      console.error('Error cargando datos de comunidad:', err);
      toast.error('Error al cargar datos para moderación de la comunidad.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [postsData, routesData, linesData, citiesData] = await Promise.all([
          communityService.getAdminPosts(),
          adminRouteService.getAllRoutes().catch(() => []),
          adminLineService.getAllLines().catch(() => []),
          cityService.getAdminCities().catch(() => []),
        ]);
        if (isMounted) {
          setPosts(Array.isArray(postsData) ? postsData : []);
          setRoutes(Array.isArray(routesData) ? routesData : []);
          setLines(Array.isArray(linesData) ? linesData : []);
          setCities(Array.isArray(citiesData) ? citiesData : []);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error cargando datos de comunidad:', err);
          toast.error('Error al cargar publicaciones de la comunidad.');
          setLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [toast]);

  // Context fast maps
  const routeMap = useMemo(() => new Map(routes.map((r) => [String(r.id), r])), [routes]);
  const routeCodeMap = useMemo(
    () => new Map(routes.map((r) => [r.code?.toUpperCase(), r])),
    [routes],
  );
  const lineMap = useMemo(() => new Map(lines.map((l) => [String(l.id), l])), [lines]);
  const cityMap = useMemo(() => new Map(cities.map((c) => [String(c.id), c])), [cities]);

  // Cascading options
  const availableLines = useMemo(() => {
    if (!filterCityId) return lines;
    return lines.filter((l) => String(l.cityId) === String(filterCityId));
  }, [lines, filterCityId]);

  const availableRoutes = useMemo(() => {
    let list = routes;
    if (filterLineId) {
      return list.filter((r) => String(r.transportLineId) === String(filterLineId));
    }
    if (filterCityId) {
      const cityLineIds = new Set(
        lines
          .filter((l) => String(l.cityId) === String(filterCityId))
          .map((l) => String(l.id)),
      );
      return list.filter((r) => cityLineIds.has(String(r.transportLineId)));
    }
    return list;
  }, [routes, lines, filterCityId, filterLineId]);

  // Reset dependent filters when parent filter changes
  const handleCityChange = (cityId) => {
    setFilterCityId(cityId);
    if (filterLineId) {
      const line = lineMap.get(String(filterLineId));
      if (cityId && line && String(line.cityId) !== String(cityId)) {
        setFilterLineId('');
        setFilterRouteId('');
      }
    }
  };

  const handleLineChange = (lineId) => {
    setFilterLineId(lineId);
    if (filterRouteId) {
      const route = routeMap.get(String(filterRouteId));
      if (lineId && route && String(route.transportLineId) !== String(lineId)) {
        setFilterRouteId('');
      }
    }
  };

  const hasActiveFilters = Boolean(
    searchQuery ||
      filterCategory !== 'ALL' ||
      filterCityId ||
      filterLineId ||
      filterRouteId,
  );

  const resetAllFilters = () => {
    setSearchQuery('');
    setFilterCategory('ALL');
    setFilterCityId('');
    setFilterLineId('');
    setFilterRouteId('');
  };

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      // 1. Text Search
      const matchesSearch =
        !searchQuery ||
        p.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.authorAlias?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.routeCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.routeName?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // 2. Category
      if (filterCategory !== 'ALL' && p.category !== filterCategory) {
        return false;
      }

      // Resolve post context (Route, Line, City)
      const postRoute = p.routeId
        ? routeMap.get(String(p.routeId))
        : p.routeCode
          ? routeCodeMap.get(p.routeCode?.toUpperCase())
          : null;

      const postLineId = p.lineId || postRoute?.transportLineId;
      const postLine = postLineId ? lineMap.get(String(postLineId)) : null;

      const postCityId = p.cityId || postLine?.cityId;

      // 3. City Filter
      if (filterCityId) {
        if (!postCityId || String(postCityId) !== String(filterCityId)) {
          return false;
        }
      }

      // 4. Line Filter
      if (filterLineId) {
        if (!postLineId || String(postLineId) !== String(filterLineId)) {
          return false;
        }
      }

      // 5. Route Filter
      if (filterRouteId) {
        const matchesRoute =
          (p.routeId && String(p.routeId) === String(filterRouteId)) ||
          (postRoute && String(postRoute.id) === String(filterRouteId));
        if (!matchesRoute) return false;
      }

      return true;
    });
  }, [
    posts,
    searchQuery,
    filterCategory,
    filterCityId,
    filterLineId,
    filterRouteId,
    routeMap,
    routeCodeMap,
    lineMap,
  ]);

  const handleConfirmDeletePost = async () => {
    if (!deletePostConfirm) return;
    setDeletingPost(true);
    try {
      await communityService.adminDeletePost(deletePostConfirm.id);
      toast.success(`Publicación de "${deletePostConfirm.authorAlias}" eliminada.`);
      setDeletePostConfirm(null);
      if (inspectingPost?.id === deletePostConfirm.id) {
        setInspectingPost(null);
      }
      await loadData();
    } catch (err) {
      console.error('Error eliminando publicación:', err);
      toast.error(err.response?.data?.message || 'Error al eliminar la publicación.');
    } finally {
      setDeletingPost(false);
    }
  };

  const handleOpenInspectComments = async (post) => {
    setInspectingPost(post);
    setLoadingComments(true);
    try {
      const data = await communityService.getComments(post.id);
      setComments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando comentarios:', err);
      toast.error('Error al cargar comentarios.');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleConfirmDeleteComment = async () => {
    if (!deleteCommentConfirm) return;
    setDeletingComment(true);
    try {
      await communityService.adminDeleteComment(deleteCommentConfirm.id);
      toast.success('Comentario eliminado por moderación.');
      setComments((prev) => prev.filter((c) => c.id !== deleteCommentConfirm.id));
      setDeleteCommentConfirm(null);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === inspectingPost?.id
            ? { ...p, commentsCount: Math.max(0, (p.commentsCount || 1) - 1) }
            : p,
        ),
      );
    } catch (err) {
      console.error('Error eliminando comentario:', err);
      toast.error('Error al eliminar comentario.');
    } finally {
      setDeletingComment(false);
    }
  };

  const columns = [
    {
      key: 'authorAlias',
      label: 'Autor',
      width: '140px',
      render: (p) => (
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 font-bold text-xs shrink-0">
            <User className="h-3.5 w-3.5" />
          </span>
          <span className="font-bold text-slate-900 truncate">{p.authorAlias || 'Anónimo'}</span>
        </div>
      ),
    },
    {
      key: 'context',
      label: 'Contexto / Ruta',
      width: '180px',
      render: (p) => {
        const postRoute = p.routeId
          ? routeMap.get(String(p.routeId))
          : p.routeCode
            ? routeCodeMap.get(p.routeCode?.toUpperCase())
            : null;

        const postLineId = p.lineId || postRoute?.transportLineId;
        const postLine = postLineId ? lineMap.get(String(postLineId)) : null;

        const postCityId = p.cityId || postLine?.cityId;
        const postCity = postCityId ? cityMap.get(String(postCityId)) : null;

        const routeCode = p.routeCode || postRoute?.code;
        const routeColor = p.routeColor || postRoute?.color || BRAND_PRIMARY;

        return (
          <div className="space-y-1">
            {routeCode ? (
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold text-white shadow-2xs"
                  style={{ backgroundColor: routeColor }}
                >
                  {routeCode}
                </span>
                <span className="text-[11px] text-slate-600 truncate max-w-[120px]" title={p.routeName || postRoute?.name}>
                  {p.routeName || postRoute?.name}
                </span>
              </div>
            ) : (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                General
              </span>
            )}

            {(postLine || postCity || p.cityName) && (
              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                {postLine && <span className="truncate max-w-[80px]">{postLine.name}</span>}
                {postLine && (postCity || p.cityName) && <span>·</span>}
                {(postCity?.name || p.cityName) && (
                  <span className="font-medium text-slate-500">{postCity?.name || p.cityName}</span>
                )}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'category',
      label: 'Categoría',
      width: '150px',
      render: (p) => {
        const meta = getCategoryMeta(p.category);
        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${meta.badgeClass}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dotClass}`} />
            {meta.label}
          </span>
        );
      },
    },
    {
      key: 'content',
      label: 'Contenido del Mensaje',
      render: (p) => (
        <div className="max-w-md">
          <p className="text-xs text-slate-800 line-clamp-2 leading-relaxed">{p.content}</p>
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Fecha',
      width: '120px',
      render: (p) => (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>{formatRelativeTime(p.createdAt)}</span>
        </div>
      ),
    },
    {
      key: 'engagement',
      label: 'Interacción',
      width: '130px',
      render: (p) => (
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1" title="Me gusta">
            <Heart className="h-3.5 w-3.5 text-rose-500" />
            <span className="font-semibold">{p.likesCount || 0}</span>
          </span>
          <span className="inline-flex items-center gap-1" title="Comentarios">
            <MessageCircle className="h-3.5 w-3.5 text-blue-500" />
            <span className="font-semibold">{p.commentsCount || 0}</span>
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Moderación',
      sortable: false,
      align: 'right',
      width: '100px',
      render: (p) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenInspectComments(p)}
            title="Inspeccionar comentarios"
            aria-label="Inspeccionar comentarios"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setDeletePostConfirm(p)}
            title="Eliminar publicación"
            aria-label="Eliminar publicación"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 transition"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <MessageSquare className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Moderación de Comunidad
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervisa alertas ciudadanas, consultas de rutas y filtra por ciudad, línea y ruta.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 self-start sm:self-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Multi-Dimensional Filter Bar */}
      <AdminFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        placeholder="Buscar por autor, ruta o palabras clave..."
      >
        {/* Categoría */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="ALL">Todas las categorías</option>
          {COMMUNITY_CATEGORIES.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.label}
            </option>
          ))}
        </select>

        {/* Ciudad */}
        <select
          value={filterCityId}
          onChange={(e) => handleCityChange(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Todas las ciudades</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Línea */}
        <select
          value={filterLineId}
          onChange={(e) => handleLineChange(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Todas las líneas</option>
          {availableLines.map((l) => (
            <option key={l.id} value={l.id}>
              {l.code ? `${l.code} - ${l.name}` : l.name}
            </option>
          ))}
        </select>

        {/* Ruta */}
        <select
          value={filterRouteId}
          onChange={(e) => setFilterRouteId(e.target.value)}
          className="rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">Todas las rutas</option>
          {availableRoutes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.code} - {r.name}
            </option>
          ))}
        </select>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetAllFilters}
            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition"
            title="Limpiar todos los filtros"
          >
            <X className="h-3.5 w-3.5" />
            <span>Limpiar</span>
          </button>
        )}
      </AdminFilterBar>

      {/* Posts Table */}
      <AdminDataTable
        columns={columns}
        data={filteredPosts}
        loading={loading}
        caption="Listado de publicaciones para moderación"
        emptyTitle="No hay publicaciones"
        emptyDescription={
          hasActiveFilters
            ? 'No se encontraron publicaciones con los filtros seleccionados. Prueba limpiando los filtros.'
            : 'No hay mensajes de comunidad registrados.'
        }
        emptyActionLabel={hasActiveFilters ? 'Limpiar Filtros' : undefined}
        onEmptyAction={hasActiveFilters ? resetAllFilters : undefined}
      />

      {/* Comments Inspection Drawer */}
      <AdminDrawer
        open={Boolean(inspectingPost)}
        onClose={() => setInspectingPost(null)}
        title="Inspección de Comentarios"
        subtitle={`Publicación de "${inspectingPost?.authorAlias}"`}
        icon={MessageCircle}
      >
        {inspectingPost && (
          <div className="space-y-4">
            {/* Original Post Preview */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">
                  {inspectingPost.authorAlias}
                </span>
                <span className="text-[11px] text-slate-400">
                  {formatRelativeTime(inspectingPost.createdAt)}
                </span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {inspectingPost.content}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
                Comentarios ({comments.length})
              </h4>

              {loadingComments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  Esta publicación aún no tiene comentarios.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {comments.map((comm) => (
                    <div
                      key={comm.id}
                      className="flex items-start justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs hover:border-slate-300 transition"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-800">
                            {comm.authorAlias || 'Anónimo'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatRelativeTime(comm.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {comm.content}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDeleteCommentConfirm(comm)}
                        title="Eliminar este comentario"
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </AdminDrawer>

      {/* Delete Post Confirmation */}
      <ConfirmDialog
        open={Boolean(deletePostConfirm)}
        title="Eliminar Publicación"
        description={`¿Estás seguro de eliminar la publicación de "${deletePostConfirm?.authorAlias}"? Esta acción borrará el mensaje y todos sus comentarios de forma permanente.`}
        confirmLabel="Eliminar Publicación"
        tone="danger"
        loading={deletingPost}
        onCancel={() => setDeletePostConfirm(null)}
        onConfirm={handleConfirmDeletePost}
      />

      {/* Delete Comment Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteCommentConfirm)}
        title="Eliminar Comentario"
        description="¿Estás seguro de eliminar este comentario por infracción de normas comunitarias?"
        confirmLabel="Eliminar Comentario"
        tone="danger"
        loading={deletingComment}
        onCancel={() => setDeleteCommentConfirm(null)}
        onConfirm={handleConfirmDeleteComment}
      />
    </div>
  );
}

export default CommunityModerationPage;
