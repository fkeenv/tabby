/**
 * PROTOTYPE — throwaway. Answers issue #2: does share-based claiming survive
 * contact with a real receipt on a phone?
 *
 * Module-level reactive state so claims survive switching between variants.
 * No persistence, no backend. Numbers are integer cents; the remainder policy
 * is undecided (issue #3) so per-person splits here are naive and may be a
 * cent out — deliberately not the question this prototype answers.
 */
import { reactive, computed } from 'vue';

export type Participant = {
    id: string;
    name: string;
    color: string;
};

export type LineItem = {
    id: string;
    description: string;
    quantity: number;
    unitPriceCents: number;
};

export type Adjustment = {
    id: string;
    label: string;
    amountCents: number;
    allocation: 'even' | 'pro-rata';
};

/** claims[lineItemId][participantId] = shares */
type Claims = Record<string, Record<string, number>>;

export const participants = reactive<Participant[]>([
    { id: 'p1', name: 'Alice', color: 'bg-rose-500' },
    { id: 'p2', name: 'Ben', color: 'bg-amber-500' },
    { id: 'p3', name: 'Chidi', color: 'bg-emerald-500' },
    { id: 'p4', name: 'Dara', color: 'bg-sky-500' },
]);

const palette = [
    'bg-violet-500',
    'bg-fuchsia-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-lime-600',
];

export const lineItems: LineItem[] = [
    {
        id: 'l1',
        description: 'Sourdough & cultured butter',
        quantity: 1,
        unitPriceCents: 800,
    },
    {
        id: 'l2',
        description: 'Burrata, peach, basil',
        quantity: 1,
        unitPriceCents: 1600,
    },
    {
        id: 'l3',
        description: 'Margherita pizza',
        quantity: 2,
        unitPriceCents: 1900,
    },
    {
        id: 'l4',
        description: 'Cacio e pepe',
        quantity: 1,
        unitPriceCents: 2200,
    },
    {
        id: 'l5',
        description: 'Grilled branzino',
        quantity: 1,
        unitPriceCents: 3400,
    },
    {
        id: 'l6',
        description: 'Rosemary fries',
        quantity: 3,
        unitPriceCents: 600,
    },
    { id: 'l7', description: 'Negroni', quantity: 4, unitPriceCents: 1600 },
    {
        id: 'l8',
        description: 'Chianti Classico (bottle)',
        quantity: 1,
        unitPriceCents: 4800,
    },
    {
        id: 'l9',
        description: 'Sparkling water (large)',
        quantity: 2,
        unitPriceCents: 500,
    },
    { id: 'l10', description: 'Tiramisu', quantity: 2, unitPriceCents: 1200 },
    { id: 'l11', description: 'Espresso', quantity: 3, unitPriceCents: 450 },
];

export const adjustments: Adjustment[] = [
    { id: 'a1', label: 'Sales tax', amountCents: 2103, allocation: 'pro-rata' },
    { id: 'a2', label: 'Tip (20%)', amountCents: 4740, allocation: 'pro-rata' },
    { id: 'a3', label: 'Table service', amountCents: 800, allocation: 'even' },
];

/** What the rest of the table claimed before you opened the link. */
export const claims = reactive<Claims>({
    l1: { p1: 1, p2: 1 },
    l2: { p1: 1 },
    l3: { p2: 1, p3: 1 },
    l5: { p1: 1 },
    l6: { p2: 1, p4: 1 },
    l7: { p1: 1, p2: 1, p4: 1 },
    l8: { p1: 1, p3: 1, p4: 1 },
    l9: { p3: 1, p4: 1 },
    l11: { p1: 1, p3: 1 },
});

/** Who this device is acting as. null = first contact. */
export const session = reactive<{
    meId: string | null;
    actingAsId: string | null;
}>({
    meId: null,
    actingAsId: null,
});

export function formatMoney(cents: number): string {
    return '$' + (cents / 100).toFixed(2);
}

export function sharesFor(lineItemId: string, participantId: string): number {
    return claims[lineItemId]?.[participantId] ?? 0;
}

