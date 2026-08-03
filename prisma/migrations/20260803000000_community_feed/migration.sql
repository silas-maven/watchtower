-- Community feed (owner request, 2 August 2026; scope settled 3 August).
--
-- Visibility is sign-in only: signed-out visitors see nothing, so no post is
-- ever crawled and indexed by a search engine under the academy's domain.
-- Free profiles read; paying members post, reply and like.
--
-- Additive only. Nothing existing changes except one nullable column on the
-- profile table.

-- The member's public name in the feed. Nullable, because a member has none
-- until they choose one. Unique so nobody can pose as another member; the API
-- compares lowercased, since this index is case sensitive on its own.
ALTER TABLE "watchtower_spa_profiles" ADD COLUMN "communityAlias" TEXT;
CREATE UNIQUE INDEX "watchtower_spa_profiles_communityAlias_key"
  ON "watchtower_spa_profiles"("communityAlias");

-- Posts and replies share one table. A reply is a row with a parentId, so a
-- moderator hides or removes it through exactly the same path as a post and no
-- second code path can drift. Depth is capped at one in the API.
CREATE TABLE "watchtower_spa_community_posts" (
  "id"             TEXT NOT NULL,
  "profileId"      TEXT NOT NULL,
  -- The alias as it was when this was written. Denormalised deliberately: a
  -- later alias change must not silently rewrite what someone said last month.
  "alias"          TEXT NOT NULL,
  "body"           TEXT NOT NULL,
  "parentId"       TEXT,
  -- PUBLISHED | HIDDEN | REMOVED. Never hard-deleted, so a moderation call can
  -- be reviewed and reversed and a thread does not lose its shape.
  "status"         TEXT NOT NULL DEFAULT 'PUBLISHED',
  "featured"       BOOLEAN NOT NULL DEFAULT false,
  -- Denormalised counters. The like rows are the truth; these exist so the feed
  -- does not run an aggregate per row to render.
  "likeCount"      INTEGER NOT NULL DEFAULT 0,
  "replyCount"     INTEGER NOT NULL DEFAULT 0,
  "reportCount"    INTEGER NOT NULL DEFAULT 0,
  -- The reason has to survive the status flip, or nobody can answer "why was my
  -- post taken down".
  "moderationNote" TEXT,
  "moderatedAt"    TIMESTAMP(3),
  "moderatedById"  TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "watchtower_spa_community_posts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "watchtower_spa_community_posts_parentId_status_createdAt_idx"
  ON "watchtower_spa_community_posts"("parentId", "status", "createdAt");
CREATE INDEX "watchtower_spa_community_posts_status_createdAt_idx"
  ON "watchtower_spa_community_posts"("status", "createdAt" DESC);
CREATE INDEX "watchtower_spa_community_posts_featured_status_createdAt_idx"
  ON "watchtower_spa_community_posts"("featured", "status", "createdAt" DESC);
CREATE INDEX "watchtower_spa_community_posts_profileId_createdAt_idx"
  ON "watchtower_spa_community_posts"("profileId", "createdAt" DESC);

ALTER TABLE "watchtower_spa_community_posts"
  ADD CONSTRAINT "watchtower_spa_community_posts_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "watchtower_spa_profiles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "watchtower_spa_community_posts"
  ADD CONSTRAINT "watchtower_spa_community_posts_moderatedById_fkey"
  FOREIGN KEY ("moderatedById") REFERENCES "watchtower_spa_profiles"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Removing a post takes its replies with it, which is the behaviour you want:
-- a reply to nothing is noise.
ALTER TABLE "watchtower_spa_community_posts"
  ADD CONSTRAINT "watchtower_spa_community_posts_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "watchtower_spa_community_posts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- One like per member per post. The composite primary key is what makes liking
-- idempotent without the API reading first and racing itself.
CREATE TABLE "watchtower_spa_community_post_likes" (
  "postId"    TEXT NOT NULL,
  "profileId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "watchtower_spa_community_post_likes_pkey" PRIMARY KEY ("postId", "profileId")
);

CREATE INDEX "watchtower_spa_community_post_likes_profileId_idx"
  ON "watchtower_spa_community_post_likes"("profileId");

ALTER TABLE "watchtower_spa_community_post_likes"
  ADD CONSTRAINT "watchtower_spa_community_post_likes_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "watchtower_spa_community_posts"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "watchtower_spa_community_post_likes"
  ADD CONSTRAINT "watchtower_spa_community_post_likes_profileId_fkey"
  FOREIGN KEY ("profileId") REFERENCES "watchtower_spa_profiles"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
