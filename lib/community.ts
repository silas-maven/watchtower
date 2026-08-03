// Community feed rules, kept dependency-free so the API, the UI and the tests
// all read the same definitions rather than three near-identical copies.
//
// Scope settled with the academy owner, 3 August 2026:
//   - signed out sees nothing (so nothing is ever crawled and indexed)
//   - a free profile reads
//   - a paying member posts, replies and likes, from the moment they pay
//   - no approval queue: moderation is after the fact, by any admin

export const POST_MAX_LENGTH = 500;
export const REPLY_MAX_LENGTH = 300;

/** Posts per member per rolling 24 hours, replies included. */
export const POSTS_PER_DAY = 20;

/** Newest featured posts eligible for the Dashboard rotation. */
export const FEATURED_POOL_SIZE = 10;

/** How long each featured post is shown, in milliseconds. */
export const FEATURED_ROTATE_MS = 5000;

export const POST_STATUSES = ['PUBLISHED', 'HIDDEN', 'REMOVED'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export const ALIAS_MIN = 3;
export const ALIAS_MAX = 20;

/**
 * Words an alias may not contain. The point is impersonation, not politeness:
 * "SPA_Official" or "academy_admin" reads as the academy speaking, and a member
 * post is explicitly not that.
 */
const RESERVED_ALIAS_WORDS = ['spa', 'spartan', 'admin', 'official', 'academy', 'moderator', 'support'];

export type AliasCheck = { ok: true; value: string } | { ok: false; reason: string };

/**
 * Validate and normalise a proposed alias. Returns the trimmed value to store;
 * callers still have to check uniqueness against the database, comparing
 * lowercased, since the unique index is case sensitive on its own.
 */
export function checkAlias(raw: string): AliasCheck {
  const value = raw.trim();
  if (value.length < ALIAS_MIN) return { ok: false, reason: `Pick something at least ${ALIAS_MIN} characters long.` };
  if (value.length > ALIAS_MAX) return { ok: false, reason: `Keep it to ${ALIAS_MAX} characters or fewer.` };
  if (!/^[A-Za-z0-9_]+$/.test(value)) return { ok: false, reason: 'Letters, numbers and underscores only.' };
  const lowered = value.toLowerCase();
  const hit = RESERVED_ALIAS_WORDS.find((word) => lowered.includes(word));
  if (hit) return { ok: false, reason: `Aliases cannot contain "${hit}", to keep members apart from the academy itself.` };
  return { ok: true, value };
}

/**
 * Strip links from a post body.
 *
 * v1 does not allow links. A feed on a financial platform where anyone can post
 * a URL is a referral and phishing vector, and the moderation here is a person's
 * attention rather than a filter. Removing them is one pass; allowing them is a
 * decision to make deliberately later.
 */
const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|io|co|uk|xyz|me|app|link)\b\S*/gi;

export function containsLink(body: string): boolean {
  URL_PATTERN.lastIndex = 0;
  return URL_PATTERN.test(body);
}

export type BodyCheck = { ok: true; value: string } | { ok: false; reason: string };

export function checkBody(raw: string, { isReply = false }: { isReply?: boolean } = {}): BodyCheck {
  const value = raw.trim().replace(/\n{3,}/g, '\n\n');
  const max = isReply ? REPLY_MAX_LENGTH : POST_MAX_LENGTH;
  if (value.length === 0) return { ok: false, reason: 'Write something first.' };
  if (value.length > max) return { ok: false, reason: `Keep it to ${max} characters or fewer.` };
  if (containsLink(value)) return { ok: false, reason: 'Links are not allowed in the feed yet.' };
  return { ok: true, value };
}

/** The standing line under the composer. Members' views, not the academy's. */
export const FEED_DISCLAIMER =
  'Posts are members’ own views, not the academy’s. Nothing in the feed is financial advice.';
