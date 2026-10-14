# Stripe live release: from sandbox to production payments

**Owner:** Ortwin · **Written:** 7 October 2026 · **Starting point:** `origin/main` @ `fd27c3f`
**Status:** not started

## Goal

Let customers of bikefitboost.com really pay for the losse meting, the jaarabonnement, the upgrade, the jaarabonnement + persoonlijke bikefit and the standalone appointment. Move the Stripe set-up that now exists only in the sandbox to the live Stripe account. Prove the full flow in test mode first, then with one real payment and refund in production.

## Background: what already exists

The release is mostly configuration, verification and a few missing links. The payment code itself was built and merged under `plans/pricing-v3/` and `plans/pricing-stripe/`.

**In the code (main, behind flags that are OFF in production)**
- Price catalogue `shared/pricing/products.ts`:
  - single €13,50;
  - annual €21,50 per year, renews at €21,50;
  - annual_upgrade €9,50 in the first year, then €21,50 (6-month window);
  - annual_personal €234,50, then €21,50;
  - personal_fit_standalone €209,50.
  - The upgrade is built as the annual price plus coupon €12,00 `once`. The bundle is the annual price plus a one-off €213,00 item.
- Checkout:
  - Next route `src/app/api/stripe/checkout/route.ts`. Reservation in Convex `convex/stripe/checkout.ts`.
  - Before each session `validateCheckoutPrices()` checks the Stripe prices against the catalogue. A misconfigured price can never charge the wrong amount.
- Webhook:
  - Runs on **Convex**: `POST /stripe/webhook` in `convex/http.ts` → `convex/stripe/webhook.ts`, which verifies the signature.
  - Then `convex/stripe/events.ts`, idempotent by event id.
  - Handled events:
    - `checkout.session.completed`, `checkout.session.expired`;
    - `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`;
    - `invoice.paid`, `invoice.payment_failed`, `invoice.payment_action_required`;
    - `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`;
    - `charge.refunded`, `invoice_payment.paid`.
- Other routes:
  - Customer Portal (invoices and payment method only): `src/app/api/stripe/portal/route.ts`.
  - In-app cancellation and pro-rata refund in year 2+: `src/lib/billing/cancelSubscription.ts`.
- Flags:
  - `isStripeBillingEnabled()` (`src/config/billing.ts`) needs `STRIPE_BILLING_ENABLED=true` **and** `NEXT_PUBLIC_STRIPE_BILLING_ENABLED=true`. They must be set in Vercel **and** in the Convex deployment.
  - `isPaidAccessEnforced()` (`shared/pricing/flags.ts`) needs `PAID_ACCESS_ENFORCED` / `NEXT_PUBLIC_PAID_ACCESS_ENFORCED`, also in Vercel and Convex.
  - OFF means every Stripe path returns `STRIPE_NOT_IMPLEMENTED`.
- Env:
  - Vercel: `STRIPE_SECRET_KEY`, `STRIPE_ANNUAL_PRICE_ID`, `STRIPE_SINGLE_FIT_PRICE_ID`, `STRIPE_PERSONAL_FIT_ADDON_PRICE_ID`, `STRIPE_PERSONAL_FIT_STANDALONE_PRICE_ID`, `STRIPE_UPGRADE_COUPON_ID`.
  - Convex: `STRIPE_WEBHOOK_SECRET`.
  - `scripts/check-vercel-env.mjs` and `/api/health/config` require them only when billing is on.
- Transition for existing users: `pricing/internal:beginTransition` / `continueTransition` (dry-run first). Runbook: `plans/pricing-v3/audit/P1-transition-runbook.md`.

**In the Stripe sandbox "ormac bv sandbox" (`acct_1TpSGoCJ75oazdcM`, test mode), checked 7 Oct 2026**

| Catalogue key | Stripe object | ID | Lookup key | Amount |
|---|---|---|---|---|
| annual | product `bfb_annual`, recurring yearly price | `price_1UMvc5CJ75oazdcM079bPqkW` | `annual_yearly_2150` | €21,50, tax inclusive |
| single | product `bfb_single_fit`, one-off price | `price_1UMvc6CJ75oazdcMjEpH4Ycy` | `single_fit_1350` | €13,50 |
| personal fit add-on | product `bfb_personal_fit_addon`, one-off price | `price_1UMvc8CJ75oazdcMJklTMENP` | `personal_fit_addon_21300` | €213,00 |
| personal fit standalone | same product, one-off price | `price_1UMwB8CJ75oazdcMwOK82DaP` | `personal_fit_standalone_20950` | €209,50 |
| upgrade | coupon | `UPGRADE_SINGLE_FIT_1200` | — | €12,00 off, `once` |

There is one more price, `personal_fit_standalone_19900` (€199,00). It is **inactive** and must not be recreated in live. **No webhook endpoint exists yet**, in the sandbox or live.

**Gaps found while writing this plan (fixed in prompt 01)**
1. The service mails exist as templates in `convex/emails/templates/pricing.ts` but nothing sends them: purchase confirmation, subscription welcome, access expired, renewal reminder and cancellation confirmation.
2. The fitter notification (`convex/pricingAppointments/internal.ts`) stops at `pending_integration`, so no mail goes out.
3. `PERSONAL_BIKEFIT_AGENDA_URL` and `FITTER_NOTIFICATION_EMAIL` are read in code but missing from `.env.example`, the preflight and the health route. The checkout still shows `[AGENDALINK]`.
4. Live data has no guard against test-mode events: `event.livemode` is stored, but not checked against the key mode.
5. `docs/VERCEL_DEPLOYMENT.md` still describes the old `STRIPE_PRO_MONTHLY_PRICE_ID` set-up.
6. Nothing can recreate the sandbox catalogue in live mode reproducibly. A sandbox is a separate account, so products and prices cannot be copied. They must be created again with the same product IDs, lookup keys and amounts.
7. Checkout and webhook failures are logged with `console.error` only; there are no Sentry alerts.

