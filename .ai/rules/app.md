---
paths:
  - 'app/**'
---

# App

## Money is integer minor units, never a float
Money is stored and passed as integer minor units in `*_minor` columns (never `*_cents` — see ADR-0002 — and never decimal/float). A float must never touch a money value: division uses `intdiv()` and `%`.

Never split or divide a money amount by hand. All division goes through `app/Actions/Money/AllocateAmount.php`, which allocates by largest remainder so the parts sum exactly to the whole. There is no `Money` value object — bare `int` plus the Group's `Currency` enum.

Only 2-decimal currencies are allowed, so a minor unit is always a cent. Integers cross the wire to Inertia; formatting happens in TS via `Intl.NumberFormat`. PHP formats money only for email and export.

The allocator is duplicated in TS for optimistic UI. PHP is authoritative. If you change either one, update `tests/fixtures/allocation-vectors.json` — both test suites read it and will fail if the two drift.
