# 02: End-to-end in Stripe test mode (sandbox)

## Context

Prompt 01 is merged: service mails, mode guard, catalogue sync script and alerts are in main, and production still has billing OFF. Read `plans/feature-stripe-live-release/README.md` and `output-01-hardening.md` first.

This prompt proves the whole payment flow against the Stripe sandbox "ormac bv sandbox" (`acct_1TpSGoCJ75oazdcM`). It runs on a **non-production** deployment: a Convex dev or preview deployment plus a Vercel preview deployment. Production is not touched.

## Rules

- Production Convex and Vercel production env are off-limits.
- Use only sandbox test keys. Create a sandbox **restricted** key with the permission list from `output-01-hardening.md`; a full secret key is not acceptable, so the permission list is tested too.
- **[Ortwin]** creates the key and pastes it directly into the deployment env. It is never pasted into chat, files or commits.
- Test e-mail addresses only, at a domain Ortwin controls. Mails go to those addresses through the real mail provider of the test deployment, or to its sandbox/preview mode.
- Record evidence as IDs and outcomes only: Stripe object IDs in test mode are fine; no e-mail addresses or payloads.

## Set-up

1. Run `node scripts/stripe/sync-catalog.mjs --mode test --dry-run` with the sandbox key in the shell env. Expect "no changes"; if not, stop and report.
2. Create the sandbox webhook endpoint on the test Convex deployment: `--apply --webhook-url https://<test-deployment>.convex.site/stripe/webhook`. **[Ortwin]** puts the printed signing secret into that Convex deployment as `STRIPE_WEBHOOK_SECRET`.
3. Set on the test deployment:

   | Where | Variables |
   |---|---|
   | Convex test deployment | `STRIPE_BILLING_ENABLED=true`, `NEXT_PUBLIC_STRIPE_BILLING_ENABLED=true`, `STRIPE_MODE=test`, `PAID_ACCESS_ENFORCED=true`, `NEXT_PUBLIC_PAID_ACCESS_ENFORCED=true`, `PERSONAL_FIT_SALES_ENABLED=true`, `FITTER_NOTIFICATION_EMAIL=<test address>` |
   | Vercel preview | the same flags; `STRIPE_SECRET_KEY` (sandbox restricted key); the five price/coupon IDs from the README table; `STRIPE_MODE=test`; `PERSONAL_BIKEFIT_AGENDA_URL` (a real or dummy https booking page) |

4. Deploy Convex first, then the Vercel preview. Check `/api/health/config` and the build log line `Vercel deployment preflight passed.`

## Test matrix

Payment methods follow README decision 2: **iDEAL only at checkout, SEPA Direct Debit (the mandate iDEAL creates) for renewals, no cards**. Checkout sets no `payment_method_types`, so the sandbox Dashboard → Payment methods must have iDEAL and SEPA Direct Debit on and cards off; check this before case 1. Use the iDEAL test bank page (Authorize / Fail) and test clocks. For SEPA, use the test IBANs from Stripe's testing docs (verify them there; at the time of writing `NL39RABO0300065264` succeeds and `NL91ABNA0417164300` fails). Run each case NL; also run cases 1, 3 and 6 in EN. Desktop for all; repeat 1 and 3 on mobile (390 px).

