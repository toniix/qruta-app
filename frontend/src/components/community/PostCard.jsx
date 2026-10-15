import { memo } from 'react';
import {
  MessageSquare,
  ThumbsUp,
  MessageCircle,
  Trash2,
  Send,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { formatRelativeTime } from '../../utils/dateUtils';

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function CommentSection({
  post,
  commentState,
  onToggleComments,
  onTextChange,
  onAddComment,
  onDeleteComment,
  alias,
  hasAlias,
  cooldownRemaining = 0,
  commentBlockedPostId = null,
}) {
  return (
    <>
      <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
        <span className="sr-only" id={`like-count-${post.id}`}>
          {post.likesCount || 0} reacciones útiles
        </span>
      </div>
      {commentState.open && (
        <div
          id={`comments-${post.id}`}
          className="pt-2 space-y-3 border-t border-slate-100 animate-fade-in"
        >
          {commentState.loading ? (
            <div
              className="flex items-center justify-center py-3 text-xs text-slate-500 gap-2"
              role="status"
            >
              <Loader2 className="w-4 h-4 animate-spin text-brand-primary" aria-hidden="true" />
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
                        <span className="text-[11px] font-bold text-brand-primary">
                          • Tú
                        </span>
                      )}
                      <span className="text-[11px] text-slate-500">
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
                      onClick={() => onDeleteComment(post.id, comment.id)}
                      className="relative p-1 text-slate-500 hover:text-rose-600 rounded-lg after:absolute after:-inset-3 after:content-['']"
                      title="Eliminar comentario"
                      aria-label={`Eliminar comentario de ${comment.authorAlias}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => onAddComment(e, post.id)}
            className="flex items-center gap-2"
          >
            <label htmlFor={`comment-input-${post.id}`} className="sr-only">
              Responder a {post.authorAlias}
            </label>
            <input
              id={`comment-input-${post.id}`}
              type="text"
              value={commentState.text || ''}
              onChange={(e) => onTextChange(post.id, e.target.value)}
              maxLength={400}
              autoComplete="off"
              placeholder={
                hasAlias ? `Responder como ${alias}...` : 'Escribe una respuesta...'
              }
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-brand-primary px-3 py-2 text-xs text-slate-900 outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={commentState.sending || !(commentState.text || '').trim()}
              className="relative p-2 rounded-xl bg-brand-primary text-white hover:bg-brand-primary-dark disabled:opacity-50 transition-colors shrink-0 after:absolute after:-inset-1.5 after:content-['']"
              aria-label="Enviar comentario"
            >
              {commentState.sending ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </form>
          {commentBlockedPostId === post.id && cooldownRemaining > 0 && (
            <p role="status" className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/70 rounded-lg px-2.5 py-1.5">
              Comentaste hace muy poco. Esperá {cooldownRemaining}s antes de comentar de nuevo.
            </p>
          )}
        </div>
      )}
    </>
  );
}

export const MemoCommentSection = memo(CommentSection);

export function PostCard({
  post,
  catMeta,
  CatIcon,
  commentState,
  onToggleLike,
  onToggleComments,
  onDeletePost,
  onOpenRoute,
  commentSectionProps,
}) {
  return (
    <article
      aria-labelledby={`post-author-${post.id}`}
      className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-card space-y-3 transition-all hover:border-slate-300"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            aria-hidden="true"
            className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200/80"
          >
            {getInitials(post.authorAlias)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                id={`post-author-${post.id}`}
                className="font-bold text-sm text-slate-900 truncate"
              >
                {post.authorAlias}
              </span>
              {post.ownedByMe && (
                <span className="text-[11px] font-bold bg-blue-50 text-brand-primary px-1.5 py-0.5 rounded-md border border-blue-200/60">
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
            <CatIcon className="w-3 h-3" aria-hidden="true" />
            <span>{catMeta.label}</span>
          </span>

          {post.ownedByMe && (
            <button
              type="button"
              onClick={() => onDeletePost(post.id)}
              className="relative p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors after:absolute after:-inset-2 after:content-['']"
              title="Eliminar mi publicación"
              aria-label={`Eliminar mi publicación del ${formatRelativeTime(post.createdAt)}`}
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line break-words">
        {post.content}
      </p>

      {post.routeId && (
        <button
          type="button"
          onClick={() => onOpenRoute(post)}
          className="w-full sm:w-auto inline-flex items-center justify-between sm:justify-start gap-2.5 bg-slate-50 hover:bg-blue-50/70 border border-slate-200/90 hover:border-blue-200 rounded-xl px-3 py-2 text-left transition-colors group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          aria-label={`Ver ${post.routeCode || 'ruta'} ${post.routeName || ''} en el mapa`}
        >
          <span
            aria-hidden="true"
            className="px-2 py-0.5 rounded-lg text-white font-bold text-[11px] uppercase tracking-wider shrink-0"
            style={{ backgroundColor: post.routeColor || 'var(--color-brand-primary)' }}
          >
            {post.routeCode || 'Ruta'}
          </span>
          <span className="text-xs font-bold text-slate-700 group-hover:text-brand-primary truncate">
            {post.routeName || 'Ver recorrido en el mapa'}
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand-primary shrink-0" aria-hidden="true" />
        </button>
      )}

      <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onToggleLike(post.id)}
          aria-pressed={Boolean(post.likedByMe)}
          aria-label={
            post.likedByMe
              ? `Quitar reacción útil (${post.likesCount || 0})`
              : `Marcar como útil (${post.likesCount || 0})`
          }
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-11 rounded-xl text-xs font-bold transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${
            post.likedByMe
              ? 'bg-blue-50 text-brand-primary border border-blue-200/80'
              : 'text-slate-600 hover:bg-slate-100 border border-transparent'
          }`}
        >
          <ThumbsUp
            className="w-3.5 h-3.5"
            aria-hidden="true"
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
          onClick={() => onToggleComments(post.id)}
          aria-expanded={Boolean(commentState.open)}
          aria-controls={`comments-${post.id}`}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 min-h-11 rounded-xl text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${
            commentState.open
              ? 'bg-slate-100 text-slate-900'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>
            {post.commentsCount > 0
              ? `${post.commentsCount} ${post.commentsCount === 1 ? 'comentario' : 'comentarios'}`
              : 'Comentar'}
          </span>
        </button>
      </div>

      <MemoCommentSection post={post} commentState={commentState} {...commentSectionProps} />
    </article>
  );
}

export const MemoPostCard = memo(PostCard, (prev, next) => {
  const a = prev.post;
  const b = next.post;
  const pa = prev.commentSectionProps || {};
  const na = next.commentSectionProps || {};
  return (
    a.id === b.id &&
    a.content === b.content &&
    a.likesCount === b.likesCount &&
    a.commentsCount === b.commentsCount &&
    a.likedByMe === b.likedByMe &&
    a.ownedByMe === b.ownedByMe &&
    prev.commentState === next.commentState &&
    pa.alias === na.alias &&
    pa.hasAlias === na.hasAlias &&
    pa.cooldownRemaining === na.cooldownRemaining &&
    pa.commentBlockedPostId === na.commentBlockedPostId
  );
});

export function EmptyIcon({ className }) {
  return <MessageSquare className={className} aria-hidden="true" />;
}
