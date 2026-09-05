# Send duplicate webhook events safely — review 1

**Verdict: FAIL**

**Implementation reviewed:** `91ff32b9515415e75b9116101ea7097bd6b5231b`
**Documentation HEAD:** `f4fc65d2e9cd8b6b18c90a0b197c51a3d6c16091`
**Live URL:** https://idempotency-rehearsal.sociobot.in/
**Reviewed:** 2026-09-05

The live files SHA-256 match a fresh build at documentation HEAD. The commits after
the last implementation change are report/handoff-only, so the implementation
reviewed is `91ff32b`; the documentation SHA is recorded separately above.

## Job, audience, and first action before scrolling

The product's job is to let backend engineers prove that duplicate, delayed, and
out-of-order webhook deliveries cause one business effect. Its intended audience is
backend engineers testing webhook and workflow handlers. On the fresh live desktop
and phone pages, the first visible action is **Run the rehearsal**. The page does not
name the audience there, does not offer the required **Try it with sample data**
action, and does not say what happens after that action.

## Findings

### High — the required one-click library demo sandbox is absent

`/demo` returns the host's generic Azure 404. The landing-page trace is an
in-page scripted visualization rather than a playground using the published package,
and it has no persistent `Demo — sample data, nothing is saved` label, `Reset demo`,
or `Start for real` control. It therefore cannot be used at the required demo URL or
as the isolated, resettable sample sandbox. Fresh desktop and phone runs did show
realistic populated PASS/FAIL output, including safe → broken → safe recovery, but
that does not supply the required sandbox boundary or package-backed playground.

### High — public claims have no required claims manifest or runnable proof

There is no `.factory/claims.json`, and `rg '@claim:'` finds no tagged claim test.
Consequently no declared claim command can be run from a clean checkout. I count 14
distinct untested public claim families: zero runtime dependencies; no real provider
calls; no telemetry; offline docs/demo; a five-minute setup; a secret-safe report;
inert payment/email adapters; loopback-only HTTP collection; synthetic-ID validation;
stable JSON output; runs locally; stores nothing; sends no analytics; and no personal
data collection/storage. Some are covered incidentally by ordinary tests or browser
observations, but none has the required listed, clean-demo observable test.

### Medium — required site routes, route titles, and product 404 are missing

`/privacy`, `/terms`, `/demo`, `/404`, and an arbitrary missing URL all return the
generic Azure Static Web Apps 404 page, not this product's page or structure.
Footer “Privacy” and “Terms” links are only same-page anchors. There are no route
titles, navigation fallback, or `responseOverrides` 404 configuration; `sitemap.xml`
lists only `/`. The deliberate HTTP 404 status is expected, but the host-generated
page is a defect because the contract requires a designed product 404 with a way
back, plus real product URLs for privacy, terms, and demo.

### Medium — landing copy does not state the required first-screen information in plain words

The H1, “Send it twice. Prove it happens once.” uses an unexplained pronoun and does
not state the job. The first screen does not name backend engineers, and the CTA is
“Run the rehearsal,” rather than a sample-data action plus the result of clicking.
Several headings are metaphor/mood copy rather than direct section names, including
“Watch the same event cross the boundary twice,” “Aim it at localhost,” and “Make
the second delivery boring.” `.factory/copy-audit.md` is also absent, so the required
copy audit cannot show that the public wording was checked.

## Evidence that passed

- From this clean checkout: `npm ci`, `npm test` (10/10), `npm run typecheck`,
  `npm run build`, and `npm run pack:check` all passed. `npm pack` produced the
  publishable tarball.
- In a fresh temporary consumer, the tarball's ESM API returned a passing delayed
  duplicate proof with 2 deliveries, 1 effect, and 0 violations. CommonJS exposed
  `runScenario`; the installed CLI's help was useful; malformed scenario input exited
  2 with `scenario.deliveries must contain at least one delivery.`
- Fresh live desktop (1366×900) and phone (390×844) contexts had no console/page
  errors or horizontal mobile overflow. The safe trace passed, the Broken handler
  showed `FAIL · duplicate effect`, and returning to Idempotent handler passed.
  Keyboard focus was visibly amber; a fresh first Tab reached Skip to main content.
  Reduced motion was honored (`1e-05s`).
- `REHEARSAL_SITE_URL=http://127.0.0.1:4173 npm run test:a11y` and the same command
  against the live URL passed with zero Axe WCAG A/AA violations and all tested
  44px targets. The standalone `@axe-core/cli` could not start because this container
  lacks a system Chrome binary; the repository's Playwright Axe integration (the
  permitted alternative) completed successfully.
- The live service worker controlled the page, `registration.update()` completed,
  and an online visit reloaded offline with the H1 and offline status. Live request
  capture saw only the product origin; local/session storage and cookies were empty.
- Live security headers include CSP with `frame-ancestors 'none'`, X-Frame-Options,
  nosniff, referrer policy, and permissions policy. Fresh build/live hashes matched
  for HTML, JS, CSS, hero image, worker, robots, and sitemap. The build reports
  2.04 kB gzip JS, 4.01 kB gzip CSS, no transferred fonts, and a 52.39 kB hero image.

## Earlier findings disposition

| Earlier finding | Current disposition | Evidence |
| --- | --- | --- |
| Immutable caching, missing CSP/frame protection | Fixed | Current live headers show immutable hashed assets and CSP/frame protections; local static-config test passes. |
| Under-44px mobile brand/footer targets | Fixed | Live repository Axe/touch-target check passes at 390px. |
| Payload text leaked through in-process handler errors | Fixed | The redaction regression is among the 10 passing tests; implementation emits `Handler failed.` instead of raw handler text. |
| Verification-3 no-finding PASS | Superseded by this stricter audit | The new findings are requirements not assessed by that report: demo sandbox, claims manifest, current route skeleton, and first-screen plain words. |

## Scope notes

This is a local npm library/static documentation product, not a backend service. No
tenant, persistence, health, live-request allowance, or 429 endpoint is present to
test. No product code, deployment, registry state, DNS, billing, secrets, or
infrastructure was changed.

**Finding count: 4. Untested public claim count: 14. Verdict: FAIL.**
