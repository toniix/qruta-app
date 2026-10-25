import { describe, it, expect, beforeEach } from 'vitest';
import {
  feedCacheKey,
  writeFeedCache,
  readFeedCache,
  updateFeedCachePost,
  updateFeedCacheCommentsCount,
  invalidateFeedCache,
} from '../../services/communityFeedCache';

describe('CommunityPage feedCache helper functions', () => {
  beforeEach(() => {
    invalidateFeedCache();
  });

  it('generates consistent cache keys and stores/reads entries', () => {
    const key = feedCacheKey('ALERTA', 'route-1', 'popular');
    expect(key).toBe('ALERTA|route-1|popular');

    const entry = {
      posts: [{ id: 'p1', content: 'Post 1', likesCount: 0, commentsCount: 0 }],
      page: 0,
      hasMore: false,
    };
    writeFeedCache(key, entry);

    const cached = readFeedCache(key);
    expect(cached).not.toBeNull();
    expect(cached.posts[0].id).toBe('p1');
  });

  it('updateFeedCachePost updates post in-memory across all cached feeds', () => {
    const key1 = feedCacheKey('ALL', null, 'recent');
    const key2 = feedCacheKey('ALERTA', null, 'recent');

    writeFeedCache(key1, {
      posts: [
        { id: 'p1', likesCount: 2, likedByMe: false },
        { id: 'p2', likesCount: 0, likedByMe: false },
      ],
      page: 0,
      hasMore: false,
    });
    writeFeedCache(key2, {
      posts: [{ id: 'p1', likesCount: 2, likedByMe: false }],
      page: 0,
      hasMore: false,
    });

    updateFeedCachePost({ id: 'p1', likesCount: 3, likedByMe: true });

    const feed1 = readFeedCache(key1);
    const feed2 = readFeedCache(key2);

    expect(feed1.posts[0].likesCount).toBe(3);
    expect(feed1.posts[0].likedByMe).toBe(true);
    expect(feed1.posts[1].likesCount).toBe(0);

    expect(feed2.posts[0].likesCount).toBe(3);
    expect(feed2.posts[0].likedByMe).toBe(true);
  });

  it('updateFeedCacheCommentsCount increments and decrements comments atomically across caches', () => {
    const key = feedCacheKey('ALL', null, 'recent');
    writeFeedCache(key, {
      posts: [{ id: 'p1', commentsCount: 1 }],
      page: 0,
      hasMore: false,
    });

    updateFeedCacheCommentsCount('p1', 1);
    expect(readFeedCache(key).posts[0].commentsCount).toBe(2);

    updateFeedCacheCommentsCount('p1', -1);
    expect(readFeedCache(key).posts[0].commentsCount).toBe(1);

    // Prevents negative comments count
    updateFeedCacheCommentsCount('p1', -5);
    expect(readFeedCache(key).posts[0].commentsCount).toBe(0);
  });

  it('gracefully handles missing or invalid arguments without error', () => {
    expect(() => updateFeedCachePost(null)).not.toThrow();
    expect(() => updateFeedCachePost({})).not.toThrow();
    expect(() => updateFeedCacheCommentsCount(null, 1)).not.toThrow();
  });
});
