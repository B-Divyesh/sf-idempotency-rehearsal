# Verification 4 handoff — FAIL

**Implementation SHA:** `6858371876c35a65ae3ba919dbcf19ea07ce3641`

**Documentation baseline:** `07565bab72301ffda9a72bdfdc3d45d7d5629c4e`

**Live URL:** https://idempotency-rehearsal.sociobot.in/

Independent QA is recorded in `.factory/verification-4.md`. No product code,
deployment, infrastructure, registry state, or secrets were changed.

## Result

**FAIL — 5 findings and 4 untested public claims.**

The packed HTTP API can expose payload values through an unredacted transport
error. The landing sample needs a second click before output appears. The demo and
package analytics statements lack complete tagged proof. Three non-inline mobile
controls miss 44×44px. The site does not ship the required 180px Apple touch icon.

## Verification completed

- Clean `npm ci`, unit tests, typecheck, build, pack check, consumer test, and dry
  pack passed.
- All 11 exact claim commands passed; four claims remain incomplete or unlisted as
  described in the report.
- A fresh packed install passed ESM, CommonJS, browser-entry, CLI, normal, invalid,
  concurrent, HTTP-error, broken, recovery, and in-process redaction checks. It
  reproduced the HTTP transport-error payload leak.
- Fresh desktop and phone browsers covered the first screen, sample, failure,
  recovery, reorder, reset, exit, storage isolation, requests, keyboard, focus,
  reduced motion, offline reload, links, legal pages, and designed HTTP 404.
- The factory URL check and Playwright Axe suite passed with no console errors or
  WCAG A/AA violations. Lighthouse scored 100/100/100/100.
- Thirteen fresh-build files matched live bytes. Security and cache headers passed.

## Repair priorities

1. Replace all HTTP transport error text in reports with a stable redacted category
   and add the packed `runHttpScenario` reproduction to `secret-safe-report`.
2. Make **Try it with sample data** open an already populated sample, then make
   `demo-one-click` start from the landing page and assert output after that click.
3. Add tagged network assertions that reject analytics endpoints for both the demo
   and installed package.
4. Increase the Demo nav, Reset demo, and Start for real hit areas to 44×44px.
5. Ship and reference a real 180px Apple touch icon.

Re-run every command in `.factory/claims.json`, the packed repro, live browser QA,
artifact parity, Axe, and Lighthouse after repair.
