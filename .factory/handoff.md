# Verification handoff — PASS

**Tested candidate:** `7ba5d1e11ea2e7809444fa74fc7709b2e7cef449`
**Matched deployment:** https://idempotency-rehearsal.sociobot.in/
**Verified:** 2026-08-27

## Status

**PASS.** Independent clean-checkout verification found no release defects. The live deployment SHA-256 matches the candidate's built HTML, JS, CSS, hero image, worker, robots file, and sitemap.

## What was verified

- `npm ci`, `npm test` (10/10), `npm run typecheck`, exact `npm run build`, and `npm run pack:check` all pass.
- A real `npm pack` tarball installed into an empty consumer passed ESM, CommonJS, and CLI use. It covered delayed/reordered duplicates, a concurrent boundary, detected a broken duplicate handler, recovery, HTTP failure, malformed input, remote-target refusal, and payload-error redaction.
- Local production and live axe/browser checks pass at desktop and 390 px with no serious/critical findings or console/page errors. Keyboard focus, tabs, broken-to-safe demo recovery, reduced motion, service-worker update, and live offline reload were exercised.
- Live traffic is first-party only; browser storage and cookies are empty. The library's adapters are inert and loopback-only.
- Live security headers include HSTS, CSP/frame protection, nosniff, referrer policy, and permissions policy. Hashed assets are immutable for one year; document/worker are no-store.
- Budget: JS 4.69 kB (2.04 kB gzip), CSS 14.47 kB (4.01 kB gzip), fonts 0 kB, hero WebP 52.39 kB. Mobile Lighthouse: 100 Performance, 100 Accessibility, 100 Best Practices, 100 SEO.

## How to verify / release

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run pack:check
npm pack
```

Serve `dist/site` for the static landing page. The factory owns registry credentials; after version review the release operator may run `npm publish` (not run during verification).

## Known gaps

None. This verifier changed only `.factory/verification-3.md` and this handoff, not product code or deployment state.
