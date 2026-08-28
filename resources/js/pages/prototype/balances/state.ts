/**
 * PROTOTYPE — throwaway. Answers issue #5: how are Balances and Suggested
 * Transfers presented so a minimised transfer set feels fair rather than
 * arbitrary?
 *
 * Module-level reactive state so balances, payments and the scenario survive
 * switching between variants. No persistence, no backend.
 *
 * Unlike the claim-screen prototype, the arithmetic here is NOT naive: the
 * allocator implements ADR-0002 (integer minor units, largest remainder, ties
 * broken by participant-id order rotated by the allocating record's id) because
 * the whole question is whether the numbers read as trustworthy. Every figure
 * below is computed, not typed in.
 */
import { computed, reactive, ref } from 'vue';

export type Participant = {
    id: string;
    name: string;
    color: string;
    isOrganizer: boolean;
};

export type LineItem = {
    id: string;
    description: string;
    quantity: number;
    unitPriceMinor: number;
};

export type Adjustment = {
    id: string;
    label: string;
    amountMinor: number;
    allocation: 'even' | 'pro-rata';
};

export type Expense = {
    id: string;
    description: string;
    payerId: string;
    lineItems: LineItem[];
    adjustments: Adjustment[];
};

export type Payment = {
    id: string;
    fromId: string;
    toId: string;
    amountMinor: number;
    at: number;
};

/** claims[lineItemId][participantId] = shares */
type Claims = Record<string, Record<string, number>>;

/**
 * How the Unclaimed residual is treated. Undecided — this is issue #13, which
 * is blocked on this prototype. The toggle exists so the three answers can be
 * seen with the same numbers.
 */
export type UnclaimedPolicy = 'payer' | 'claimers' | 'unresolved';

export const CURRENCY = 'USD';

// ---------------------------------------------------------------------------
// ADR-0002 allocator
// ---------------------------------------------------------------------------

/** Trailing digits of a record id, as the rotation seed. */
function seedOf(recordId: string): number {
    const digits = recordId.match(/(\d+)/g);

    if (digits) {
        return Number(digits.join('')) || 0;
    }

    return [...recordId].reduce((sum, c) => sum + c.charCodeAt(0), 0);
}

/**
 * Divide `amountMinor` among weighted participants so the parts sum exactly to
 * the whole. Largest remainder; ties go to whoever comes first in participant-id
 * order rotated left by the allocating record's own id.
 */
export function allocate(
    amountMinor: number,
    weights: { id: string; weight: number }[],
    recordId: string,
): Record<string, number> {
    const result: Record<string, number> = {};
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);

    if (weights.length === 0 || totalWeight <= 0) {
        return result;
    }

    const sign = amountMinor < 0 ? -1 : 1;
    const magnitude = Math.abs(amountMinor);

    const order = weights.map((w) => w.id).sort();
    const rotation = order.length ? seedOf(recordId) % order.length : 0;
    const rotated = [...order.slice(rotation), ...order.slice(0, rotation)];
    const rank = new Map(rotated.map((id, index) => [id, index]));

    const parts = weights.map((w) => {
        const exact = (magnitude * w.weight) / totalWeight;
        const floor = Math.floor(exact);

        return { id: w.id, floor, remainder: exact - floor };
    });

    let leftover = magnitude - parts.reduce((sum, p) => sum + p.floor, 0);

    const queue = [...parts].sort((a, b) => {
        if (b.remainder !== a.remainder) {
            return b.remainder - a.remainder;
        }

        return (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0);
    });

    for (const part of parts) {
        result[part.id] = part.floor;
    }

    for (const part of queue) {
        if (leftover <= 0) {
            break;
        }

        result[part.id] += 1;
        leftover -= 1;
    }

    for (const id of Object.keys(result)) {
        result[id] *= sign;
    }

    return result;
}

// ---------------------------------------------------------------------------
// The scenario: one dinner, one night out, five people, awkward numbers
// ---------------------------------------------------------------------------

export const groupName = 'Nonna Rosa — Saturday';

