# Agent handover, 3 August 2026

Written for the agent picking this up on a different account. The previous
session hit its weekly limit. Everything below is verified against the running
system rather than remembered, and where something is a hypothesis rather than a
measurement it says so.

Read `docs/HANDOVER.md` for the original project context (May, still accurate on
product intent). This file covers state, the open performance problem, and the
conventions that are easy to get wrong.

---

## 1. Where things stand

The 2 August owner feedback round is **built, committed and live**. Two commits:

| Commit | What |
| --- | --- |
| `02c77f5` | The watchlist opens up, the signals become the paid product |
| `3e1fc65` | Members post, reply and like, behind sign-in |

Production deployment `dpl_GQyGX3Axoaq2FziLec9oaUefuTzi` was created 03:35 BST on
3 August, after both commits, and its build output contains `/app/community`,
`/admin/community` and the four new API routes. So the community feed is live.
If you were told the deploy was still outstanding, that is out of date: it went
out. `npx vercel ls watchtower --scope team_oXBUYT9DIhGifwlriLATMOZb` confirms.

Migration `20260803000000_community_feed` is applied to the shared Supabase
database. It is additive: two new tables and one nullable column on `Profile`.

Quality gates at handover: `tsc --noEmit` clean, 132 tests across 18 files
passing, `next build` green.

### Still pending

Tasks #33 to #37, all from an earlier round and untouched:

- #33 Design doc for the Spartan simulation engine
- #34 Build the path-dependent Spartan simulation core
- #35 Build the Spartan Readiness Score
- #36 Rename Stress Test to Portfolio Health Check and rebuild the report
- #37 Make the Health Check an async durable job with email delivery

Deferred pending the owner's decision: stochastic and 200-day MA in the watchlist
table. Both need a nightly job because OHLC history is not stored, only the
latest snapshot. Do not start this without asking him, it is a data-collection
commitment rather than a UI change.

### Waiting on Kyser, not on an agent

1. `RESEND_API_KEY` and `EMAIL_FROM` in Vercel. Until these exist the 07:30 daily
   brief cron records "no provider configured" and sends nothing.
2. Stripe is still in **test mode**. Live-mode migration is a launch blocker.
3. Clerk is still on **test keys** in production. See section 2.4, this is a real
   problem and not just hygiene.

---

## 2. The performance problem

Your instinct about Trackr was right in kind, and it is real here too, but it is
not the largest cause. There are three separate things making the app slow, and
they are independently fixable. Numbers first.

### 2.1 The region mismatch is real

Confirmed, not inferred:

```
Vercel functions: iad1        (Washington DC, US East)
Supabase database: eu-central-2 (Zurich, Switzerland)
```

Evidence: `vercel inspect` on the production deployment lists every lambda as
`[iad1]`, and a request to the live site returns
`x-vercel-id: lhr1::iad1::...`, meaning it enters at the London edge and then
crosses the Atlantic to run. `vercel.json` has no `regions` key, so the project
is sitting on the default rather than a deliberate choice.

That costs roughly 80 to 90ms per database round trip, every round trip, in each
direction of the journey the request already made once to get to Washington.

**But it is not the main cost.** I nearly stopped here, which would have been the
wrong call.

### 2.2 The connection pooler is the bigger problem

Measured from the same machine, same network, same database, within seconds of
each other. The only difference is the port:

```
pooled  :6543 (pgbouncer)   min 116ms   median 667ms   max 968ms
direct  :5432               min  23ms   median  26ms   max 192ms
```

A raw TCP connect to that host is 28ms, so the direct number is pure network and
the database instance itself is healthy and fast. The pooled path is **25 times
slower than the network distance justifies**. Distance cannot explain a 640ms
gap, because both connections travel the same distance.

That shape, a low minimum with a long fat tail, is what queuing looks like. The
strongest hypothesis is that `DATABASE_URL` sets `pgbouncer=true` but **not
`connection_limit=1`**, which Supabase specifically recommends for serverless.
Without it each lambda instance opens Prisma's default pool, several connections
per instance, and a handful of concurrent lambdas can exhaust the pooler's client
slots. Queries then wait for a slot rather than for the database.

The current URL is:

```
...pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require&schema=watchtower
```

The cheap experiment is to add `&connection_limit=1` and re-measure. It is a
Vercel environment variable change and a redeploy, no code.

**Honest caveat, and it matters before anyone spends a day on this:** I measured
from a laptop in London, not from a lambda in Washington. The pooler is shared
infrastructure and my numbers may not be what the deployed functions experience.
Confirm from inside a deployed function before acting. `scripts/perf-probe.ts`
exists for exactly this and its header comment explains how to read the output:

```bash
npx tsx -r dotenv/config scripts/perf-probe.ts dotenv_config_path=.env.local
```

If pooled and direct come back high **and roughly equal**, then it really is
distance and the fix is the region. If they diverge the way they do from London,
the pooler is the fish to fry first.

### 2.3 The dashboard loads the entire universe on every view

Independent of any latency, and my own fault to have left standing:

```
getAssetsForDashboard(): 2980ms for 815 rows, 207 KB serialised
```

