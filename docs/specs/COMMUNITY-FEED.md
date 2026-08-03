# Community Feed: specification

Status: **spec, not built.** Written 3 August 2026 from the owner's 2 August
messages plus his 3 August answer on moderation.

## What the owner asked for

> on the feed members should be able to 'tweet' post … and members posts show up
> in a public feed with an alias - it should show featured post on rotation
> 5 secs … then like maybe an extra tab that says community feed here

> The community feed needs a spec. Obviously, that would need admin management,
> so it definitely needs moderation. The admins would be the moderators,
> essentially. Anyone who is an admin can moderate. You just need to have
> admin-level access.

Plus, from the nav ordering: **Community Feed sits fourth**, between Portfolio
and Daily Checks.

---

## 1. What this is, and what it is not

It is a short-form posting surface for members, shown under an alias, with a
featured post rotating on the Dashboard.

It is **not** a discussion forum. No threads, no replies, no direct messages in
v1. Every one of those multiplies the moderation load, and moderation here is a
person's time, not a feature flag.

**Compliance framing, and it matters.** The rest of this platform is careful
never to advise: signals come from fixed rules, the disclaimer is on every page,
and the copy speaks in odds rather than promises. A feed where members post is
the first place where text the academy did not write appears under the academy's
brand. If a member posts "buy XYZ now, it is going to 10x", a reader can
reasonably take that as the academy's view. That is the risk this spec is built
around, and it is why moderation is not optional and why posts carry a standing
disclaimer.

---

## 2. Data model

One new table. Prefix and mapping follow the existing convention.

```prisma
model CommunityPost {
  id        String   @id @default(cuid())
  profileId String

  /** The alias in force when the post was made, denormalised on purpose:
      a later alias change must not silently rewrite history. */
  alias     String
  body      String

  /** PUBLISHED | HIDDEN | REMOVED. Posts are never hard-deleted, so a
      moderation decision can be reviewed and reversed. */
  status    String   @default("PUBLISHED")

  /** Owner-chosen highlight, drives the rotating slot on the Dashboard. */
  featured  Boolean  @default(false)

  /** Moderation trail, mirroring StockRequest: the reason must survive the
      status flip or nobody can answer "why was my post taken down". */
  moderationNote String?
  moderatedAt    DateTime?
  moderatedById  String?

  /** Set when a member reports a post; cleared when an admin resolves it. */
  reportCount    Int      @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  profile     Profile  @relation("CommunityPostAuthor", fields: [profileId], references: [id], onDelete: Cascade)
  moderatedBy Profile? @relation("CommunityPostModerator", fields: [moderatedById], references: [id], onDelete: SetNull)

  @@index([status, createdAt(sort: Desc)])
  @@index([featured, createdAt(sort: Desc)])
  @@index([profileId])
  @@map("watchtower_spa_community_posts")
}
```

Plus one field on `Profile`:

```prisma
  /** Display name in the community feed. Null until the member sets one. */
  communityAlias String? @unique
```

`@unique` so two members cannot impersonate each other. Case-insensitive
uniqueness is enforced in the API by comparing lowercased, since Postgres
`@unique` is case-sensitive.

`reportCount` is a counter rather than a `CommunityPostReport` table
deliberately: v1 needs "an admin can see this was reported", not per-reporter
analytics. If duplicate reporting becomes a problem, add the table then.

---

## 3. Behaviour

### Posting
- **Who can post:** paying members only. Free profiles read the feed. See the
  open questions; this is the recommendation, not a decision.
- **Length:** 500 characters. Long enough for a real thought, short enough that
  a moderator can read it at a glance.
- **Rate limit:** 5 posts per profile per rolling 24 hours, enforced server-side
  in the same style as the pitch quota. This is the cheapest defence against one
  member flooding the feed.
- **No links in v1.** A links-allowed feed on a financial platform is a referral
  and scam vector, and stripping them is one regex. Revisit once the feed has a
  moderation rhythm.
- **No images in v1.** Image hosting, moderation and cost are a separate project.
- The composer carries a standing line: *posts are members' own views, not the
  academy's, and nothing in the feed is financial advice.*