export const participants = reactive<Participant[]>([
    { id: 'p1', name: 'Alice', color: 'bg-rose-500', isOrganizer: true },
    { id: 'p2', name: 'Ben', color: 'bg-amber-500', isOrganizer: false },
    { id: 'p3', name: 'Chidi', color: 'bg-emerald-500', isOrganizer: false },
    { id: 'p4', name: 'Dara', color: 'bg-sky-500', isOrganizer: false },
    { id: 'p5', name: 'Eve', color: 'bg-violet-500', isOrganizer: false },
]);

/** The Nonna Rosa receipt, carried over from the claim-screen prototype. */
const dinner: Expense = {
    id: 'e1',
    description: 'Nonna Rosa — dinner',
    payerId: 'p1',
    lineItems: [
        {
            id: 'l1',
            description: 'Sourdough & cultured butter',
            quantity: 1,
            unitPriceMinor: 800,
        },
        {
            id: 'l2',
            description: 'Burrata, peach, basil',
            quantity: 1,
            unitPriceMinor: 1600,
        },
        {
            id: 'l3',
            description: 'Margherita pizza',
            quantity: 2,
            unitPriceMinor: 1900,
        },
        {
            id: 'l4',
            description: 'Cacio e pepe',
            quantity: 1,
            unitPriceMinor: 2200,
        },
        {
            id: 'l5',
            description: 'Grilled branzino',
            quantity: 1,
            unitPriceMinor: 3400,
        },
        {
            id: 'l6',
            description: 'Rosemary fries',
            quantity: 3,
            unitPriceMinor: 600,
        },
        { id: 'l7', description: 'Negroni', quantity: 4, unitPriceMinor: 1600 },
        {
            id: 'l8',
            description: 'Chianti Classico (bottle)',
            quantity: 1,
            unitPriceMinor: 4800,
        },
        {
            id: 'l9',
            description: 'Sparkling water (large)',
            quantity: 2,
            unitPriceMinor: 500,
        },
        {
            id: 'l10',
            description: 'Tiramisu',
            quantity: 2,
            unitPriceMinor: 1200,
        },
        {
            id: 'l11',
            description: 'Espresso',
            quantity: 3,
            unitPriceMinor: 450,
        },
    ],
    adjustments: [
        {
            id: 'a1',
            label: 'Sales tax',
            amountMinor: 2103,
            allocation: 'pro-rata',
        },
        {
            id: 'a2',
            label: 'Tip (20%)',
            amountMinor: 4740,
            allocation: 'pro-rata',
        },
        {
            id: 'a3',
            label: 'Table service',
            amountMinor: 800,
            allocation: 'even',
        },
    ],
};

const taxiThere: Expense = {
    id: 'e2',
    description: 'Taxi to the restaurant',
    payerId: 'p2',
    lineItems: [
        { id: 'l20', description: 'Taxi', quantity: 1, unitPriceMinor: 4200 },
    ],
    adjustments: [],
};

const cocktails: Expense = {
    id: 'e3',
    description: 'Cocktails at Bar Luca',
    payerId: 'p4',
    lineItems: [
        {
            id: 'l30',
            description: 'Round of cocktails',
            quantity: 5,
            unitPriceMinor: 1768,
        },
    ],
    adjustments: [],
};

const cake: Expense = {
    id: 'e4',
    description: 'Birthday cake',
    payerId: 'p5',
    lineItems: [
        { id: 'l40', description: 'Cake', quantity: 1, unitPriceMinor: 2300 },
    ],
    adjustments: [],
};

const taxiHome: Expense = {
    id: 'e5',
    description: 'Taxi home',
    payerId: 'p5',
    lineItems: [
        { id: 'l50', description: 'Taxi', quantity: 1, unitPriceMinor: 6400 },
    ],
    adjustments: [],
};

export const expenses: Expense[] = [
    dinner,
    taxiThere,
    cocktails,
    cake,
    taxiHome,
];

