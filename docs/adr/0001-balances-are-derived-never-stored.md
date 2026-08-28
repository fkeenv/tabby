# Balances are derived, never stored

A Group's Balances are computed on read from its Claims and Payments; there is no `settled_at` column, no frozen balance snapshot, and no lock that closes claiming. We chose this because claiming never closes — a Participant can claim a Line Item on day 4 of a trip, after another Participant has already paid — so any stored balance or settled flag would silently contradict the live one the first time a late Claim landed, leaving two truths to reconcile.

## Consequences

- A Payment is a ledger entry holding an amount, not a boolean against a debt. Partial payments fall out for free.
- "Settled" is a computed state (every Participant's net is zero), so a Group can leave and re-enter it.
- A Participant who has paid in full can be pulled back into debt by someone else's later Claim. This is intended, and the UI has to make it legible rather than surprising.
- Balance computation sits on the read path for every Group screen, so it must stay cheap or be cached with explicit invalidation.
