# Independent verification — PASS

**Candidate:** `7ba5d1e11ea2e7809444fa74fc7709b2e7cef449`
**Live URL:** https://idempotency-rehearsal.sociobot.in/
**Verified:** 2026-08-27 (Node 22.23.2, npm 10.9.8)

## Verdict

**PASS.** This candidate satisfies the researched job: it is a local, publishable TypeScript library and CLI that delivers declared synthetic duplicate, delayed, concurrent, and reordered HTTP sequences to a loopback handler; receives deliberately inert adapter records; and makes the proof fail when a logical effect count is wrong. The production static site is a byte-for-byte match for the candidate build and met the functional, privacy, security, accessibility, and performance checks below.

No product code, deployment configuration, DNS, billing, registry state, or secrets were changed by this verification.

## Clean checkout and publishable package

The clean checkout was already at the exact candidate SHA with no pre-existing working-tree changes. The following all passed:

```sh
npm ci                 # 0 audit vulnerabilities
npm test               # 2 files / 10 tests passing
npm run typecheck      # passing
npm run build          # package + dist/site passing
npm run pack:check     # passing
npm pack --dry-run     # 18 files; 28.2 kB packed, 165.2 kB unpacked
```

I created a real tarball, installed it into a newly created empty consumer, and used only the installed package. ESM and CommonJS exports both exposed the documented API. The installed library and CLI were exercised against a temporary loopback HTTP handler with its test-only `effectClientFromRequest` adapter:

- Normal reordered/delayed duplicate: 2 deliveries, 1 inert email effect, 0 violations.
- Concurrent `parallelGroup` boundary: 2 deliveries, 1 effect, 0 violations.
- Broken handler: 2 deliveries, 2 effects, 1 exact-count violation (correctly fails).
- Recovery with a fresh idempotent handler/key: 2 deliveries, 1 effect, 0 violations.
- HTTP 503 path: both deliveries become delivery errors; no effect is recorded.
- Malformed empty scenario rejects; a remote target is rejected; installed CLI gives malformed input exit code 2.
- Installed CLI `run ... --json` produced a passing 2-delivery/1-effect report.
- The packed in-process API was separately given a payload-derived thrown error. Its serialized report contained `Handler failed.` and did not contain the raw marker.

This confirms the documented normal, boundary, malformed, failure, and recovery paths from a consumer installation, rather than source imports.

## Privacy and safety

- The library's payment/email adapters record only adapter/action/idempotency-key. They do not contact providers. HTTP rehearsals and effect collectors reject non-loopback addresses.
- Synthetic identifiers and secret-bearing payload-field names are validated before delivery. The redaction regression above confirms an allowed payload value cannot escape in an in-process handler error report.
- Browser capture at desktop and 390 px mobile saw only the page's own origin. No analytics, third-party runtime scripts, remote fonts, cookies, localStorage, or sessionStorage were present. The only external URL is the user-initiated GitHub link.
- The site has a local privacy/terms notice and does not collect data or take payment, so separate data-processing routes are not required by the product contract.

## Site behavior, accessibility, and responsive checks

`npm run test:a11y` passed against both the production build served locally and the live URL: zero browser/page errors and zero axe WCAG A/AA violations at 1366x900 and 390x844. Manual Playwright checks on the live deployment also confirmed:

- One `h1`, `main`, `lang="en"`, descriptive title/alt text, and no horizontal overflow at 390 px.
- The first Tab reaches the skip link. Its designed focus ring is visible; ArrowRight selects and focuses the next handler tab.
- Keyboard Enter/Space drove Broken handler to `FAIL · duplicate effect`, then Idempotent handler to `PASS · exactly one effect`.
- Reduced-motion emulation matched; transition duration was `0.00001s` and the demo remains usable.
- Visual desktop and 390 px renders were inspected. Header/footer targets meet the 44 px floor.
- The service worker registered, `registration.update()` completed, and after an online visit the live deployment reloaded offline with the complete H1. The site has no web manifest or installability claim, so it is not presented as an installable PWA.

## Deployment parity, headers, caching, and budget

Freshly built candidate artifacts exactly SHA-256 matched live responses for `index.html`, hashed JavaScript/CSS, `signal-lab.webp`, `sw.js`, `robots.txt`, and `sitemap.xml`. `staticwebapp.config.json` is correctly consumed as host configuration and deliberately is not a public URL.

Production returns HTTPS/HSTS, restrictive same-origin CSP with `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive Permissions Policy. HTML and `sw.js` are `no-cache, no-store, must-revalidate`; hashed JS/CSS/WebP assets are `public, max-age=31536000, immutable`.

| Asset | Transfer size | Budget | Result |
| --- | ---: | ---: | --- |
| Initial JS | 4.69 kB (2.04 kB gzip) | <= 200 kB | Pass |
| CSS | 14.47 kB (4.01 kB gzip) | <= 50 kB | Pass |
| Fonts | 0 kB | <= 120 kB | Pass |
| Hero WebP | 52.39 kB | <= 300 kB | Pass |

Live mobile Lighthouse: Performance **100**, Accessibility **100**, Best Practices **100**, SEO **100**; FCP 1.2 s, LCP 1.2 s, CLS 0, TBT 20 ms.

## Defects and follow-up

No release-blocking, high, medium, or low defects were found in the tested candidate or matched deployment. No follow-up is required for this verification.
