<script setup lang="ts">
/**
 * PROTOTYPE Variant B — Total-first.
 * Lead with one amount (implicit Line Item). Breaking into lines is optional.
 * Contests typing burden and whether unitemised is the common case.
 */
import { ChevronDown, ChevronRight, Plus, Trash2 } from '@lucide/vue';
import { computed, ref, watch } from 'vue';
import {
    addAdjustment,
    addLineItem,
    claimerCount,
    claimerNames,
    deleteExpense,
    draft,
    expenseTotal,
    flash,
    formatMoney,
    isOverClaimed,
    lineTotal,
    majorInputValue,
    mode,
    nextId,
    parseMajorToMinor,
    participants,
    removeAdjustment,
    removeLineItem,
    saveDraft,
} from './state';

const expanded = ref(false);
const showAdjustments = ref(false);

const lump = computed({
    get(): string {
        if (draft.lineItems.length !== 1) {
            return majorInputValue(expenseTotal.value);
        }

        return majorInputValue(lineTotal(draft.lineItems[0]));
    },
    set(raw: string) {
        const minor = parseMajorToMinor(raw);

        if (draft.lineItems.length === 0) {
            addLineItem({
                description: draft.description || 'Expense',
                quantity: 1,
                unitPriceMinor: minor,
            });

            return;
        }

        if (draft.lineItems.length === 1) {
            draft.lineItems[0].quantity = 1;
            draft.lineItems[0].unitPriceMinor = minor;
            if (!draft.lineItems[0].description) {
                draft.lineItems[0].description = draft.description || 'Expense';
            }
        }
    },
});

watch(
    () => [mode.value, draft.lineItems.length] as const,
    ([nextMode, n]) => {
        if (nextMode === 'edit' && n > 1) {
            expanded.value = true;
            showAdjustments.value = draft.adjustments.length > 0;
        }

        if (nextMode === 'create' && n <= 1) {
            expanded.value = false;
        }
    },
    { immediate: true },
);

watch(
    () => draft.lineItems.length,
    (n) => {
        if (n > 1) {
            expanded.value = true;
        }
    },
);

function breakIntoLines(): void {
    if (draft.lineItems.length === 0) {
        addLineItem({ description: '', quantity: 1, unitPriceMinor: 0 });
        addLineItem({ description: '', quantity: 1, unitPriceMinor: 0 });
        expanded.value = true;

        return;
    }

    if (draft.lineItems.length === 1) {
        const first = draft.lineItems[0];
        addLineItem({
            description: '',
            quantity: 1,
            unitPriceMinor: 0,
        });
        // Keep the first as the former lump so the Organizer can redistribute.
        void first;
        expanded.value = true;
    }
}

function collapseToLump(): void {
    const total = draft.lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPriceMinor,
        0,
    );
    const keepId = draft.lineItems[0]?.id ?? nextId('l');
    draft.lineItems.splice(0, draft.lineItems.length, {
        id: keepId,
        description: draft.description || 'Expense',
        quantity: 1,
        unitPriceMinor: total,
    });
    expanded.value = false;
}

const title = computed(() =>
    mode.value === 'create' ? 'What did you pay?' : 'Fix the total',
);
</script>