### Alias
- The member sets it once from Account, then it is fixed unless an admin changes
  it. Free renaming defeats the point of moderation, because a member who earns a
  reputation can shed it.
- Validation: 3 to 20 characters, letters, numbers, underscore. Rejected if it
  contains the words "SPA", "Spartan", "admin", "official" or "academy", so
  nobody can pose as the academy.
- A member with no alias sees the composer replaced by a prompt to set one.

### Reading
- `/app/community`, listed fourth in the member nav.
- Newest first, paginated 25 at a time.
- Each row: alias, relative time, body, and a report control for signed-in
  members. Admins additionally see hide and remove.

### The featured rotation
- The Dashboard shows one featured post at a time, changing **every 5 seconds**.
- Source: posts with `featured = true`, newest 10, cycled.
- If none are featured, the slot shows the most recent published posts instead,
  so a fresh install does not render an empty box.
- The rotation must pause when `document.hidden`, matching the existing rAF
  handling elsewhere, and must respect `prefers-reduced-motion` by not animating
  the transition. A 5-second auto-rotating carousel is hostile to anyone reading
  slowly, so it also pauses on hover and on keyboard focus.

### Moderation
Confirmed by the owner: **any profile with OWNER or ADMIN role can moderate.**
No separate moderator role, no per-admin permissions.

- **Hide**: post disappears from the public feed, author still sees it marked
  hidden. For borderline cases.
- **Remove**: post disappears for everyone including the author. For abuse.
- Neither deletes the row. `moderationNote` is required on both, so there is a
  reason on file.
- Reported posts surface in an admin queue at `/admin/community`, ordered by
  report count then age, in the same shape as the existing stock-request queue.
- Every action writes an `AdminAssetAction`-style audit row so it is attributable.

**The honest limit:** this is reactive moderation. Between a member posting
something defamatory or an outright scam and an admin seeing it, the post is
live. Options if that is unacceptable: hold every first-time author's first post
for approval, or hold all posts for approval. Both are cheap to add and both cost
the immediacy the owner is asking for. Flagged, owner's call.

---

## 4. Surfaces to build

| Surface | Path | Notes |
| --- | --- | --- |
| Feed page | `app/app/community/page.tsx` | Server-rendered list, client composer |
| Composer | `components/community/PostComposer.tsx` | Counter, rate-limit message |
| Feed list | `components/community/CommunityFeed.tsx` | Rows, report control |
| Featured rotator | `components/community/FeaturedPost.tsx` | 5s cycle, pauses |
| Alias setup | in `app/app/account` | One-time set |
| Admin queue | `app/admin/community/page.tsx` | Reported and recent, moderation actions |
| Post API | `app/api/community/posts/route.ts` | GET list, POST create |
| Report API | `app/api/community/posts/[id]/report/route.ts` | Members |
| Moderate API | `app/api/admin/community/[id]/route.ts` | OWNER or ADMIN |

Nav: add Community Feed between Portfolio and Daily Checks in
`components/TopNav.tsx`, where the comment already marks the slot.

The existing `app/community/page.tsx` is a redirect stub pointing at watchlists.
It should redirect to `/app/community` instead, or be deleted.

---

## 5. Open questions for the owner

These change what gets built, so they are worth a minute of his time.

1. **Is the feed public to signed-out visitors, or members only?** He said
   "public feed", which alongside "alias" suggests genuinely public, and that
   would make it lead generation like the watchlist. But a public feed is
   indexed by Google, which raises the stakes on moderation considerably.
   Recommendation: **members only in v1**, public later once moderation has a
   rhythm.
2. **Can free-plan members post, or only read?** Recommendation: read only.
   Posting rights being part of the membership is both a reason to pay and a
   natural spam filter.
3. **Should the first post from a new member be held for approval?** See the
   honest limit above. Recommendation: yes, first post only.
4. **Does he want a reply or like control at all?** The spec assumes neither.

---

## 6. Deliberately out of scope for v1

Replies and threads, likes, following, notifications on activity, images, links,
editing a published post, member profile pages, and search. Each is a reasonable
v2 candidate; none is needed for the thing he described.
