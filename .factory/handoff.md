# Review handoff — FAIL

**Implementation reviewed:** `91ff32b9515415e75b9116101ea7097bd6b5231b`
**Documentation HEAD:** `f4fc65d2e9cd8b6b18c90a0b197c51a3d6c16091`
**Live URL:** https://idempotency-rehearsal.sociobot.in/
**Reviewed:** 2026-09-05

## Status

**FAIL — 4 findings and 14 untested public claims.** The live application exactly
matches the current build, and the library works, but it does not meet the current
demo-sandbox, claims, site-structure, or plain-words contracts. See
`.factory/review-1.md` for complete evidence.

## What was verified

- `npm ci`, `npm test` (10/10), `npm run typecheck`, `npm run build`, and
  `npm run pack:check` pass. A packed tarball worked in a fresh consumer through ESM,
  CommonJS, and CLI validation.
- Fresh desktop and phone live browsers exercised safe, invalid/broken, and recovery
  trace paths. Keyboard, focus, reduced motion, offline reload, worker update,
  first-party-only requests, blank browser storage, headers, asset parity, and
  repository Playwright Axe checks passed.
- All earlier cache/CSP/touch-target and handler-error-redaction findings are fixed.

## Required next steps

1. Build `/demo` as a package-backed, one-click library playground with a persistent
   sample-data sandbox label, reset, and explicit exit; document it in `.factory/demo.md`.
2. Add `.factory/claims.json` and one clean-demo observable `@claim:<id>` test for
   every public claim; remove any claim that cannot be tested.
3. Add real `/privacy`, `/terms`, and designed `/404` routes, per-route metadata,
   sitemap entries, and Static Web Apps fallback/404 configuration.
4. Rewrite the first screen and headings in plain words: name backend engineers, the
   webhook-proof job, and the sample-data first action/result; commit the required
   copy audit.

## How to verify after repair

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run pack:check
npm pack
```

Also run every command in `.factory/claims.json`, test `/demo` in a fresh browser
context, and repeat the live desktop/phone, routes, metadata, accessibility, offline,
and packaged-consumer checks in `.factory/review-1.md`.