| # | Case | Expected |
|---|---|---|
| 1 | Free account buys a losse meting for bike A (iDEAL, Authorize) | Charge €13,50; bike A full, bike B still gated; 3-month expiry; purchase mail once |
| 2 | Checkout without the withdrawal checkbox | Impossible in UI; direct POST without `withdrawalAccepted` is rejected |
| 3 | Annual subscription (iDEAL, Authorize) | First invoice €21,50; all bikes open; 2 gift credits; welcome mail once; the subscription's default payment method is a SEPA Direct Debit mandate |
| 4 | Upgrade within 6 months after case 1 | Session shows €9,50 (coupon applied server-side); invoice €9,50; subscription price €21,50 |
| 5 | Upgrade after the 6-month window (test clock), or for a user without a losse meting | Upgrade not offered; direct POST rejected `UPGRADE_NOT_ELIGIBLE` |
| 6 | Annual + personal bike fit | €234,50 (21,50 + 213,00); "Plan je afspraak" with the agenda link; fitter notification once; renewal later €21,50 |
| 7 | Standalone appointment as an eligible user / as a free user | €209,50 and notification / rejected `PERSONAL_FIT_NOT_ELIGIBLE` |
| 8 | iDEAL Fail on the test bank page, and abandon (close the bank page / back to the site) | Fail and abandon: no access, choice kept, retry with Authorize works; cards are not offered in Checkout |
| 9 | Async SEPA: renew case 3 with the succeeding test IBAN as default payment method, and a second account with the failing IBAN | Renewal access only after the invoice is paid (`invoice.paid`); a failed debit leaves no extended access. If Checkout itself ever returns an async session: access only after `async_payment_succeeded`, failure shows the Mislukt state | Access only after `async_payment_succeeded`; failure leaves no access and shows the Mislukt state |
| 10 | Test clock: advance case 3 by 1 year | Renewal invoice €21,50; entitlement extended to the new period end; renewal reminder sent N days before, once |
| 11 | Renewal payment fails (set the failing test IBAN as default payment method via the Customer Portal before the clock advance) | Access ends at the period end (no grace beyond Stripe's retry settings); no false "paid" state |
| 12 | Cancel in year 1 via the in-app button | `cancel_at_period_end`; access until the end; no refund; cancellation mail |
| 13 | Cancel in year 2 (after case 10) | Subscription cancelled now; pro-rata refund of the €21,50 renewal for the unused days; refund amount matches `renewalRefundCents`; mail shows the amount |
| 14 | Full refund from the Stripe Dashboard of a losse meting | Entitlement revoked; checkout marked refunded |
| 15 | Customer Portal | Invoices and payment method only; no cancel or plan switch |
| 16 | Replay an already-processed event from the Dashboard (or `stripe events resend`) | `duplicate: true`; no second grant, no second mail |
| 17 | Send an event signed with a wrong secret | 400, nothing stored |
| 18 | Deactivate the sandbox annual price temporarily, then try to check out | `STRIPE_PRICE_MISMATCH`, no session; Sentry/alert fires; reactivate afterwards |
| 19 | Gift measurement: annual subscriber gives one, the recipient redeems, then upgrades for €9,50 | Works as in `plans/pricing-stripe/` S2 |
| 20 | Rollback drill: set both billing flags to false on the preview, redeploy | Checkout shows the not-implemented message; existing paid entitlements stay; webhook returns 501 (Stripe will retry) |
| 21 | Turn the flags back on | Stripe retries from case 20 are processed; no duplicates |

After the matrix:
- Check the sandbox Dashboard → Webhooks for zero failed deliveries, or explain each one.
- Check the Convex logs for `BILLING_ALERT` lines and explain each one.

## Usability check (optional but recommended)

Before live, run the test from `plans/pricing-v3/RELEASEPLAN.md` (Testplan, layer 3) with 5 cyclists on the preview. Goal: 4 out of 5 can explain without help what is free, what paid adds and what happens after expiry.

## Acceptance criteria

- All 21 cases pass, or each failure has a fix merged to main and the case is rerun.
- The restricted key was enough for every case. If a permission was missing, the list in `docs/VERCEL_DEPLOYMENT.md` is corrected.
- Every amount Stripe charged equals the catalogue.

## Output

- `plans/feature-stripe-live-release/output-02-sandbox.md`: a table per case with date, Stripe test object IDs, result and notes, plus webhook delivery stats.
- Update the README progress table. Print `DONE 02` and stop: **gate, wait for Ortwin's go**.