function initialClaims(): Claims {
    return {
        l1: { p1: 1, p2: 1 },
        l2: { p1: 1 },
        l3: { p2: 1, p3: 1 },
        // l4 (Cacio e pepe) and l10 (Tiramisu) are deliberately Unclaimed.
        l5: { p1: 1 },
        l6: { p2: 1, p4: 1 },
        l7: { p1: 1, p2: 1, p4: 1 },
        l8: { p1: 1, p3: 1, p4: 1 },
        l9: { p3: 1, p4: 1 },
        l11: { p1: 1, p3: 1 },
        l20: { p2: 1, p3: 1, p4: 1 },
        l30: { p1: 1, p2: 2, p4: 1, p5: 1 },
        l40: { p1: 1, p2: 1, p3: 1, p4: 1, p5: 1 },
        l50: { p3: 1, p5: 1 },
    };
}

export const claims = reactive<Claims>(initialClaims());
export const payments = reactive<Payment[]>([]);

export const unclaimedPolicy = ref<UnclaimedPolicy>('payer');

/** Who this device is looking at the Group as. */
export const viewerId = ref<string>('p3');

export const viewer = computed(
    () => participants.find((p) => p.id === viewerId.value) ?? participants[0],
);

/** Set by the scenario controls so variants can show "this just moved". */
export const lastChange = ref<{ note: string; at: number } | null>(null);

// ---------------------------------------------------------------------------
// Allocation
// ---------------------------------------------------------------------------

export function sharesFor(lineItemId: string, participantId: string): number {
    return claims[lineItemId]?.[participantId] ?? 0;
}

export function totalShares(lineItemId: string): number {
    return Object.values(claims[lineItemId] ?? {}).reduce(
        (sum, n) => sum + n,
        0,
    );
}

export function lineItemTotal(item: LineItem): number {
    return item.quantity * item.unitPriceMinor;
}

export function expenseTotal(expense: Expense): number {
    return (
        expense.lineItems.reduce((sum, i) => sum + lineItemTotal(i), 0) +
        expense.adjustments.reduce((sum, a) => sum + a.amountMinor, 0)
    );
}

/** Every Participant who has claimed anything anywhere in the Group. */
export const groupClaimers = computed(() =>
    participants.filter((p) =>
        Object.values(claims).some((row) => (row[p.id] ?? 0) > 0),
    ),
);

export type ExpenseAllocation = {
    expense: Expense;
    /** participantId -> minor units owed on this Expense */
    perParticipant: Record<string, number>;
    /** minor units on this Expense that no Claim reaches */
    unclaimedMinor: number;
    /** participantId -> line-item-only subtotal, the pro-rata weight base */
    subtotals: Record<string, number>;
};

export function allocateExpense(expense: Expense): ExpenseAllocation {
    const perParticipant: Record<string, number> = {};
    const subtotals: Record<string, number> = {};
    let unclaimedMinor = 0;

    const add = (
        bucket: Record<string, number>,
        id: string,
        amount: number,
    ) => {
        bucket[id] = (bucket[id] ?? 0) + amount;
    };

    for (const item of expense.lineItems) {
        const cost = lineItemTotal(item);
        const weights = participants
            .map((p) => ({ id: p.id, weight: sharesFor(item.id, p.id) }))
            .filter((w) => w.weight > 0);

        if (weights.length === 0) {
            unclaimedMinor += cost;

            continue;
        }

        const parts = allocate(cost, weights, item.id);

        for (const [id, amount] of Object.entries(parts)) {
            add(perParticipant, id, amount);
            add(subtotals, id, amount);
        }
    }

    for (const adjustment of expense.adjustments) {
        const weights =
            adjustment.allocation === 'pro-rata'
                ? Object.entries(subtotals).map(([id, weight]) => ({
                      id,
                      weight,
                  }))
                : groupClaimers.value.map((p) => ({ id: p.id, weight: 1 }));

        const usable = weights.filter((w) => w.weight > 0);

        if (usable.length === 0) {
            unclaimedMinor += adjustment.amountMinor;

            continue;
        }

        const parts = allocate(adjustment.amountMinor, usable, adjustment.id);

        for (const [id, amount] of Object.entries(parts)) {
            add(perParticipant, id, amount);
        }
    }

    return { expense, perParticipant, unclaimedMinor, subtotals };
}

