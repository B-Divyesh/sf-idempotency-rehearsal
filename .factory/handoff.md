# Release handoff — PASS

**Implementation SHA:** `6858371876c35a65ae3ba919dbcf19ea07ce3641`
**Prior documentation SHA:** `b5750e70b83b5810255cc868a11a42d0a77a9fa3`
**Live URL:** https://idempotency-rehearsal.sociobot.in/
**Released:** 2026-09-05

## What changed

Idempotency Rehearsal now provides the complete local proof workflow for backend
engineers checking whether duplicate, delayed, and reordered webhooks cause one
business effect:

- `/demo?demo=1` is a one-click browser playground using the package's new
  `idempotency-rehearsal/browser` entry. It runs two synthetic order deliveries
  through an in-memory recorder, shows PASS/FAIL output, supports a broken and
  reordered path, and recovers to the idempotent path.
- The demo has the persistent **Demo — sample data, nothing is saved** banner,
  **Reset demo**, and **Start for real**. Its only browser-storage marker is
  `sessionStorage['demo:idempotency-rehearsal:active']`; no sample data or real
  storage namespace is used.
- The landing screen now names the job, the backend-engineer audience, and the
  sample first action. Its three facts are free MIT licensing, local test use,
  and inert sample adapters. `.factory/copy-audit.md` records the plain-language
  review and terminology.
- Added real `/privacy`, `/terms`, `/demo`, `/404`, and product-owned 404
  response behavior. Every route has its own title, canonical URL, description,
  Open Graph/Twitter metadata, heading, header, footer, and skip link. The
  sitemap lists public routes.
- Added `staticwebapp.config.json` 404 rewriting while retaining the deliberate
  HTTP 404 status. The existing restrictive CSP, frame protection, immutable
  hashed assets, and no-store HTML policy remain in place.
- Added an original-art-derived 1200×630 social card. Its provenance is in
  `.factory/design.md`.
- Added `.factory/claims.json` with 11 observable `@claim:` tests. The browser
  suite covers the sandbox, reset/isolation, broken/recovery and reordered
  paths, offline revisit, same-origin requests, inert adapters, report
  redaction, loopback rejection, and validation. The consumer test installs
  the packed artifact in a clean temporary project and verifies ESM, CommonJS,
  browser entry, and CLI behavior against a loopback handler.
- Added `.factory/catalog-description.txt` and copied it to
  `/work/.evidence/catalog-description.txt`.

## Verification

From a clean dependency install (`npm ci`) at the implementation SHA:

```sh
npm test                 # 2 files, 9 tests passed
npm run typecheck        # passed
npm run build            # package and static site passed
npm run pack:check       # passed
npm run test:consumer    # packed ESM/CommonJS/browser/CLI proof passed
npm pack --dry-run       # 28 files, 35.6 kB packed
npm run test:claims      # all 11 declared claims passed
```

Each exact command in `.factory/claims.json` was also run from that clean setup.
`REHEARSAL_SITE_URL=https://idempotency-rehearsal.sociobot.in npm run test:a11y`
passed on `/`, `/demo`, `/privacy`, `/terms`, and the deliberate missing route,
at 390×844 and 1366×900: zero console/page errors, zero Axe WCAG A/AA
violations, 44px targets, keyboard tab/arrow operation, and reduced motion.

Fresh live desktop and phone contexts confirmed the first-screen headline,
backend-engineer audience sentence, **Try it with sample data** action, and all
three facts before scrolling. The live demo populated 2 deliveries and 1 effect,
showed the persistent sample banner, reset to empty output, used only the
`demo:` marker, and returned home with **Start for real**. Live request capture
saw only the product origin. The service worker controlled `/demo`, completed an
update check, and reloaded its heading offline after an online visit.

Live route check: `/`, `/demo`, `/privacy`, `/terms`, and `/404` return their
product pages with expected titles; `/missing-page` returns HTTP 404 with the
product-designed 404 page. Fresh-build SHA-256 values matched the live HTML,
route pages, JavaScript, CSS, service worker, sitemap, favicon, and both product
images (13/13). Live hashed JavaScript returns `max-age=31536000, immutable` and
the site sends CSP, `frame-ancestors 'none'`, X-Frame-Options, nosniff, and
referrer policy headers.

Local mobile Lighthouse: Performance 100, Accessibility 100, Best Practices
100, SEO 100; FCP 1.0 s, LCP 1.2 s, CLS 0, TBT 0 ms. The first-load JavaScript
is 3.69 kB gzip, CSS 3.42 kB gzip, and the 52.39 kB hero image is within budget.

## Earlier findings disposition

| Finding | Current disposition | Evidence |
| --- | --- | --- |
| No one-click package-backed demo sandbox | Fixed | `/demo?demo=1`, browser package entry, label/reset/exit, isolation checks |
| Public claims had no manifest or runnable proof | Fixed | 11-entry `.factory/claims.json`; all tagged checks pass |
| Privacy, terms, demo, 404 routes and per-route titles missing | Fixed | Live route/title and 404 status checks; sitemap and SWA configuration |
| First screen used metaphor copy and omitted audience/action result | Fixed | Plain job headline, audience sentence, direct sample CTA, copy audit |
| Immutable caching / CSP / mobile targets | Remains fixed | Live header and 390px Axe/touch-target checks |
| Payload-derived handler errors could leak | Remains fixed | Unit and claim redaction tests; packed consumer path |

## Deployment

Deployed `dist/site` directly to the product's existing
`sf-idempotency-rehearsal` Azure Static Web App production environment. This is a
static product with no backend, database, volume, billing offer, tenant state, or
external integration. The researched brief is free, so no billing-offer metadata
is required and no paid deliverable was changed.

## Known gaps and next steps

No known release-blocking gaps. The factory owns npm registry publication;
inspect with `npm pack --dry-run` and publish only after version review. The
product has no paid tier and no external provider dependency.
