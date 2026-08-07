# Moving payments from Stripe to Square: scope

**Status: SCOPE ONLY. No payment code has been changed.**
Requested by the owner, 5 August 2026. Kyser's decision on 5 August was to scope
this before touching anything, and to leave Stripe live in the meantime so the
launch is not blocked on it.

**Read the "Decisions needed" section first.** Two of them change the shape of
the build, and neither is mine to make.

---

## 1. Why this is not a swap

Stripe is doing four separate jobs here. Square replaces three of them
comfortably and one of them not at all.

| Job | Stripe today | Square |
| --- | --- | --- |
| Take the first payment | Hosted Checkout Session, we redirect | Payment Links or Web Payments SDK. Fine. |
| Charge every month after | Stripe Billing subscription | Square Subscriptions (catalogue plan + subscription). Fine, with caveats in §3. |
| Tell us what happened | Webhooks | Webhooks. Fine, different event names. |
| Let the member manage their own card and cancel | **Hosted billing portal, one redirect** | **No equivalent. This has to be built or handled manually.** |

That fourth row is the whole decision. Everything else is renaming.

## 2. What exists today, so the size is honest

Roughly 290 lines across three routes, plus the pieces that read them.

- `app/api/stripe/checkout/route.ts` — creates a Checkout Session for the
  membership price. Straightforward to replace.
- `app/api/stripe/portal/route.ts` — one call, `billingPortal.sessions.create`,
  then a redirect. **This is the file with no Square equivalent.**
- `app/api/webhooks/stripe/route.ts` — the real work. Handles
  `checkout.session.completed` (binds a customer to a profile),
  `customer.subscription.created/updated/deleted`, `invoice.payment_failed` and
  `invoice.payment_succeeded`.
- `prisma`: `StripeCustomer` (profile to customer id) and `SubscriptionMirror`
  (status, period end, last paid, last failed, cancel-at-period-end).
- `lib/subscriptions/overdue.ts` — our own dunning. Stages an overdue member at
  1, 3 and 10 days and eventually revokes access. **This is ours, not Stripe's,
  so it survives the move**, which is worth knowing because it is the part that
  protects revenue.
- `components/BillingPanel.tsx` — the member-facing surface.

The data model is already provider-shaped rather than Stripe-shaped in
everything except two column names (`stripeCustomerId`, `stripeSubscriptionId`)
and one table name. That is a rename migration, not a redesign.

## 3. What Square genuinely costs us

Verify each of these against current Square documentation before building. They
are the points where Square is behind Stripe Billing, stated so the owner is not
surprised after the switch.

1. **No self-service billing portal.** A member who wants to change their card
   or cancel currently does it themselves in Stripe's hosted page. On Square,
   either we build those screens against the Square API, or members email the
   academy and someone does it by hand in the Square dashboard. At 500+ members
   the manual option is a support burden that grows with the business.
2. **Card updates are our problem.** Stripe automatically updates saved cards
   when a bank reissues them. Without that, a proportion of members silently
   fail at renewal each year and have to be chased.
3. **Failed-payment retries are weaker.** Stripe retries failed charges on a
   schedule tuned on its own data. Our overdue staging assumes something is
   retrying underneath it. If Square's retry behaviour is thinner, the staging
   thresholds in `overdue.ts` need revisiting or more members get revoked for
   what is really a temporary card problem.
4. **Fees will differ.** Both charge a percentage plus a fixed fee on UK cards
   and the two are close, but confirm the current published rates for GBP
   online payments rather than assuming they match.
5. **SCA.** UK and EU cards need strong customer authentication. Square supports
   it, but it is an explicit step in their SDK rather than something the hosted
   page handles invisibly, so it has to be built and tested rather than assumed.

## 4. What it buys

Worth stating plainly, since the owner asked for this and presumably has a
reason.

- One provider if the academy already takes payments through Square in person or
  elsewhere. One dashboard, one payout schedule, one reconciliation.
- Square's flat pricing is easier to reason about than Stripe's per-feature
  billing add-ons.
- If the academy has an existing Square relationship, the account is already
  activated and verified, which removes the Stripe approval wait from the
  critical path to launch.

**If none of those apply, this migration is cost without benefit** and the honest
recommendation is to stay on Stripe. That is a question for the owner, not a
technical finding.

## 5. Decisions needed before any code

1. **What happens to "Manage billing"?** Three options: build the card-change and
   cancel screens ourselves (most work, best experience); route members to email
   the academy (no work, ongoing manual load); or offer cancel-only in the app
   and handle card changes by hand. This changes the estimate more than anything
   else on this page.
2. **Why Square?** Specifically, does the academy already have an active,
   verified Square account taking money today? If yes, this is straightforward
   and possibly faster to launch than Stripe. If the answer is that Square is
   simply preferred, the trade-offs in §3 are being paid for a preference.
3. **Migrating existing members.** Nobody is on a live Stripe subscription today,
   so right now the answer is "nothing to migrate". **That stops being true the
   moment the first member pays.** Doing this before launch is a rename. Doing it
   after launch means moving live subscriptions between providers, which
   customers feel, because saved cards do not transfer between processors and
   every member has to re-enter theirs.

## 6. Sequence, if it goes ahead

Ordered so the risky part is provable before anything is thrown away.

1. Rename the provider-specific columns and table to neutral names
   (`billingCustomerId`, `billingSubscriptionId`, `BillingCustomer`). Additive
   migration, no behaviour change, safe to ship on its own.
2. Put the provider behind one interface: start checkout, fetch subscription,
   cancel subscription, verify webhook. Stripe implements it first, unchanged.
   Prove the app still works.
3. Write the Square implementation of that interface behind an environment flag.
4. Build whatever §5.1 decided for billing management.
5. Test in Square's sandbox, including a declined card, an SCA challenge, a
   renewal and a cancellation. **Do not skip the declined card**: our overdue
   staging depends on that event arriving and is the piece most likely to be
   wrong.
6. Flip the flag in production. Keep the Stripe code until a full month of
   renewals has run cleanly, then delete it.

**Rough size, with the portal question unresolved:** steps 1 to 3 and 5 are a
contained piece of work. Step 4 is anywhere from an afternoon to several days
depending on the answer to §5.1, and it is the answer to §5.1 that decides
whether this is a small job or a medium one.

## 7. Recommendation

**Do not do this before launch**, unless the answer to §5.2 is that the academy
already runs on Square. Switching payment provider is the highest-consequence
change available: it is the one part of the system where a bug takes money
incorrectly or fails to take it at all, and it would be going in during the same
week as a domain move, a database move and a first cohort of real members.

**Do decide before launch**, because §5.3 is real. The rename in step 1 is cheap
now and awkward later, and moving live subscriptions is much worse than moving
none.
