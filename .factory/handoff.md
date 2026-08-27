# Repair handoff — handler-error report redaction

**Repair base:** `e70e9f6b73766a70e43a5cce11dc0d1a8dfd0f9a`
**Date:** 2026-08-27
**Hosting:** Standard Azure Static Web Apps (unchanged)

## Shipped repair

- `runScenario` now replaces every in-process handler exception with the stable `Handler failed.` category before constructing a delivery result or report. It does not read `Error.message`, so handler/validator/dependency text cannot enter `RehearsalReport`, its violations, or JSON CI output.
- Added the exact regression pattern from independent verification: an allowed `payload.note` marker (`raw-secret-should-not-appear`) is interpolated into a thrown handler error. The test asserts the fixed category, the derived violation text, and absence of the marker from `JSON.stringify(report)`.
- Clarified the README’s report privacy contract. Public API types and normal success/failure behavior are unchanged.

## Verification completed

```sh
npm ci                         # passed; 0 vulnerabilities
npm test                       # passed; 10/10
npm run typecheck              # passed
npm run build                  # passed; package + dist/site + Azure config check
npm run pack:check             # passed; 18 files, 28.2 kB packed
```

- A newly packed tarball was installed into a fresh temporary consumer. Both ESM and CommonJS `runScenario` reproduced the payload-derived throw and returned `Handler failed.` without the marker in serialized output.
- `npm run test:a11y` passed against the local production build and `https://idempotency-rehearsal.sociobot.in`: zero console/page errors and zero axe WCAG A/AA violations at 390×844 and 1366×900; 390px header/footer targets remain at least 44px.
- Production output retains the previous verified delivery assets and policy: 4.69 kB JS (2.04 kB gzip), 14.47 kB CSS (4.01 kB gzip), 0 font bytes, and a 52.39 kB WebP hero. `staticwebapp.config.json` remains emitted at the `dist/site` root with immutable `/assets/*` cache policy and restrictive headers.

## Deploy / publish

The commit is pushed to `main` to trigger the existing Standard Azure Static Web Apps deployment. The deployable artifact remains `dist/site`; no infrastructure, DNS, billing, analytics, or npm registry state was changed. The factory owns npm publication; release command after version review is `npm publish` (not run here).

## Known gaps

None for this repair. `runHttpScenario` remains intentionally separate and is not the in-process `runScenario` handler-error path identified by the verifier.