export const allocations = computed(() => expenses.map(allocateExpense));

export const unclaimedTotal = computed(() =>
    allocations.value.reduce((sum, a) => sum + a.unclaimedMinor, 0),
);

// ---------------------------------------------------------------------------
// Balances
// ---------------------------------------------------------------------------

export type Balance = {
    participant: Participant;
    /** what they owe for what they claimed, after the Unclaimed policy */
    owedMinor: number;
    /** what they fronted as an Expense payer */
    paidMinor: number;
    paymentsSentMinor: number;
    paymentsReceivedMinor: number;
    /** positive = is owed money, negative = owes money */
    netMinor: number;
};

/** Owed per Participant, with the Unclaimed residual placed by the current policy. */
const owedByParticipant = computed(() => {
    const owed: Record<string, number> = {};

    for (const p of participants) {
        owed[p.id] = 0;
    }

    for (const allocation of allocations.value) {
        for (const [id, amount] of Object.entries(allocation.perParticipant)) {
            owed[id] = (owed[id] ?? 0) + amount;
        }

        if (allocation.unclaimedMinor === 0) {
            continue;
        }

        if (unclaimedPolicy.value === 'payer') {
            owed[allocation.expense.payerId] += allocation.unclaimedMinor;
        }

        if (unclaimedPolicy.value === 'claimers') {
            const weights = groupClaimers.value.map((p) => ({
                id: p.id,
                weight: 1,
            }));
            const parts = allocate(
                allocation.unclaimedMinor,
                weights,
                allocation.expense.id,
            );

            for (const [id, amount] of Object.entries(parts)) {
                owed[id] += amount;
            }
        }

        // 'unresolved': nobody absorbs it, so the nets deliberately do not sum to zero.
    }

    return owed;
});

export const balances = computed<Balance[]>(() =>
    participants.map((participant) => {
        const owedMinor = owedByParticipant.value[participant.id] ?? 0;
        const paidMinor = expenses
            .filter((e) => e.payerId === participant.id)
            .reduce((sum, e) => sum + expenseTotal(e), 0);
        const paymentsSentMinor = payments
            .filter((pay) => pay.fromId === participant.id)
            .reduce((sum, pay) => sum + pay.amountMinor, 0);
        const paymentsReceivedMinor = payments
            .filter((pay) => pay.toId === participant.id)
            .reduce((sum, pay) => sum + pay.amountMinor, 0);

        return {
            participant,
            owedMinor,
            paidMinor,
            paymentsSentMinor,
            paymentsReceivedMinor,
            netMinor:
                paidMinor +
                paymentsSentMinor -
                owedMinor -
                paymentsReceivedMinor,
        };
    }),
);

export function balanceOf(participantId: string): Balance {
    return balances.value.find((b) => b.participant.id === participantId)!;
}

/** Non-zero only when the Unclaimed policy is 'unresolved': the books not balancing. */
export const imbalanceMinor = computed(() =>
    balances.value.reduce((sum, b) => sum + b.netMinor, 0),
);

export const isSettled = computed(() =>
    balances.value.every((b) => b.netMinor === 0),
);

// ---------------------------------------------------------------------------
// Raw obligations — who actually owes whom, before minimisation
// ---------------------------------------------------------------------------

export type Obligation = {
    fromId: string;
    toId: string;
    amountMinor: number;
    expense: Expense;
};

/** One row per (claimer, Expense) pair: what you owe the person who fronted it. */
export const rawObligations = computed<Obligation[]>(() => {
    const rows: Obligation[] = [];

    for (const allocation of allocations.value) {
        for (const [id, amount] of Object.entries(allocation.perParticipant)) {
            if (id === allocation.expense.payerId || amount === 0) {
                continue;
            }

            rows.push({
                fromId: id,
                toId: allocation.expense.payerId,
                amountMinor: amount,
                expense: allocation.expense,
            });
        }
    }

    return rows.sort((a, b) => b.amountMinor - a.amountMinor);
});