`lib/server/dashboard.ts` selects every active non-macro asset, with a
correlated latest-snapshot subquery on each, and then `app/app/page.tsx` filters
that array down to a handful of rows **in JavaScript** to render "my tracked
assets" and "market opportunities". When the universe was 14 assets this was
free. The 1,000-asset import made it the single heaviest call on the busiest
page, and it runs for every member on every dashboard load.

The fix is to filter in SQL: the dashboard only ever needs the member's tracked
assets plus assets currently in a BUY or BOTH state. That is two narrow queries
instead of one 815-row scan, and it shrinks the RSC payload by most of 207 KB.
This one is worth doing regardless of what the region and pooler investigation
concludes, because it is slow even at zero latency.

Note the page already parallelises correctly with `Promise.all`, so the problem
is the size of one query rather than the shape of the code around it. Do not
"optimise" the `Promise.all`, it is fine.

### 2.4 Clerk is running test keys in production

The live site serves a `pk_test_...` publishable key, and protected routes come
back with `x-clerk-auth-reason: protect-rewrite, dev-browser-missing`.

Clerk development instances are rate limited, are not intended to carry real
traffic, and depend on a dev-browser token that behaves differently across
browsers and privacy settings. This is both a performance factor under any real
load and a correctness risk at launch. It sits alongside the Stripe test-mode
item as a go-live blocker rather than an optimisation.

### 2.5 Suggested order

1. Add `connection_limit=1`, redeploy, re-measure. Minutes, and potentially the
   whole problem.
2. Fix `getAssetsForDashboard` to filter in SQL. Contained, definitely worth it.
3. Pin the Vercel region to the database's, or move the database. Cheap to try
   via a `regions` key in `vercel.json`, but note a region change redeploys
   everything and the crons move with it.
4. Clerk and Stripe production keys, which are Kyser's to do.

I have changed **none** of this. The measurements and the probe script are the
whole of the work, so the next agent inherits evidence rather than a half-applied
fix.

---

## 3. Conventions that are easy to get wrong

**Deploy is CLI only.** `vercel --prod`. Pushing to GitHub does **not** deploy
this project. Kyser runs the deploy, an agent should not.

**Two-account git dance.** This repo belongs to `silas-maven`. The default `gh`
account is `hngpt52`, and pushing while it is active gives "Repository not
found", which is a permissions error wearing a 404 costume, not a missing repo.
Switch with `gh auth switch -u silas-maven`, push, switch back.

**Never name the three indicators.** The owner's rule. It is
"the SPArtan Indicator View", never Bollinger bands, moving averages or
stochastics in user-facing copy. This is enforced structurally: all upgrade and
paywall copy lives in `lib/memberFeatures.ts` and call sites pass a feature key
rather than a string. Keep it that way. That module is deliberately dependency
free so client components can import it without dragging Prisma into the browser
bundle.

**No em dashes or en dashes in user-facing copy.** UK English throughout.

**The signal engine is deterministic.** `lib/signals/engine.ts` decides buy and
sell. AI never decides what is true; it writes prose about numbers that were
computed first. Where the deterministic layer cannot support a claim, the brief
refuses it rather than softening it, see `UNAVAILABLE_REASONS`.

**The freemium line, as the owner settled it on 3 August:** the watchlist itself
is free, the signal column is not. Entry and exit levels moved to paid along with
the signal, because printing "Entry 41.20, Exit 58.00" next to a live price gives
the call away by subtraction even with the badge hidden. That reasoning is in
`docs/client-feedback/OWNER-CHANGELOG.md` note 00000, flagged as a judgement call
rather than done silently.

**Verification discipline.** Do not sign in to Clerk as the owner, and do not
seed test rows into the shared production database. The pattern that works is a
temporary harness page under `app/harness-*` with fabricated data, verified in
the browser, then deleted. Several were used and removed this round.

**A gotcha worth knowing:** in the browser pane `document.hidden` is often true,
which suspends rAF, so framer-motion never animates and screenshots come back
black. Read the DOM with `get_page_text` or `javascript_tool` instead of trusting
a screenshot. This is also how a real mount bug in the featured-post rotator got
found, so the false alarm is not always false.

---

## 4. Where the reasoning is written down

- `docs/specs/COMMUNITY-FEED.md` The feed spec, with the owner's four decisions
  and the reasoning behind each, including the moderation window he accepted.
- `docs/client-feedback/OWNER-CHANGELOG.md` What changed and why, in his
  language. Notes 00000 and 00001 are judgement calls surfaced rather than
  buried.
- `STATUS.md` Session log, newest first.
- `lib/community.ts` Feed rules, dependency free, covered by
  `tests/community.test.ts`.
- `scripts/perf-probe.ts` The latency probe from section 2, with instructions
  for reading its output in the header comment.

---

## 5. One thing not to repeat

An asset-identity sweep deactivated the Bitcoin macro tile for a week before
anyone noticed, and it surfaced from a screenshot rather than from a report.
Macro instruments deliberately use an internal `symbol` with the real ticker in
`quoteSymbol`, so any script selecting on `quoteSymbol` must filter
`isMacro: false`. Both audit and fix scripts now do. Eleven of the twelve macro
rows survived that sweep by luck rather than by design, because their internal
symbols happen to be real tickers of other instruments. GOLD is Barrick Gold.
Treat a bulk script touching assets as production surgery.