export function totalShares(lineItemId: string): number {
    return Object.values(claims[lineItemId] ?? {}).reduce(
        (sum, n) => sum + n,
        0,
    );
}

export function claimersOf(lineItemId: string): Participant[] {
    const row = claims[lineItemId] ?? {};

    return participants.filter((p) => (row[p.id] ?? 0) > 0);
}

export function setShares(
    lineItemId: string,
    participantId: string,
    shares: number,
): void {
    if (!claims[lineItemId]) {
        claims[lineItemId] = {};
    }

    if (shares <= 0) {
        delete claims[lineItemId][participantId];

        return;
    }

    claims[lineItemId][participantId] = shares;
}

export function bumpShares(
    lineItemId: string,
    participantId: string,
    delta: number,
): void {
    setShares(
        lineItemId,
        participantId,
        sharesFor(lineItemId, participantId) + delta,
    );
}

/** Naive: a Line Item's cost divides by total Shares claimed against it. */
export function subtotalCentsFor(participantId: string): number {
    return lineItems.reduce((sum, item) => {
        const total = totalShares(item.id);

        if (total === 0) {
            return sum;
        }

        const mine = sharesFor(item.id, participantId);
        const cost = item.quantity * item.unitPriceCents;

        return sum + Math.round((cost * mine) / total);
    }, 0);
}

export function adjustmentCentsFor(participantId: string): number {
    const everyoneSubtotal = participants.reduce(
        (sum, p) => sum + subtotalCentsFor(p.id),
        0,
    );
    const mySubtotal = subtotalCentsFor(participantId);
    const claimerCount =
        participants.filter((p) => subtotalCentsFor(p.id) > 0).length || 1;

    return adjustments.reduce((sum, adj) => {
        if (adj.allocation === 'even') {
            return (
                sum +
                (mySubtotal > 0
                    ? Math.round(adj.amountCents / claimerCount)
                    : 0)
            );
        }

        if (everyoneSubtotal === 0) {
            return sum;
        }

        return (
            sum + Math.round((adj.amountCents * mySubtotal) / everyoneSubtotal)
        );
    }, 0);
}

export function totalCentsFor(participantId: string): number {
    return subtotalCentsFor(participantId) + adjustmentCentsFor(participantId);
}

export const receiptTotalCents = computed(
    () =>
        lineItems.reduce((sum, i) => sum + i.quantity * i.unitPriceCents, 0) +
        adjustments.reduce((sum, a) => sum + a.amountCents, 0),
);

export const unclaimedItems = computed(() =>
    lineItems.filter((i) => totalShares(i.id) === 0),
);

/** Naive near-duplicate check for the "Al / Alice / alice" problem. */
export function similarNames(candidate: string): Participant[] {
    const normalise = (s: string) =>
        s
            .trim()
            .toLowerCase()
            .replace(/[^a-z]/g, '');
    const c = normalise(candidate);

    if (c.length < 2) {
        return [];
    }

    return participants.filter((p) => {
        const n = normalise(p.name);

        return n === c || n.startsWith(c) || c.startsWith(n);
    });
}

export function addParticipant(name: string): Participant {
    const participant: Participant = {
        id: 'p' + (participants.length + 1) + '-' + Date.now(),
        name: name.trim(),
        color: palette[participants.length % palette.length],
    };
    participants.push(participant);

    return participant;
}

export function joinAs(participant: Participant): void {
    session.meId = participant.id;
    session.actingAsId = participant.id;
}

export function resetSession(): void {
    session.meId = null;
    session.actingAsId = null;
}

export const me = computed(
    () => participants.find((p) => p.id === session.meId) ?? null,
);
export const actingAs = computed(
    () => participants.find((p) => p.id === session.actingAsId) ?? null,
);

export const groupName = 'Nonna Rosa — Saturday';
export const payerName = 'Alice';

/** Every Share on this Line Item is spoken for: total claimed has reached quantity. */
export function isFull(lineItemId: string, quantity: number): boolean {
    return totalShares(lineItemId) >= quantity;
}
