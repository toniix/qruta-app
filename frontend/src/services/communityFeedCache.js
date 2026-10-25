const FEED_CACHE_TTL_MS = 60_000;
export const feedCache = new Map();

export function feedCacheKey(category, routeId, sort) {
  return `${category || "ALL"}|${routeId || ""}|${sort || "recent"}`;
}

export function readFeedCache(key) {
  const hit = feedCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > FEED_CACHE_TTL_MS) {
    feedCache.delete(key);
    return null;
  }
  return hit;
}

export function writeFeedCache(key, entry) {
  feedCache.set(key, { ...entry, ts: Date.now() });
  if (feedCache.size > 20) {
    const oldest = feedCache.keys().next().value;
    feedCache.delete(oldest);
  }
}

export function invalidateFeedCache() {
  feedCache.clear();
}

export function updateFeedCachePost(updatedPost) {
  if (!updatedPost?.id) return;
  for (const [key, entry] of feedCache.entries()) {
    if (entry.posts?.some((p) => String(p.id) === String(updatedPost.id))) {
      const updatedList = entry.posts.map((p) =>
        String(p.id) === String(updatedPost.id) ? updatedPost : p,
      );
      feedCache.set(key, { ...entry, posts: updatedList });
    }
  }
}

export function updateFeedCacheCommentsCount(postId, delta) {
  if (!postId || typeof delta !== "number") return;
  for (const [key, entry] of feedCache.entries()) {
    if (entry.posts?.some((p) => String(p.id) === String(postId))) {
      const updatedList = entry.posts.map((p) =>
        String(p.id) === String(postId)
          ? {
              ...p,
              commentsCount: Math.max(0, (p.commentsCount || 0) + delta),
            }
          : p,
      );
      feedCache.set(key, { ...entry, posts: updatedList });
    }
  }
}
