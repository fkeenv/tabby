/**
 * PROTOTYPE — throwaway. Answers issue #16: how does the Organizer enter an
 * Expense — and correct one — on a phone?
 *
 * Module-level reactive state so the draft and mode survive variant switches.
 * No persistence, no backend. Money stays integer minor units; display formats
 * via Intl.NumberFormat.
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

export type DraftExpense = {
    id: string;
    description: string;
    payerId: string;
    lineItems: LineItem[];
    adjustments: Adjustment[];
};

/** claims[lineItemId][participantId] = shares */
export type Claims = Record<string, Record<string, number>>;

export type Mode = 'create' | 'edit';

export const CURRENCY = 'USD';
export const groupName = 'Nonna Rosa — Saturday';

export const participants = reactive<Participant[]>([
    { id: 'p1', name: 'Alice', color: 'bg-rose-500', isOrganizer: true },
    { id: 'p2', name: 'Ben', color: 'bg-amber-500', isOrganizer: false },
    { id: 'p3', name: 'Chidi', color: 'bg-emerald-500', isOrganizer: false },
    { id: 'p4', name: 'Dara', color: 'bg-sky-500', isOrganizer: false },
    { id: 'p5', name: 'Eve', color: 'bg-violet-500', isOrganizer: false },
]);

const dinnerLineItems = (): LineItem[] => [
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
];

const dinnerAdjustments = (): Adjustment[] => [
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
];

/** Pre-existing Claims on the dinner — leaves Cacio e pepe and Tiramisu Unclaimed. */
export const dinnerClaims: Claims = {
    l1: { p1: 1, p2: 1 },
    l2: { p1: 1 },
    l3: { p2: 1, p3: 1 },
    l5: { p1: 1 },
    l6: { p2: 1, p4: 1 },
    l7: { p1: 1, p2: 1, p4: 1 },
    l8: { p1: 1, p3: 1, p4: 1 },
    l9: { p3: 1, p4: 1 },
    l11: { p1: 1, p3: 1 },
};

function emptyDraft(): DraftExpense {
    return {
        id: 'new',
        description: '',
        payerId: 'p1',
        lineItems: [
            {
                id: nextId('l'),
                description: '',
                quantity: 1,
                unitPriceMinor: 0,
            },
        ],
        adjustments: [],
    };
}

function dinnerDraft(): DraftExpense {
    return {
        id: 'e1',
        description: 'Nonna Rosa — dinner',
        payerId: 'p1',
        lineItems: dinnerLineItems(),
        adjustments: dinnerAdjustments(),
    };
}

let seq = 100;

export function nextId(prefix: string): string {
    seq += 1;

    return `${prefix}${seq}`;
}

export const mode = ref<Mode>('edit');
export const draft = reactive<DraftExpense>(dinnerDraft());
export const claims = reactive<Claims>({ ...dinnerClaims });
export const flash = ref<string | null>(null);
export const originalPayerId = ref('p1');

/** Variant C: which resource is open for drill-in editing. */
export const drillTarget = ref<
    | { kind: 'shell' }
    | { kind: 'line'; id: string }
    | { kind: 'adjustment'; id: string }
    | null
>(null);

export function setMode(next: Mode): void {
    mode.value = next;
    flash.value = null;
    drillTarget.value = null;

    if (next === 'create') {
        Object.assign(draft, emptyDraft());
        Object.keys(claims).forEach((k) => delete claims[k]);
        originalPayerId.value = 'p1';
    } else {
        Object.assign(draft, dinnerDraft());
        Object.keys(claims).forEach((k) => delete claims[k]);
        Object.assign(claims, structuredClone(dinnerClaims));
        originalPayerId.value = 'p1';
    }
}

export function formatMoney(minor: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: CURRENCY,
    }).format(minor / 100);
}

export function parseMajorToMinor(raw: string): number {
    const cleaned = raw.replace(/[^0-9.]/g, '');

    if (cleaned === '' || cleaned === '.') {
        return 0;
    }

    const [whole, frac = ''] = cleaned.split('.');
    const cents = (frac + '00').slice(0, 2);

    return Number(whole || '0') * 100 + Number(cents);
}

export function majorInputValue(minor: number): string {
    if (minor === 0) {
        return '';
    }

    return (minor / 100).toFixed(2);
}

export function lineTotal(item: LineItem): number {
    return item.quantity * item.unitPriceMinor;
}

export const linesSubtotal = computed(() =>
    draft.lineItems.reduce((sum, item) => sum + lineTotal(item), 0),
);

export const adjustmentsTotal = computed(() =>
    draft.adjustments.reduce((sum, adj) => sum + adj.amountMinor, 0),
);

export const expenseTotal = computed(
    () => linesSubtotal.value + adjustmentsTotal.value,
);

export function sharesOn(lineItemId: string): number {
    const row = claims[lineItemId];

    if (!row) {
        return 0;
    }

    return Object.values(row).reduce((sum, n) => sum + n, 0);
}

export function claimerCount(lineItemId: string): number {
    const row = claims[lineItemId];

    if (!row) {
        return 0;
    }

    return Object.keys(row).filter((id) => (row[id] ?? 0) > 0).length;
}

export function claimerNames(lineItemId: string): string {
    const row = claims[lineItemId];

    if (!row) {
        return '';
    }

    return participants
        .filter((p) => (row[p.id] ?? 0) > 0)
        .map((p) => p.name)
        .join(', ');
}

export function isOverClaimed(item: LineItem): boolean {
    return sharesOn(item.id) > item.quantity;
}

export const claimedLineCount = computed(
    () => draft.lineItems.filter((item) => claimerCount(item.id) > 0).length,
);

export const payerChanged = computed(
    () =>
        mode.value === 'edit' && draft.payerId !== originalPayerId.value,
);

export const payerName = computed(
    () =>
        participants.find((p) => p.id === draft.payerId)?.name ?? 'Unknown',
);

export const originalPayerName = computed(
    () =>
        participants.find((p) => p.id === originalPayerId.value)?.name ??
        'Unknown',
);

export function saveDraft(): void {
    flash.value =
        mode.value === 'create'
            ? `Saved Expense · ${formatMoney(expenseTotal.value)} · nested create payload`
            : `Corrected in place · ${formatMoney(expenseTotal.value)} · Activity would record this`;
}

export function deleteExpense(): void {
    const n = claimedLineCount.value;
    flash.value =
        n > 0
            ? `Soft-deleted · ${n} Line Item${n === 1 ? '' : 's'} still have Claims (excluded from balances)`
            : 'Soft-deleted · no Claims touched';
}

export function addLineItem(
    partial?: Partial<LineItem>,
): LineItem {
    const item: LineItem = {
        id: nextId('l'),
        description: '',
        quantity: 1,
        unitPriceMinor: 0,
        ...partial,
    };
    draft.lineItems.push(item);

    return item;
}

export function removeLineItem(id: string): void {
    const index = draft.lineItems.findIndex((item) => item.id === id);

    if (index === -1) {
        return;
    }

    draft.lineItems.splice(index, 1);
    delete claims[id];
}

export function addAdjustment(
    partial?: Partial<Adjustment>,
): Adjustment {
    const adj: Adjustment = {
        id: nextId('a'),
        label: '',
        amountMinor: 0,
        allocation: 'pro-rata',
        ...partial,
    };
    draft.adjustments.push(adj);

    return adj;
}

export function removeAdjustment(id: string): void {
    const index = draft.adjustments.findIndex((adj) => adj.id === id);

    if (index === -1) {
        return;
    }

    draft.adjustments.splice(index, 1);
}