<template>
    <div class="mx-auto flex min-h-dvh max-w-md flex-col bg-zinc-950 pb-28 text-zinc-50">
        <header class="px-5 pt-6 pb-2">
            <p class="text-[11px] font-medium tracking-[0.14em] text-zinc-500 uppercase">
                Total-first
            </p>
            <h1 class="mt-1 text-2xl font-semibold tracking-tight">{{ title }}</h1>
            <p class="mt-1 text-sm text-zinc-400">
                One number off the receipt. Lines only if you need them.
            </p>
        </header>

        <div
            v-if="flash"
            class="mx-5 mt-3 rounded-xl bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300"
        >
            {{ flash }}
        </div>

        <section class="mt-6 px-5">
            <label class="block">
                <span class="sr-only">Amount</span>
                <div class="flex items-baseline gap-1 border-b border-zinc-700 pb-2">
                    <span class="text-3xl text-zinc-500">$</span>
                    <input
                        v-model="lump"
                        type="text"
                        inputmode="decimal"
                        placeholder="0.00"
                        class="w-full bg-transparent text-5xl font-semibold tracking-tight tabular-nums outline-none placeholder:text-zinc-700"
                        :disabled="expanded && draft.lineItems.length > 1"
                    />
                </div>
            </label>
            <p
                v-if="expanded && draft.lineItems.length > 1"
                class="mt-2 text-xs text-zinc-500"
            >
                Amount is the sum of lines below.
            </p>

            <input
                v-model="draft.description"
                type="text"
                placeholder="Where was this?"
                class="mt-5 w-full rounded-2xl bg-zinc-900 px-4 py-3 text-base outline-none ring-1 ring-zinc-800 placeholder:text-zinc-600 focus:ring-zinc-600"
            />

            <div class="mt-4">
                <p class="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">
                    Paid by
                </p>
                <div class="flex gap-2 overflow-x-auto pb-1">
                    <button
                        v-for="p in participants"
                        :key="p.id"
                        type="button"
                        class="shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium"
                        :class="
                            draft.payerId === p.id
                                ? 'bg-violet-500 text-white'
                                : 'bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800'
                        "
                        @click="draft.payerId = p.id"
                    >
                        {{ p.name }}
                    </button>
                </div>
            </div>
        </section>

        <section class="mt-8 px-5">
            <button
                type="button"
                class="flex w-full items-center justify-between rounded-2xl bg-zinc-900 px-4 py-3 ring-1 ring-zinc-800"
                @click="expanded ? collapseToLump() : breakIntoLines()"
            >
                <span class="text-sm font-medium">
                    {{
                        expanded
                            ? 'Collapse to one line'
                            : 'Break into Line Items'
                    }}
                </span>
                <ChevronDown
                    v-if="expanded"
                    class="size-4 text-zinc-500"
                />
                <ChevronRight v-else class="size-4 text-zinc-500" />
            </button>

            <ul v-if="expanded" class="mt-3 space-y-2">
                <li
                    v-for="item in draft.lineItems"
                    :key="item.id"
                    class="rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800"
                    :class="isOverClaimed(item) ? 'ring-amber-500' : ''"
                >
                    <input
                        v-model="item.description"
                        type="text"
                        placeholder="Line"
                        class="w-full bg-transparent text-sm outline-none placeholder:text-zinc-600"
                    />
                    <div class="mt-2 flex gap-2">
                        <input
                            v-model.number="item.quantity"
                            type="number"
                            min="1"
                            class="w-14 rounded-lg bg-zinc-950 px-2 py-1.5 text-center text-sm tabular-nums outline-none ring-1 ring-zinc-800"
                        />
                        <input
                            :value="majorInputValue(item.unitPriceMinor)"
                            type="text"
                            inputmode="decimal"
                            placeholder="unit"
                            class="min-w-0 flex-1 rounded-lg bg-zinc-950 px-2 py-1.5 text-right text-sm tabular-nums outline-none ring-1 ring-zinc-800"
                            @change="
                                item.unitPriceMinor = parseMajorToMinor(
                                    ($event.target as HTMLInputElement).value,
                                )
                            "
                        />
                        <button
                            type="button"
                            class="grid size-8 place-items-center text-zinc-500"
                            @click="removeLineItem(item.id)"
                        >
                            <Trash2 class="size-3.5" />
                        </button>
                    </div>
                    <p
                        v-if="mode === 'edit' && claimerCount(item.id) > 0"
                        class="mt-2 text-[11px] text-zinc-500"
                    >
                        {{ claimerNames(item.id) }} claimed ·
                        warn on edit, never block
                    </p>
                </li>
                <button
                    type="button"
                    class="flex w-full items-center justify-center gap-1 rounded-xl py-2 text-sm text-zinc-400"
                    @click="addLineItem()"
                >
                    <Plus class="size-4" />
                    Another line
                </button>
            </ul>
        </section>

        <section class="mt-4 px-5">
            <button
                type="button"
                class="flex w-full items-center justify-between rounded-2xl bg-zinc-900 px-4 py-3 ring-1 ring-zinc-800"
                @click="showAdjustments = !showAdjustments"
            >
                <span class="text-sm font-medium">
                    Tax & tip
                    <span class="text-zinc-500">
                        · {{ draft.adjustments.length || 'none' }}
                    </span>
                </span>
                <ChevronDown
                    class="size-4 text-zinc-500 transition"
                    :class="showAdjustments ? 'rotate-180' : ''"
                />
            </button>

            <div v-if="showAdjustments" class="mt-3 space-y-2">
                <div
                    v-for="adj in draft.adjustments"
                    :key="adj.id"
                    class="rounded-2xl bg-zinc-900 p-3 ring-1 ring-zinc-800"
                >
                    <div class="flex gap-2">
                        <input
                            v-model="adj.label"
                            type="text"
                            placeholder="Label"
                            class="min-w-0 flex-1 bg-transparent text-sm outline-none"
                        />
                        <input
                            :value="majorInputValue(adj.amountMinor)"
                            type="text"
                            inputmode="decimal"
                            class="w-20 rounded-lg bg-zinc-950 px-2 py-1 text-right text-sm tabular-nums outline-none ring-1 ring-zinc-800"
                            @change="
                                adj.amountMinor = parseMajorToMinor(
                                    ($event.target as HTMLInputElement).value,
                                )
                            "
                        />
                        <button
                            type="button"
                            class="text-zinc-500"
                            @click="removeAdjustment(adj.id)"
                        >
                            <Trash2 class="size-3.5" />
                        </button>
                    </div>
                    <div class="mt-2 flex gap-1">
                        <button
                            type="button"
                            class="rounded-full px-2.5 py-1 text-[11px]"
                            :class="
                                adj.allocation === 'pro-rata'
                                    ? 'bg-violet-500/20 text-violet-300'
                                    : 'bg-zinc-950 text-zinc-500'
                            "
                            @click="adj.allocation = 'pro-rata'"
                        >
                            With claims
                        </button>
                        <button
                            type="button"
                            class="rounded-full px-2.5 py-1 text-[11px]"
                            :class="
                                adj.allocation === 'even'
                                    ? 'bg-violet-500/20 text-violet-300'
                                    : 'bg-zinc-950 text-zinc-500'
                            "
                            @click="adj.allocation = 'even'"
                        >
                            Split even
                        </button>
                    </div>
                </div>
                <button
                    type="button"
                    class="flex w-full items-center justify-center gap-1 py-2 text-sm text-zinc-400"
                    @click="
                        addAdjustment({
                            label: 'Tip',
                            allocation: 'pro-rata',
                        });
                        showAdjustments = true;
                    "
                >
                    <Plus class="size-4" />
                    Add adjustment
                </button>
            </div>
        </section>

        <footer
            class="fixed inset-x-0 bottom-14 z-30 border-t border-zinc-800 bg-zinc-950/95 px-5 py-3 backdrop-blur"
        >
            <div class="mx-auto flex max-w-md gap-2">
                <button
                    v-if="mode === 'edit'"
                    type="button"
                    class="rounded-2xl px-4 py-3 text-sm font-medium text-rose-400 ring-1 ring-rose-900/60"
                    @click="deleteExpense()"
                >
                    Delete
                </button>
                <button
                    type="button"
                    class="flex-1 rounded-2xl bg-violet-500 py-3 text-sm font-semibold text-white"
                    @click="saveDraft()"
                >
                    {{ mode === 'create' ? 'Save' : 'Save fix' }}
                    · {{ formatMoney(expenseTotal) }}
                </button>
            </div>
        </footer>
    </div>
</template>
