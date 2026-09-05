# Demo sandbox

## Entry point

Open `/demo?demo=1` or use **Try it with sample data** on the landing page.
The page is a browser playground backed by the package's
`idempotency-rehearsal/browser` entry. It never connects to a visitor handler,
payment provider, email provider, or account.

## Shipped sample

The sample is a duplicate `order.created` sequence:

- `evt_demo_order_created` and `evt_demo_order_retry`
- shared idempotency key `order_demo_042`
- expected effect `payment.capture` exactly once

Visitors can select an idempotent handler, a deliberately broken handler, or a
reordered delivery. The view immediately records the delivery sequence and
effect result. The broken handler intentionally shows two recorded effects.

## Isolation and reset

The persistent banner reads **Demo — sample data, nothing is saved**. The
sample result is held in memory. The only browser storage marker is
`sessionStorage['demo:idempotency-rehearsal:active']`; it is in the required
`demo:` namespace and contains no sample data. **Reset demo** clears the
rendered result and retains only that marker. **Start for real** removes it and
returns to the landing page.

No real product data exists in this static product, and demo mode never reads
or writes another storage namespace.
