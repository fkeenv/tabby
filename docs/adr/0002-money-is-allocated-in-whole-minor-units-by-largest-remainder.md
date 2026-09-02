# Money is allocated in whole minor units by largest remainder

Share-based claiming divides an amount by an arbitrary Share count, so exact division is the exception rather than the rule, and ADR-0001 recomputes every Balance on every read — so the rounding rule has to be a deterministic function of stored state. We hold money as integer minor units throughout and allocate **per allocation unit**: each Line Item and each Adjustment is divided among its claimers by largest remainder, with the leftover units handed to the largest fractional remainders and ties broken by Participant-id order rotated left by the allocating record's own id. We chose this so that every figure a person can see on screen is a whole number of minor units that sums exactly to the figure beside it.

## Considered Options

- **Keep exact rationals through the whole Expense and round once per Participant at the end.** More accurate, but only by a margin nobody can perceive, and it pays for that with a *visible* error: the per-line-item figures on the claim screen would not sum to the total printed next to them. There are two mutually exclusive invariants here — accuracy of the final figure, and every intermediate figure summing — and we chose the one people can check with their eyes.
- **The payer absorbs the odd unit.** Concentrates all drift onto one person's line, where it reads as a bug.
- **The first claimer absorbs it.** Not a pure function of stored state, so it breaks the moment a Claim is deleted, which ADR-0001 makes intolerable.
- **Participant-id order without the rotation.** Deterministic, but the earliest-created Participant systematically eats the extra unit on every tied allocation. The rotation is a few characters and removes the only complaint available.
- **A `Money` value object.** Rejected: an object wrapping an integer that cannot do arithmetic — because arithmetic is the allocator's job — is ceremony, and it needs custom handling at the Inertia serialisation boundary for no benefit.

## Consequences

- Allocation is `Σ(Participant allocations) + Unclaimed = Expense total`, exactly, for every Expense.
- Balances are integers, so Suggested Transfers introduce no further rounding anywhere downstream.
- Currencies are restricted to a 2-decimal allowlist, so a minor unit is always a cent and no per-currency exponent exists. Columns are named `*_minor` rather than `*_cents` so this can change without a rename.
- Allocation depends on database ids, via the rotation seed. Two identical Line Items with identical Claims split their odd unit differently, and any test asserting exact output must pin ids.
- Pro-rata Adjustments use already-rounded Line Item subtotals as weights. This perturbs a ratio by a sub-unit and does not compound, because each Adjustment is still exactly allocated regardless of its weights. **Amended by [ADR-0005](0005-the-payer-carries-the-unclaimed-residual.md):** the unclaimed subtotal is a weight too, so an Adjustment's share of an unclaimed Line Item lands in Unclaimed rather than on the people who did claim.
- Negative amounts are allocated by taking the absolute value and negating the results, so `intdiv` never biases the wrong way.
- The allocator is duplicated in TypeScript for optimistic display on the claim screen. PHP is authoritative and every server response overwrites the client's own figures, so a divergence surfaces as a flicker and never as a persisted amount. Shared golden vectors in `tests/fixtures/allocation-vectors.json` are read by both suites so CI fails the moment the two disagree.
