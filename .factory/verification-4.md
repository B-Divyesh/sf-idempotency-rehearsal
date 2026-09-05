# Prove duplicate webhooks cause one effect — verification 4

**Verdict: FAIL**

**Implementation reviewed:** `6858371876c35a65ae3ba919dbcf19ea07ce3641`

**Documentation baseline:** `07565bab72301ffda9a72bdfdc3d45d7d5629c4e`

**Live URL:** https://idempotency-rehearsal.sociobot.in/

**Verified:** 2026-09-05 with Node 22.23.2, npm 10.9.8, and Playwright 1.58.2

## Job, audience, and first action before scrolling

The job is to prove that duplicate, delayed, and reordered webhook deliveries
cause one business effect. The audience is backend engineers testing webhook or
workflow handlers before release. On fresh desktop and phone pages, the first
action is **Try it with sample data**, next to text saying it runs two deliveries
and shows one payment effect. The job, audience, action, result, and three plain
facts are all visible before scrolling.

## Findings

### High — HTTP transport errors can expose payload values in reports

The packed package's `runHttpScenario` copies a thrown transport error message
into both `report.deliveries[].error` and `report.violations[].message`. A custom
fetch implementation that includes the request body in its error therefore puts
the raw payload into the serialized report.

Reproduced from a new temporary project that installed a fresh `npm pack` output:

```js
const marker = 'raw-payload-marker-verify-4';
const report = await runHttpScenario({
  scenario: defineScenario({
    name: 'installed HTTP error redaction',
    deliveries: [{
      eventId: 'evt_test_http_error',
      idempotencyKey: 'order_test_http_error',
      payload: { note: marker },
    }],
  }),
  url: 'http://127.0.0.1:9/webhook',
  fetch: async (_url, init) => {
    throw new Error(`transport exposed ${init.body}`);
  },
});
```

The installed package returned `containsMarker: true`. This contradicts “Reports
omit payload values and raw handler error text” and the brief's requirement never
to log raw event secrets. The `@claim:secret-safe-report` test exercises only the
browser `runScenario` handler-error path, so this public claim is incompletely
tested. Evidence: `/work/.evidence/http-report-redaction-repro.json`.

### Medium — the sample requires two clicks and is empty after the promised action

In fresh 1366×900 and 390×844 contexts, clicking **Try it with sample data** opens
`/demo?demo=1` with zero deliveries, zero effects, and “Sample is ready.” The user
must click **Run sample scenario** to get the promised two deliveries and one
effect. The attached demo contract requires the first screen after the landing
action to be populated.

The `@claim:demo-one-click` test also navigates directly to `/demo?demo=1` and then
clicks **Run sample scenario**. It never exercises the landing action, so it does
not prove its own one-click claim. Evidence:
`/work/.evidence/demo-desktop-initial.png`,
`/work/.evidence/demo-phone-initial.png`, and
`/work/.evidence/live-flow.json`.

### Medium — two analytics claims lack complete tagged tests

The `same-origin-demo` claim says the demo uses no analytics request, but its test
only asserts that every request has the local product origin. A same-origin
analytics request would pass. The privacy page separately says the npm package
does not send product analytics; no manifest entry or tagged test captures network
activity across the installed package API.

Live request inspection and source review found no current analytics traffic. The
finding is that the public claims are not proved on every build as required.

### Low — visible mobile controls are smaller than 44×44 CSS pixels

At 390px, the header **Demo** link is 28.81×44px. On the demo page, **Reset demo**
is 88.02×38px and **Start for real** is 114.42×38px. These are navigation and
control targets, not inline prose links, and miss the attached 44×44 baseline.
The repository accessibility script checks only the header brand and footer links,
so it does not catch these controls. Evidence:
`/work/.evidence/touch-targets.json`.

### Low — the required 180px Apple touch icon is absent

Every route points `rel="apple-touch-icon"` to the 32×32-viewBox SVG favicon.
There is no separate 180px Apple touch asset, as required by the site-structure
contract. The favicon SVG and 1200×630 social card otherwise exist and load.

## Claim results

All 11 commands in `.factory/claims.json` were run exactly as declared after
`npm ci`; all exited successfully. Each ID occurs once in `scripts/claims.mjs`.
Passing commands do not clear an incomplete assertion.

| Claim | Command result | Independent disposition |
| --- | --- | --- |
| `demo-one-click` | Pass | Untested/false: test takes a second action; live CTA opens empty output |
| `demo-reset-isolation` | Pass | Pass |
| `duplicate-detection` | Pass | Pass |
| `reordered-sample` | Pass | Pass |
| `offline-demo` | Pass | Pass |
| `same-origin-demo` | Pass | Incomplete: same-origin analytics would pass |
| `inert-adapters` | Pass | Pass |
| `secret-safe-report` | Pass | Incomplete/false: HTTP transport-error path leaks payload values |
| `loopback-only` | Pass | Pass |
| `synthetic-identifiers` | Pass | Pass |
| `local-package` | Pass | Pass |