/** Raw obligations rolled up per person-pair, netted both ways. */
export type PairDebt = { fromId: string; toId: string; amountMinor: number };

export const pairDebts = computed<PairDebt[]>(() => {
    const totals = new Map<string, number>();

    for (const row of rawObligations.value) {
        const key = [row.fromId, row.toId].join('>');
        totals.set(key, (totals.get(key) ?? 0) + row.amountMinor);
    }

    const netted: PairDebt[] = [];
    const seen = new Set<string>();

    for (const [key, amount] of totals) {
        const [fromId, toId] = key.split('>');
        const reverseKey = [toId, fromId].join('>');

        if (seen.has(key) || seen.has(reverseKey)) {
            continue;
        }

        seen.add(key);

        const net = amount - (totals.get(reverseKey) ?? 0);

        if (net > 0) {
            netted.push({ fromId, toId, amountMinor: net });
        }

        if (net < 0) {
            netted.push({ fromId: toId, toId: fromId, amountMinor: -net });
        }
    }

    return netted.sort((a, b) => b.amountMinor - a.amountMinor);
});

// ---------------------------------------------------------------------------
// Suggested Transfers — the minimal set
// ---------------------------------------------------------------------------

export type TransferSource = {
    /** who actually fronted this slice of the debt */
    creditorId: string;
    amountMinor: number;
    direct: boolean;
};

export type SuggestedTransfer = {
    id: string;
    fromId: string;
    toId: string;
    amountMinor: number;
    /** what this transfer is standing in for: the raw obligations it clears */
    sources: TransferSource[];
};

/**
 * Greedy min-cash-flow: largest debtor pays largest creditor until one is
 * cleared. Produces at most (n - 1) transfers, and is the shape people find
 * socially strange, which is the whole point of this prototype.
 */
const rawTransfers = computed(() => {
    const debtors = balances.value
        .filter((b) => b.netMinor < 0)
        .map((b) => ({ id: b.participant.id, amount: -b.netMinor }))
        .sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));
    const creditors = balances.value
        .filter((b) => b.netMinor > 0)
        .map((b) => ({ id: b.participant.id, amount: b.netMinor }))
        .sort((a, b) => b.amount - a.amount || a.id.localeCompare(b.id));

    const result: { fromId: string; toId: string; amountMinor: number }[] = [];
    let d = 0;
    let c = 0;

    while (d < debtors.length && c < creditors.length) {
        const amount = Math.min(debtors[d].amount, creditors[c].amount);

        if (amount > 0) {
            result.push({
                fromId: debtors[d].id,
                toId: creditors[c].id,
                amountMinor: amount,
            });
        }

        debtors[d].amount -= amount;
        creditors[c].amount -= amount;

        if (debtors[d].amount === 0) {
            d += 1;
        }

        if (creditors[c].amount === 0) {
            c += 1;
        }
    }

    return result;
});

/**
 * Attribute each transfer to the raw obligations it stands in for, so
 * "why am I paying them?" has a true answer rather than a shrug. The debtor's
 * direct debt to this creditor is consumed first, so the honest part of the
 * payment surfaces at the top of the explanation.
 */
export const suggestedTransfers = computed<SuggestedTransfer[]>(() => {
    const remaining = new Map<string, number>();

    for (const pair of pairDebts.value) {
        remaining.set([pair.fromId, pair.toId].join('>'), pair.amountMinor);
    }

    return rawTransfers.value.map((transfer, index) => {
        const sources: TransferSource[] = [];
        let left = transfer.amountMinor;

        const consume = (creditorId: string, direct: boolean) => {
            const key = [transfer.fromId, creditorId].join('>');
            const available = remaining.get(key) ?? 0;
            const take = Math.min(available, left);

            if (take <= 0) {
                return;
            }

            remaining.set(key, available - take);
            left -= take;
            sources.push({ creditorId, amountMinor: take, direct });
        };

        consume(transfer.toId, true);

        for (const p of participants) {
            if (left <= 0) {
                break;
            }

            if (p.id === transfer.toId || p.id === transfer.fromId) {
                continue;
            }

            consume(p.id, false);
        }

        const id = 't' + index;

        return {
            id,
            fromId: transfer.fromId,
            toId: transfer.toId,
            amountMinor: transfer.amountMinor,
            sources,
        };
    });
});

