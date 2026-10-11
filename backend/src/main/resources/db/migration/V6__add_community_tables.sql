-- Migration V6: Create community posts, comments, and likes tables
-- Supports the citizen Community feed, route-tagged alerts, comments, and device-based likes.

CREATE TABLE IF NOT EXISTS community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_alias VARCHAR(50) NOT NULL,
    author_device_id VARCHAR(64) NOT NULL,
    category VARCHAR(30) NOT NULL,
    content VARCHAR(600) NOT NULL,
    route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
    city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
    likes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    author_alias VARCHAR(50) NOT NULL,
    author_device_id VARCHAR(64) NOT NULL,
    content VARCHAR(400) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS community_post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    device_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_community_post_like_device UNIQUE (post_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_community_posts_created_at
ON community_posts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_route_id
ON community_posts (route_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_city_id
ON community_posts (city_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_category
ON community_posts (category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_comments_post_id
ON community_comments (post_id, created_at ASC);

