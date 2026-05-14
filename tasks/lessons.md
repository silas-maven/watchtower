# Lessons Learned

## 2026-05-14 — Session 1

### Tailwind v4: @keyframes must be at root level
- **Mistake**: Placed `@keyframes` inside `@theme {}` block
- **Symptom**: BorderBeam animation was stationary instead of moving
- **Fix**: Move `@keyframes` declarations outside `@theme {}` — TW4's `@theme` is only for design token variables, not at-rules
- **Rule**: Always define `@keyframes` at root level in CSS, reference them via `--animate-*` vars inside `@theme`

### Env vars for role promotion must exist before profile creation
- **Mistake**: `SPA_OWNER_EMAIL_ALLOWLIST` / `SPA_ADMIN_EMAIL_ALLOWLIST` were never set in `.env`
- **Symptom**: Owner logged in but showed as MEMBER, no admin nav visible
- **Fix**: Added env vars + manually promoted existing profile in DB
- **Rule**: Always verify env vars are set before testing role-gated features. Role promotion only runs on sign-in (profile upsert), so existing profiles need manual DB update

### Admin nav overflow — too many items
- **Mistake**: 8 admin + 7 member = 15 nav items in sidebar, didn't fit on screen
- **Fix**: Consolidated Customer Management + Subscriptions + Access Control → single "Members" hub. Reduced sidebar width from w-80 to w-72, tightened spacing
- **Rule**: Max ~6 items per nav section. Consolidate related admin pages into tabbed hubs rather than separate pages

### Duplicate admin pages waste user attention
- **Mistake**: Created separate pages for customers, subscriptions, and access control that showed overlapping data
- **Fix**: Merged into single `/admin/members` page with sections for profiles, billing alerts, and audit trail
- **Rule**: Before creating a new admin page, verify the data isn't already shown elsewhere. Prefer sections within one page over separate pages for related data