One additional public claim, “The package does not send product analytics,” has
no corresponding manifest claim or complete tagged test. **Untested public claim
count: 4.**

## Passing evidence

### Clean build and installed artifact

From the clean documentation baseline:

```text
npm ci                 pass; 0 vulnerabilities
npm test               pass; 2 files, 9 tests
npm run typecheck      pass
npm run build          pass; package and dist/site produced
npm run pack:check     pass; 28 files, 35.6 kB packed
npm run test:consumer  pass
npm pack --dry-run     pass
```

A separate temporary consumer installed the tarball. ESM, CommonJS, the browser
entry, and CLI worked. Normal duplicate handling passed with two deliveries and
one effect. A broken handler produced two effects and one violation, recovery
returned to one effect, adjacent `parallelGroup` deliveries reached concurrency
two, an HTTP 503 produced delivery failures without effects, invalid scenarios and
remote targets were rejected, raw in-process handler errors were redacted, and
invalid CLI input exited 2. The High finding above is the separate HTTP transport
error path.

### Live sample, privacy, recovery, and offline behavior

After the extra run click, desktop and phone produced two realistic order events,
one `payment.capture` effect, and a PASS. Broken handler produced two effects and
a FAIL; returning to Idempotent handler recovered to PASS. Reordered delivery put
`evt_demo_order_retry` first and passed. The demo label remained present. Reset
returned both lists to empty and left only
`sessionStorage['demo:idempotency-rehearsal:active']`; **Start for real** removed
it and returned home. `localStorage` stayed empty. Live requests used only the
product origin, and no console or page errors occurred.

The service worker controlled the demo, completed an update check, and reloaded
the demo offline with its title, heading, status message, and sample label.

### Accessibility, routes, links, security, and performance

The factory `verify-url.sh` passed with a title, `lang="en"`, one h1, a main
landmark, complete image alt text, and no console errors. The repository's
Playwright Axe suite reported zero WCAG A/AA violations on `/`, `/demo`,
`/privacy`, `/terms`, and a missing URL at phone and desktop sizes. Keyboard Tab
reached the skip link with a 3px amber focus ring; Enter and Space operated the
demo; tab arrow/Home/End behavior worked; reduced motion changed transitions to
`0.01ms`. There was no 390px page overflow.

All discovered links and anchors resolved. `/`, `/demo`, `/privacy`, `/terms`,
and `/404` returned their product pages and correct titles. `/missing-page`
deliberately returned HTTP 404 with the designed product page and a home action.

Fresh build files matched live bytes for 13 HTML, JS, CSS, worker, sitemap,
favicon, and image artifacts. Hashed JS/CSS use one-year immutable caching. HTML
uses no-store where configured. Live responses include a restrictive same-origin
CSP, `frame-ancestors 'none'`, X-Frame-Options DENY, nosniff, referrer policy,
permissions policy, and HSTS.

Fresh mobile Lighthouse scores were **100 Performance, 100 Accessibility,
100 Best Practices, and 100 SEO**. FCP was 0.9s, LCP 1.1s, TBT 40ms, and CLS 0.
Initial JavaScript is 9.49 kB raw / 3.69 kB gzip; CSS is 12.08 kB raw / 3.42 kB
gzip; the hero is 52.39 kB; no font file is transferred.

## Earlier findings disposition

| Earlier finding | Current disposition |
| --- | --- |
| No package-backed `/demo` sandbox | Partly fixed: the package-entry playground, label, reset, exit, and isolation exist; the landing action still opens an empty sample. |
| No claims manifest or runnable proof | Partly fixed: 11 commands pass, but four public claims remain incomplete or unlisted. |
| Missing privacy, terms, demo, route titles, and product 404 | Fixed; the deliberate missing-route HTTP 404 is correct. |
| Metaphor copy and missing audience/action result | Fixed on both fresh first screens. |
| Hashed assets lacked immutable caching | Fixed. |
| CSP and anti-framing headers were missing | Fixed. |
| Brand/footer mobile targets were under 44px | Those targets are fixed; other non-inline controls remain under 44px as reported above. |
| In-process handler errors exposed payload-derived text | Fixed for `runScenario`; `runHttpScenario` transport errors remain unsafe as a distinct path. |

This product is a static documentation site for an npm library. It has no backend,
tenant, database, restart persistence, health endpoint, paid feature, or live
request allowance, so backend isolation and 429/Retry-After checks do not apply.

**Finding count: 5. Untested public claim count: 4. Verdict: FAIL.**
