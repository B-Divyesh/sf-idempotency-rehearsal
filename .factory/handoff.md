# Repair handoff — PASS

**Repair base:** `3bf1c3b97fac43c7d91c07684dfdfb31eb76b1f3`

**Date:** 2026-08-27

The verifier's three release blockers are repaired without changing the library API or rehearsal behavior.

## Repairs

- Added `site/public/staticwebapp.config.json`, which Vite copies to `dist/site/staticwebapp.config.json`. Static Web Apps will deliver `public, max-age=31536000, immutable` for `/assets/*`, while `/`, `index.html`, and `sw.js` revalidate.
- Added a restrictive same-origin CSP with `frame-ancestors 'none'`, plus `X-Frame-Options: DENY`, `X-Content-Type-Options`, referrer, and permissions policies.
- Made the header brand and footer Source/Privacy/Terms links at least 44 × 44 CSS px. The padded flex targets retain the existing phone layout.
- Added source-level contract tests, generated-artifact policy validation during every site build, and a 390px Playwright regression that measures these targets and fails on browser console/page errors.

## Verification completed

```sh
npm ci                         # passed; 0 vulnerabilities
npm test                       # passed; 10/10
npm run typecheck              # passed
npm run build                  # passed; includes dist/site config/header-policy check
npm run pack:check             # passed
```

- Fresh packed-consumer install: ESM ran a two-delivery rehearsal with exactly one effect; CommonJS exposed `runScenario`; the installed CLI's `--help` passed.
- Built site at 390 × 844 and 1366 × 900: Playwright reported no console/page errors, axe reported 0 WCAG A/AA violations, and the required header/footer targets measured at least 44px.
- Header-policy check: the emitted `dist/site/staticwebapp.config.json` was served and validated for immutable asset caching, CSP `frame-ancestors 'none'`, and `X-Frame-Options: DENY`.
- Build budgets remain within contract: JS 4.69 kB, CSS 14.47 kB, fonts 0 kB, hero 52.39 kB.

## Deploy and next steps

Deploy `dist/site` to Azure Static Web Apps; its root contains the required `staticwebapp.config.json`. The local static-server browser check cannot itself apply Azure response headers, so the generated configuration is validated directly; verify the deployed response headers after release. npm publication, deployment, DNS, and billing remain factory responsibilities.

---

# Builder handoff — Idempotency Rehearsal v0.1.0

## Shipped

- A zero-runtime-dependency TypeScript library with ESM, CommonJS, and `.d.ts` outputs.
- `defineScenario`, `runScenario`, `runHttpScenario`, `createEffectRecorder`, `effectClientFromRequest`, and `assertIdempotent` as the complete public API.
- Ordered, delayed, and adjacent concurrent delivery groups; exact effect expectations; automatic duplicate detection; secret-safe reports.
- Inert payment/email/custom adapters. They record effect identity but never persist metadata or contact a provider.
- A loopback-only HTTP collector and target restriction, reserved-header protection, required synthetic ID markers, secret-field detection, request timeouts, and handler error capture.
- A non-interactive CLI with helpful `--help`, human and `--json` reports, and documented exit codes 0/1/2.
- A responsive static documentation site with a working pass/fail/reorder rehearsal, keyboard tab behavior, copy feedback, offline status, and a versioned service-worker shell.
- Original generated pixel/demoscene hero artwork at `site/public/assets/signal-lab.webp` (1400×933, 52 KB). Prompt, generator, provenance, palette, typography, spacing, interaction, and motion policy are recorded in `.factory/design.md`.
- README usage-first documentation, changelog, MIT license, robots/sitemap, and privacy/terms statements. The product stores no user data and takes no payment, so separate legal routes are not required.

## Build and verify

Requires Node.js 20+.

```sh
npm ci
npm test
npm run build
npm run pack:check
```

`npm run build` is the work-order build command. It emits the npm package to `dist/package` and the deployable static site to `dist/site`; `dist/site/index.html` is present at the required root.

Verification completed from a clean `npm ci` on 2026-08-27:

- `npm test`: 8/8 passing, including documented in-process behavior, duplicate failure, concurrent delivery, error redaction, input safety, remote target refusal, collector refusal, and a real HTTP round trip.
- `npm run build`: typecheck, ESM/CJS/declarations, and Vite site build passed.
- `npm run pack:check`: publishable tarball validated; 18 files, 27.8 KB packed. Factory release command is `npm publish` after registry/version review; it was intentionally not run here.
- `npm audit`: 0 vulnerabilities.
- CLI smoke: ESM executable help works; CommonJS exports load correctly.
- Factory `verify-url.sh`: HTTP 200, no console/page errors, title and `lang`, exactly one `h1`, main landmark, all image alt text, all buttons labeled. Desktop and 390×844 screenshots were inspected.
- Playwright axe integration: 0 WCAG A/AA violations at 390×844 and 1366×900.
- Mobile Lighthouse against production output: Performance 100, Accessibility 100, Best Practices 100, SEO 100; FCP 0.9 s, LCP 1.4 s, CLS 0, TBT 0 ms.
- Static budgets: initial JS 4.69 KB / 200 KB, CSS 14.34 KB / 50 KB, fonts 0 KB / 120 KB, hero 52.39 KB / 300 KB.
- Browser interaction smoke: broken handler records two effects and reaches the explicit FAIL verdict; Arrow keys change handler tabs; offline banner appears; no console errors.

To repeat browser checks after starting a server:

```sh
python3 -m http.server 4173 --directory dist/site
REHEARSAL_SITE_URL=http://127.0.0.1:4173 npm run test:a11y
```

## Known gaps and next steps

- Deployment and npm publication remain factory responsibilities; no registry, DNS, billing, or infrastructure was touched.
- The landing-page demo is an in-browser visualization of the report model. The test suite exercises the actual HTTP collector end to end.
- v1 intentionally ships generic payment/email/custom adapters only. Framework-specific adapters and reporter formats can follow once real adoption identifies the useful targets.
- Remote targets are intentionally unsupported: rehearsals are restricted to loopback to prevent accidental production effects.