## Scope

- Close the gaps above, with tests.
- Run the full test-mode matrix on a non-production deployment with the sandbox.
- Set up the live Stripe account, live catalogue, live restricted key and live webhook. Set the production env in Vercel and Convex.
- Go live in controlled steps:
  - billing on, with one real payment, refund and cancellation;
  - paid access enforcement on;
  - the transition for existing users and its announcement;
  - 48 hours of monitoring.
- Rollback procedure.

## Out of scope

- New products, price changes or new UI. The boards and copy from `plans/pricing-stripe/` are final for this release.
- Booking appointments inside the app. The agenda link stays external.
- Marketing mails beyond the existing service mails.

## Approach

Four prompts, in order. Each ends at a **gate** that needs Ortwin's explicit "go" before the next starts. Steps marked **[Ortwin]** require the Stripe Dashboard, a live secret or a legal decision; the agent prepares them and stops.

| # | Prompt | Who | Ends with |
|---|---|---|---|
| 01 | `01-release-hardening.md`: close the code gaps, catalogue sync script, docs | agent | PR to main, all gates green, flags still OFF |
| 02 | `02-sandbox-end-to-end.md`: full test-mode matrix on a non-production deployment | agent + Ortwin | Evidence in `output-02-sandbox.md`, zero open findings |
| 03 | `03-live-setup.md`: live Stripe account, catalogue, key, webhook, production env (flags OFF) | Ortwin + agent | Production deployed with live config, billing still OFF, health green |
| 04 | `04-go-live.md`: announcement, transition, billing ON, real payment and refund, enforcement ON, monitoring | Ortwin + agent | Go-live checklist complete, `output-04-golive.md` |

## Decisions Ortwin must make (before prompt 03 at the latest)

Each answer goes into this README under "Decisions" with a date.

1. **VAT:** use Stripe Tax (with a `txcd_` tax code per product), or keep fixed tax-inclusive prices without Stripe Tax. The sandbox prices are `tax_behavior: inclusive` with no tax code.
2. **Payment methods for renewals:** cards, SEPA Direct Debit (via iDEAL mandate), Bancontact. Which of them, in which order.
3. **Legal review done:** terms, privacy statement, withdrawal-right text and the appointment's cancellation conditions. The question whether annual auto-renewal plus pro-rata refund on cancellation fits Dutch consumer law (art. 7:236 sub j BW) also belongs to the lawyer.
4. **Personal bike fit content:** `[LOCATIE]`, `[DUUR AFSPRAAK]`, `[VOORWAARDEN AFSPRAAK — juridisch toetsen]`, the agenda URL and the fitter's notification address. Until these are filled, the two appointment products (annual_personal, personal_fit_standalone) must not be sellable. Prompt 01 adds a switch for this.
5. **Renewal reminder:** how many days before renewal (proposal: 30) and whether it is a service mail (proposal: yes).
6. **Go-live date** and the moment of the announcement (14 days before, per `plans/pricing-v3/RELEASEPLAN.md`).
7. **Transition offer** for existing accounts (one free losse meting): yes/no. This decides whether prompt 04 runs the transition.

## Acceptance criteria (whole release)

- A real customer can buy each product on bikefitboost.com and gets the right access and the right mail:
  - losse meting: that bike only, 3 months;
  - annual: all bikes, 12 months, 2 gift measurements;
  - upgrade €9,50 within 6 months;
  - annual + personal fit €234,50, with "Plan je afspraak" and the fitter notified;
  - standalone appointment €209,50 for eligible users.
- Every amount Stripe charges matches `shared/pricing/products.ts`. A misconfigured live price blocks checkout instead of charging.
- A test-mode event can never change production data, and the reverse.
- A test clock proves renewal at €21,50, cancellation in year 1 (access until the end, no refund) and cancellation in year 2 (pro-rata refund).
- The webhook endpoint delivers 100% of events without errors in the first 48 hours, or every failure is explained and replayed.
- Rollback is documented and tested on the preview deployment. Setting the billing flags to false stops new purchases and keeps paid entitlements.
- No secret, user ID, e-mail address, body measurement or payload appears in commits, audit files or analytics.

## Progress

| Step | Status | Date | Evidence |
|---|---|---|---|
| 01 | done, live (PR #31, 0ec8d367) | 8 Oct 2026 | `output-01-hardening.md`; all gates green, flags OFF |
| 02a | done, live (PR #32, 39c1cf38): rider redemption of the free transition measurement | 8 Oct 2026 | `audit/02a-notes.md` |
| 02 | open | | |
| 03 | open | | |
| 04 | open | | |

## Decisions

| # | Decision | Date |
|---|---|---|
| 1 | VAT: fixed tax-inclusive prices, **no Stripe Tax**. The accountant must confirm the invoice content. | 7 Oct 2026 |
| 2 | Payment methods: **iDEAL, with SEPA Direct Debit (via the iDEAL mandate) for renewals**. No cards, no Bancontact for now. | 7 Oct 2026 |
| 3 | Legal review: open. | |
| 4 | **Go live without appointment products.** `PERSONAL_FIT_SALES_ENABLED` stays `false` in production; the cards show "binnenkort beschikbaar". | 7 Oct 2026 |
| 5 | Renewal reminder: open (default 30 days, service mail). | |
| 6 | Go-live date: open. | |
| 7 | Transition offer: **yes**, one free losse meting for existing accounts with a report; prompt 04 runs the transition. | 7 Oct 2026 |
