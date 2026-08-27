# Independent verification — FAIL

**Candidate:** `c20ea22833f06503e9ef4d1ed75b27816e78f616`

**Live URL:** https://idempotency-rehearsal.sociobot.in/
**Verified:** 2026-08-27 (Node 22.23.2, npm 10.9.8)

The library fulfils the researched job-to-be-done in normal local use: it can deliver synthetic duplicate/reordered HTTP events to a loopback handler, observe inert effects, and fail a duplicate. The deployment is byte-for-byte aligned with the candidate build. This is nevertheless a **FAIL** against the supplied release contract because the deployed hashed static assets are not immutable/long-lived cached, mobile touch targets miss the stated 44px minimum, and the public site has no CSP or anti-framing policy.

## Verified passing evidence

### Clean build and package

From a clean checkout at the candidate SHA:

```sh
npm ci                         # 0 audit vulnerabilities
npm test                       # 8/8 passing
npm run typecheck              # passing
npm run build                  # passing; dist/package and dist/site created
npm run pack:check             # passing
```

`npm pack --dry-run` reports 18 files, 27.8 kB packed / 164.1 kB unpacked. The build emits ESM, CommonJS, and declarations.

I packed the candidate, installed the tarball into a fresh temporary consumer, and exercised its published surface rather than its source:

- ESM and CommonJS both exposed `runScenario`.
- A loopback HTTP handler using the published `effectClientFromRequest` received a delayed duplicate and produced `{ passed: true, deliveries: 2, effects: 1 }` under an exact expectation.
- The published CLI completed the same delayed-duplicate HTTP rehearsal with exit `0` and JSON `{ passed: true, deliveries: 2, effects: 1 }`.
- `--help` is useful; malformed `{"name":"bad","deliveries":[]}` exits `2` with `scenario.deliveries must contain at least one delivery`.

The repository tests additionally cover duplicate detection, adjacent concurrent delivery, handler-error reporting without payload leakage, empty/live/unmarked/secret-bearing inputs, remote-target refusal, non-loopback collector refusal, and a real HTTP duplicate round trip.

### Product, safety, and browser behavior

- Normal, boundary, malformed, and recovery paths were exercised. The local interactive demo reached its explicit duplicate `FAIL`, then returned to a safe handler and reached `PASS · exactly one effect`. Arrow-right selected and focused the next tab. The skip link was first in tab order and had a visible 3px outline.
- At both 1366×900 and 390×844, `npm run test:a11y` found **0** axe WCAG A/AA violations locally and against the live URL. There were no console errors or page errors in either viewport.
- At 390px there was no horizontal overflow (`scrollWidth === clientWidth === 390`). Desktop and mobile renders were manually inspected.
- Under `prefers-reduced-motion: reduce`, the demo still completed and transitions computed to `0.01ms`; the media query matched.
- The live and local service worker controlled the page. After an online load, an offline reload rendered the complete h1 (`Send it twice. Prove it happens once.`) locally and in production.
- Browser request capture on the live page saw only `https://idempotency-rehearsal.sociobot.in`; there are no analytics/network fonts/third-party runtime scripts. Live `localStorage`, `sessionStorage`, and cookies were empty. The only external URL is a user-initiated GitHub link.
- The library records only effect identity. Tests confirm payload values and handler-error payload data are absent from reports. The HTTP runner and collector reject non-loopback endpoints; defaults make no real provider calls.

### Deployment parity and budgets

The live `index.html`, JavaScript, CSS, hero WebP, `sw.js`, `robots.txt`, and `sitemap.xml` each had the same SHA-256 as the freshly built candidate output. The live page therefore matches the candidate, not merely its text.

| Asset | Size | Budget | Result |
| --- | ---: | ---: | --- |
| Initial JS | 4.69 kB (2.06 kB gzip) | 200 kB | Pass |
| CSS | 14.34 kB (4.02 kB gzip) | 50 kB | Pass |
| Fonts | 0 kB | 120 kB | Pass |
| Hero WebP | 52.39 kB | 300 kB | Pass |

Production serves HTTPS with HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `X-DNS-Prefetch-Control: off`, and no console/page errors.

## Defects

### Medium — hashed static assets are revalidated every 30 seconds, not immutable cached

All production assets, including `/assets/index-rM1yisWI.js`, `/assets/style-DPMw9CiH.css`, and `/assets/signal-lab.webp`, return:

```text
Cache-Control: public, must-revalidate, max-age=30
```

The asset names are content-hashed, so this misses the required long-lived immutable caching policy and needlessly revalidates every client asset on repeat visits. Configure the static host so hashed `/assets/*` files receive a long-lived `public, max-age=31536000, immutable` policy; keep HTML and `sw.js` short-lived/revalidated.

### Low — four visible mobile link targets are under 44px tall

At 390×844, the header brand link measured 202×22px; footer `Source`, `Privacy`, and `Terms` links measured 43×14px, 50×14px, and 36×14px. This violates the product contract's 44×44px touch-target floor even though axe found no serious/critical issue. Add padded hit areas while preserving the visual layout.

### Low — production response lacks CSP and anti-framing protection

The live response has no `Content-Security-Policy`, `X-Frame-Options`, or equivalent `frame-ancestors` policy. The site currently has no user data or inline third-party content, but a restrictive CSP and `frame-ancestors 'none'` would materially reduce script-injection/clickjacking exposure. This is a deployment-header change; it does not require changing library behavior.

## Scope notes

The site uses a service worker but has no web manifest or installable-PWA claim. Offline reload was tested because the site explicitly promises offline lab mode; a service-worker update simulation is not applicable to a non-PWA release. No product code, deployment, DNS, billing, npm registry, or secrets were changed during verification.