/** What has already changed hands between two people, from the Payment ledger. */
export function paidBetween(fromId: string, toId: string): number {
    return payments
        .filter((pay) => pay.fromId === fromId && pay.toId === toId)
        .reduce((sum, pay) => sum + pay.amountMinor, 0);
}

export function transfersFor(participantId: string): SuggestedTransfer[] {
    return suggestedTransfers.value.filter(
        (t) => t.fromId === participantId || t.toId === participantId,
    );
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export function recordPayment(
    fromId: string,
    toId: string,
    amountMinor: number,
): void {
    if (amountMinor <= 0) {
        return;
    }

    payments.push({
        id: 'pay' + (payments.length + 1),
        fromId,
        toId,
        amountMinor,
        at: Date.now(),
    });

    lastChange.value = {
        note: `${nameOf(fromId)} paid ${nameOf(toId)} ${formatMoney(amountMinor)}`,
        at: Date.now(),
    };
}

/**
 * The ADR-0001 scenario: a Claim lands after someone has already paid, and
 * pulls a squared-up Participant back into debt.
 */
export function lateClaim(): void {
    if (sharesFor('l4', 'p3') > 0) {
        return;
    }

    if (!claims.l4) {
        claims.l4 = {};
    }

    claims.l4.p3 = 1;

    lastChange.value = {
        note: 'Chidi claimed the Cacio e pepe — 4 days after the dinner',
        at: Date.now(),
    };
}

/** Everyone square: record every suggested transfer in full. */
export function settleEverything(): void {
    for (const transfer of suggestedTransfers.value) {
        payments.push({
            id: 'pay' + (payments.length + 1),
            fromId: transfer.fromId,
            toId: transfer.toId,
            amountMinor: transfer.amountMinor,
            at: Date.now(),
        });
    }

    lastChange.value = { note: 'Everyone is square', at: Date.now() };
}

export function resetScenario(): void {
    payments.splice(0, payments.length);

    for (const key of Object.keys(claims)) {
        delete claims[key];
    }

    Object.assign(claims, initialClaims());

    lastChange.value = null;
}

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

const money = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: CURRENCY,
});

export function formatMoney(minor: number): string {
    return money.format(minor / 100);
}

export function nameOf(participantId: string): string {
    return participants.find((p) => p.id === participantId)?.name ?? '?';
}

export function colorOf(participantId: string): string {
    return (
        participants.find((p) => p.id === participantId)?.color ??
        'bg-neutral-400'
    );
}

export function participantOf(participantId: string): Participant {
    return participants.find((p) => p.id === participantId)!;
}

/** Every Expense line that contributed to this Participant's total, itemised. */
export type OwedLine = {
    expense: Expense;
    amountMinor: number;
    payerId: string;
};

export function owedLinesFor(participantId: string): OwedLine[] {
    return allocations.value
        .map((allocation) => ({
            expense: allocation.expense,
            amountMinor: allocation.perParticipant[participantId] ?? 0,
            payerId: allocation.expense.payerId,
        }))
        .filter((line) => line.amountMinor !== 0);
}

/** Did these two ever share an Expense? Drives the "you never sat with them" note. */
export function haveSharedAnExpense(a: string, b: string): boolean {
    return allocations.value.some(
        (allocation) =>
            (allocation.perParticipant[a] ?? 0) > 0 &&
            (allocation.perParticipant[b] ?? 0) > 0,
    );
}
