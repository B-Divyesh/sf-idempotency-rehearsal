# Visual thesis: the duplicate-event signal lab

## Direction and rationale

Idempotency Rehearsal uses a **pixel/demoscene language** drawn from signal analyzers and old hardware test benches. A duplicate webhook is not a vague cloud problem: it is the same pulse crossing a boundary twice. The interface turns that invisible timing fault into a crisp, inspectable trace—square pixels, stepped paths, checksum-like labels, and a single amber warning pulse. It should feel like engineering instrumentation, not a game skin and not a generic gradient developer landing page.

The visual system is intentionally single-mode: a near-black lab display is the product metaphor. Every surface is painted explicitly. Depth comes from nested phosphor-toned panels, one-pixel highlights, and offset hard shadows rather than blur or glass.

## Palette

| Token | Value | Role |
| --- | --- | --- |
| `--ink-950` | `#080b0f` | page background |
| `--ink-900` | `#0e1419` | instrument surface |
| `--ink-800` | `#182127` | raised surface |
| `--paper` | `#f2f5df` | primary text (15.8:1 on background) |
| `--mist` | `#a8b8ae` | secondary text (8.1:1) |
| `--signal` | `#79f2a6` | verified state and primary action |
| `--signal-ink` | `#07120b` | text on signal |
| `--amber` | `#ffcc66` | delayed/retry state |
| `--danger` | `#ff6b6b` | duplicate violation |
| `--cyan` | `#67d8ef` | ordering and informational trace |

Status never relies on color: each state is paired with `PASS`, `DELAY`, or `FAIL`, distinct symbols, and explanatory text. Core text and controls meet WCAG AA contrast.

## Type

- Display and UI: the explicit system monospace stack `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`. Square counters and aligned punctuation support the lab-instrument metaphor.
- Reading copy: `Inter, ui-sans-serif, system-ui, sans-serif`; no network font request. The site uses system files by default to keep font transfer at zero.
- Scale: 14 / 16 / 18 / 24 / 40 / 64px with 1.5 line height for prose. Code and numerical traces use tabular figures.

## Spacing and geometry

An 8px base rhythm with 4px micro-spacing: `4, 8, 12, 16, 24, 32, 48, 64, 96`. Main content caps at 1160px. Borders are 1px, radii are restrained at 2–8px, and elevated controls use a 4px hard shadow. All touch targets are at least 44px. On phones, the ornamental frame and secondary trace labels drop; the proof runner stacks into a delivery list followed by the verdict.

## Interaction grammar

- Primary actions depress by their 4px shadow offset and immediately change copy to show progress.
- Scenario tabs use an underline and `aria-selected`, with Left/Right arrow navigation.
- Trace events enter from their actual direction along the rail. The verdict resolves only after the final event so cause and outcome remain connected.
- Focus is a 3px amber outline with 3px offset, visually distinct from signal green.
- Copy buttons announce success in a polite live region. The interactive demo supports Start/Reset and makes failure repair explicit.

## Motion policy

UI transitions run 160–240ms and animate only transform or opacity. The event trace is finite, user-triggered, and lasts under 1.5 seconds. No element loops. Under `prefers-reduced-motion: reduce`, trace items appear instantly, smooth scrolling is disabled, and progress changes are conveyed through labels and opacity without translation.

## Original asset plan and provenance

The hero illustration is a generated raster called `signal-lab.webp`: an abstract demoscene oscilloscope showing two identical event pulses entering a logic gate and only one clean business-effect pulse leaving. It contains no brand, readable text, people, or provider imagery, and is used as explanatory atmosphere behind/alongside the live trace rather than filler.

- Generator: `/opt/fleet/lib/gen-image.sh`, factory Azure image deployment (`factory-image`, deployment metadata stored beside the source output during generation).
- License/provenance: newly generated for this product on 2026-08-27; no external reference images; repository-owned project asset.
- Prompt: “Wide landing-page hero illustration for a developer tool. A retro 1990s demoscene signal laboratory rendered as precise pixel art: two identical mint-green webhook pulses enter a dark hardware logic gate from the left, one clean cyan business-effect pulse exits on the right, while a small amber delayed pulse waits on a stepped timing rail. Near-black navy instrument panel, phosphor mint, cyan, amber, and coral warning pixels; crisp orthographic composition, subtle dithering, scanline texture, readable at small sizes, generous dark negative space, no words, no letters, no logos, no watermark, no photorealism, no gradients, no people.”
- Delivery: optimized WebP, explicit dimensions, ≤300 KB. The original PNG and API sidecar are not shipped in the static site.

All icons in the interface are hand-authored CSS/pixel primitives or text glyphs with accessible labels; no third-party icon pack.
