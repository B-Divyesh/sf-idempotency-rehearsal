# Independent verification — FAIL

**Candidate:** `7156fb128a92a4675c365a02de25a7071952069c`

**Live URL:** https://idempotency-rehearsal.sociobot.in/
**Verified:** 2026-08-27 (Node 22.23.2, npm 10.9.8)

## Verdict

**FAIL.** The candidate implements the intended local idempotency rehearsal and its deployed site is an exact match for the built candidate. It cannot pass the researched brief and factory contract, however, because an in-process handler error can put a raw payload value into `RehearsalReport`. This contradicts both the public promise that reports omit payloads and the explicit constraint never to log raw event secrets.

No product code, deployment configuration, registry state, DNS, or billing was changed during verification.

## Release-blocking defect

### High — raw payload values leak through handler-error reports

`runScenario` catches an in-process handler error and returns `error.message` verbatim in `report.deliveries[].error`. Although validation rejects secret-bearing field *names*, it allows arbitrary values in ordinary fields. A handler, schema validator, or downstream dependency that includes such a value in its error message causes it to appear in the report and then in CLI/test logs if the report is serialized.

Reproduced against the packed, newly installed public package:

```js
const marker = 'raw-secret-should-not-appear';
const report = await runScenario({
  scenario: {
    name: 'error redaction regression',
    deliveries: [{
      eventId: 'evt_demo_redaction',
      idempotencyKey: 'order_demo_redaction',
      payload: { note: marker },
    }],
  },
  handler: (delivery) => {
    throw new Error(`handler failed with ${delivery.payload.note}`);
  },
});
```

Observed result:

```json
{
  "error": "handler failed with raw-secret-should-not-appear",
  "containsRawSecret": true
}
```

The library must redact/replace handler error text before putting it in a report (for example, a stable `Handler failed` category) and add a regression test that throws a payload-derived error. Do not release until this is fixed.

## Passing evidence

### Clean checkout, package, and public API

I made a new clone from GitHub, detached it at the candidate SHA, and installed from its lockfile. The following all passed in that isolated checkout:

```sh
npm ci                 # 0 vulnerabilities
npm test               # 10/10 passing
npm run typecheck      # passing
npm run build          # passing; dist/package and dist/site produced
npm run pack:check     # passing
```

`npm pack` produced `idempotency-rehearsal-0.1.0.tgz`: 18 files, 27.8 kB packed, 164.2 kB unpacked. I installed that tarball into a separate empty consumer (not the repository) and exercised only the installed package:

- ESM `runHttpScenario` delivered a delayed duplicate to a loopback handler using installed `effectClientFromRequest`; it reported 2 deliveries, 1 effect, 0 violations.
- CommonJS `require('idempotency-rehearsal').runScenario` exists and is callable.
- The installed CLI performed the equivalent delayed-duplicate proof with exit 0 and the same 2/1/0 JSON summary; `--help` documents usage and exit codes.
- A concurrent `parallelGroup` boundary case reached an observed maximum handler concurrency of 2 and returned a passing 2-delivery report.
- Malformed `{"name":"malformed scenario","deliveries":[]}` exited 2 with `scenario.deliveries must contain at least one delivery.`
- Repository integration tests cover duplicate detection, exact expectation failures, delayed delivery, loopback HTTP collection, non-loopback target/collector refusal, live-looking IDs, secret-bearing field names, and the documented examples.

These results show the smallest useful product works for declared duplicate/delayed/reordered loopback sequences and records inert effects; the High report-redaction defect prevents a release pass.

### Local and deployed site

At both 1366×900 and 390×844:

- `npm run test:a11y` reported 0 axe WCAG A/AA violations and no browser console/page errors against both the local production build and the live URL.
- Keyboard-only checks passed: the first Tab focused the skip link, which has a visible `rgb(255, 204, 102) solid 3px` outline. ArrowRight selected and focused the next handler tab.
- The interactive demo reached `FAIL · duplicate effect` with Broken handler, then after choosing Idempotent handler reached `PASS · exactly one effect` (recovery path).
- Mobile had no horizontal overflow (`scrollWidth === clientWidth === 390`); brand and Source/Privacy/Terms links measured at least 44px high.
- With reduced motion emulated, the media query matched and UI transition duration was `0.00001s`.
- The service worker was active and controlling after reload; `registration.update()` completed. After online installation/control, an offline reload rendered the complete h1 locally and on production. The site is not an installable PWA (no manifest or installability claim), so no app-update migration test applies.
- Browser request capture found only the respective first-party origin. Live localStorage/sessionStorage/cookies were empty; there are no loaded third-party fonts, analytics, or runtime scripts.

### Deployment parity, headers, caching, and budgets

Fresh production-build files had identical SHA-256 values to live responses for `index.html`, hashed JS/CSS, hero WebP, `sw.js`, `robots.txt`, and `sitemap.xml`. The deployed site therefore matches this exact candidate.

Live HTTPS responses supply HSTS, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, a restrictive same-origin CSP including `frame-ancestors 'none'`, and a restrictive permissions policy. `index.html` and `sw.js` use `no-cache, no-store, must-revalidate`; hashed JS/CSS/WebP use `public, max-age=31536000, immutable`.

| Asset | Size | Budget | Result |
| --- | ---: | ---: | --- |
| Initial JS | 4.69 kB (2.04 kB gzip) | 200 kB | Pass |
| CSS | 14.47 kB (4.01 kB gzip) | 50 kB | Pass |
| Fonts | 0 kB | 120 kB | Pass |
| Hero WebP | 52.39 kB | 300 kB | Pass |

Local mobile Lighthouse completed successfully after using Chromium's shared-memory-safe flag: Performance 99, Accessibility 100, Best Practices 100, SEO 100; FCP 0.9 s, LCP 1.4 s, CLS 0, TBT 90 ms.

## Retest instructions

After the error-redaction repair, verify from a clean clone with:

```sh
npm ci
npm test
npm run typecheck
npm run build
npm run pack:check
npm pack
```

Install the tarball into a new consumer and re-run the payload-derived handler-error reproduction above. The serialized `RehearsalReport` must not contain the marker. Then repeat the live header, asset-parity, keyboard/mobile, axe, reduced-motion, service-worker/offline, outbound-request, and bundle-budget checks recorded here.
