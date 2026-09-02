<script setup lang="ts">
/**
 * PROTOTYPE Variant C — Shell + drill-in.
 * Save the Expense shell first; Line Items and Adjustments are separate taps.
 * Contests nested-on-create vs per-resource edit (the route map's assumption).
 */
import { ChevronLeft, ChevronRight, Plus, Trash2 } from '@lucide/vue';
import { computed } from 'vue';
import {
    addAdjustment,
    addLineItem,
    claimerCount,
    claimerNames,
    deleteExpense,
    draft,
    drillTarget,
    expenseTotal,
    flash,
    formatMoney,
    isOverClaimed,
    lineTotal,
    majorInputValue,
    mode,
    parseMajorToMinor,
    participants,
    removeAdjustment,
    removeLineItem,
    saveDraft,
    sharesOn,
} from './state';

const title = computed(() => {
    const target = drillTarget.value;

    if (!target || target.kind === 'shell') {
        return mode.value === 'create' ? 'Expense shell' : 'Expense';
    }

    if (target.kind === 'line') {
        const item = draft.lineItems.find((l) => l.id === target.id);

        return item?.description || 'Line Item';
    }

    const adj = draft.adjustments.find((a) => a.id === target.id);

    return adj?.label || 'Adjustment';
});

const activeLine = computed(() => {
    const target = drillTarget.value;

    if (target?.kind !== 'line') {
        return null;
    }

    return draft.lineItems.find((l) => l.id === target.id) ?? null;
});

const activeAdj = computed(() => {
    const target = drillTarget.value;

    if (target?.kind !== 'adjustment') {
        return null;
    }

    return draft.adjustments.find((a) => a.id === target.id) ?? null;
});

function openShell(): void {
    drillTarget.value = { kind: 'shell' };
}

function openLine(id: string): void {
    drillTarget.value = { kind: 'line', id };
}

function openAdj(id: string): void {
    drillTarget.value = { kind: 'adjustment', id };
}

function back(): void {
    drillTarget.value = null;
}

function addAndOpenLine(): void {
    const item = addLineItem();
    openLine(item.id);
}

function addAndOpenAdj(): void {
    const adj = addAdjustment({ label: 'Tip', allocation: 'pro-rata' });
    openAdj(adj.id);
}

function removeActiveLine(): void {
    if (!activeLine.value) {
        return;
    }

    removeLineItem(activeLine.value.id);
    back();
}

function removeActiveAdj(): void {
    if (!activeAdj.value) {
        return;
    }

    removeAdjustment(activeAdj.value.id);
    back();
}
</script>

<template>
    <div class="mx-auto flex min-h-dvh max-w-md flex-col bg-neutral-100 pb-28 text-neutral-900">
        <header class="border-b border-neutral-200 bg-white px-3 pt-3 pb-3">
            <div class="flex items-center gap-1">
                <button
                    v-if="drillTarget"
                    type="button"
                    class="grid size-9 place-items-center rounded-full hover:bg-neutral-100"
                    aria-label="Back"
                    @click="back"
                >
                    <ChevronLeft class="size-5" />
                </button>
                <div class="min-w-0 flex-1 px-1">
                    <p class="text-[10px] font-medium tracking-wide text-neutral-400 uppercase">
                        Shell + drill-in
                    </p>
                    <h1 class="truncate text-lg font-semibold">{{ title }}</h1>
                </div>
            </div>
        </header>

        <div
            v-if="flash"
            class="mx-3 mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
        >
            {{ flash }}
        </div>

        <!-- List home -->
        <template v-if="!drillTarget">
            <button
                type="button"
                class="mx-3 mt-3 flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-left shadow-sm ring-1 ring-neutral-200/80"
                @click="openShell"
            >
                <div class="min-w-0">
                    <p class="text-xs text-neutral-400">Shell</p>
                    <p class="truncate font-medium">
                        {{ draft.description || 'Untitled Expense' }}
                    </p>
                    <p class="text-sm text-neutral-500">
                        {{
                            participants.find((p) => p.id === draft.payerId)
                                ?.name
                        }}
                        paid · {{ formatMoney(expenseTotal) }}
                    </p>
                </div>
                <ChevronRight class="size-5 shrink-0 text-neutral-300" />
            </button>

            <section class="mt-5 px-3">
                <div class="mb-2 flex items-center justify-between px-1">
                    <h2 class="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                        Line Items
                    </h2>
                    <button
                        type="button"
                        class="flex items-center gap-1 text-xs font-medium text-sky-700"
                        @click="addAndOpenLine"
                    >
                        <Plus class="size-3.5" />
                        Add
                    </button>
                </div>
                <ul class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200/80">
                    <li
                        v-for="(item, i) in draft.lineItems"
                        :key="item.id"
                        class="flex items-center gap-2 px-4 py-3"
                        :class="i > 0 ? 'border-t border-neutral-100' : ''"
                    >
                        <button
                            type="button"
                            class="min-w-0 flex-1 text-left"
                            @click="openLine(item.id)"
                        >
                            <p class="truncate text-sm font-medium">
                                {{ item.description || 'Untitled line' }}
                            </p>
                            <p class="text-xs text-neutral-500 tabular-nums">
                                {{ item.quantity }} ×
                                {{ formatMoney(item.unitPriceMinor) }}
                                =
                                {{ formatMoney(lineTotal(item)) }}
                            </p>
                            <p
                                v-if="mode === 'edit' && claimerCount(item.id) > 0"
                                class="mt-0.5 text-[11px]"
                                :class="
                                    isOverClaimed(item)
                                        ? 'font-medium text-amber-700'
                                        : 'text-neutral-400'
                                "
                            >
                                {{ sharesOn(item.id) }}/{{ item.quantity }} ·
                                {{ claimerNames(item.id) }}
                            </p>
                        </button>
                        <ChevronRight class="size-4 text-neutral-300" />
                    </li>
                    <li
                        v-if="draft.lineItems.length === 0"
                        class="px-4 py-6 text-center text-sm text-neutral-400"
                    >
                        No lines yet — Add one
                    </li>
                </ul>
            </section>

            <section class="mt-5 px-3">
                <div class="mb-2 flex items-center justify-between px-1">
                    <h2 class="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                        Adjustments
                    </h2>
                    <button
                        type="button"
                        class="flex items-center gap-1 text-xs font-medium text-sky-700"
                        @click="addAndOpenAdj"
                    >
                        <Plus class="size-3.5" />
                        Add
                    </button>
                </div>
                <ul class="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200/80">
                    <li
                        v-for="(adj, i) in draft.adjustments"
                        :key="adj.id"
                        class="flex items-center gap-2 px-4 py-3"
                        :class="i > 0 ? 'border-t border-neutral-100' : ''"
                    >
                        <button
                            type="button"
                            class="min-w-0 flex-1 text-left"
                            @click="openAdj(adj.id)"
                        >
                            <p class="truncate text-sm font-medium">
                                {{ adj.label || 'Untitled' }}
                            </p>
                            <p class="text-xs text-neutral-500">
                                {{ formatMoney(adj.amountMinor) }} ·
                                {{
                                    adj.allocation === 'pro-rata'
                                        ? 'pro-rata'
                                        : 'even'
                                }}
                            </p>
                        </button>
                        <ChevronRight class="size-4 text-neutral-300" />
                    </li>
                    <li
                        v-if="draft.adjustments.length === 0"
                        class="px-4 py-6 text-center text-sm text-neutral-400"
                    >
                        No tax or tip yet
                    </li>
                </ul>
            </section>

            <div class="mt-6 flex gap-2 px-3">
                <button
                    v-if="mode === 'edit'"
                    type="button"
                    class="rounded-xl px-4 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200"
                    @click="deleteExpense()"
                >
                    Delete Expense
                </button>
                <button
                    type="button"
                    class="flex-1 rounded-xl bg-neutral-900 py-3 text-sm font-medium text-white"
                    @click="saveDraft()"
                >
                    Done · {{ formatMoney(expenseTotal) }}
                </button>
            </div>
            <p class="mt-2 px-4 text-center text-[11px] text-neutral-400">
                Each tap is a separate resource call — create is slower; correction is the happy path.
            </p>
        </template>

        <!-- Shell drill-in -->
        <section v-else-if="drillTarget.kind === 'shell'" class="space-y-4 px-4 pt-4">
            <label class="block">
                <span class="text-xs font-medium text-neutral-500">Description</span>
                <input
                    v-model="draft.description"
                    type="text"
                    class="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-base outline-none"
                />
            </label>
            <fieldset>
                <legend class="text-xs font-medium text-neutral-500">Payer</legend>
                <div class="mt-1.5 flex flex-wrap gap-1.5">
                    <button
                        v-for="p in participants"
                        :key="p.id"
                        type="button"
                        class="rounded-full px-3 py-1.5 text-sm"
                        :class="
                            draft.payerId === p.id
                                ? 'bg-sky-600 text-white'
                                : 'bg-white text-neutral-600 ring-1 ring-neutral-200'
                        "
                        @click="draft.payerId = p.id"
                    >
                        {{ p.name }}
                    </button>
                </div>
            </fieldset>
            <button
                type="button"
                class="w-full rounded-xl bg-neutral-900 py-3 text-sm font-medium text-white"
                @click="back"
            >
                Save shell
            </button>
        </section>

        <!-- Line drill-in -->
        <section v-else-if="activeLine" class="space-y-4 px-4 pt-4">
            <div
                v-if="mode === 'edit' && claimerCount(activeLine.id) > 0"
                class="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
            >
                {{ claimerCount(activeLine.id) }} people claimed this
                ({{ claimerNames(activeLine.id) }}). Changing price moves their
                Balances. Warn, never block.
            </div>
            <label class="block">
                <span class="text-xs font-medium text-neutral-500">Description</span>
                <input
                    v-model="activeLine.description"
                    type="text"
                    class="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 outline-none"
                />
            </label>
            <div class="grid grid-cols-2 gap-3">
                <label class="block">
                    <span class="text-xs font-medium text-neutral-500">Quantity</span>
                    <input
                        v-model.number="activeLine.quantity"
                        type="number"
                        min="1"
                        class="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 tabular-nums outline-none"
                    />
                </label>
                <label class="block">
                    <span class="text-xs font-medium text-neutral-500">Unit price</span>
                    <input
                        :value="majorInputValue(activeLine.unitPriceMinor)"
                        type="text"
                        inputmode="decimal"
                        class="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-right tabular-nums outline-none"
                        @change="
                            activeLine.unitPriceMinor = parseMajorToMinor(
                                ($event.target as HTMLInputElement).value,
                            )
                        "
                    />
                </label>
            </div>
            <p class="text-sm text-neutral-500">
                Line total
                <span class="font-medium text-neutral-900 tabular-nums">
                    {{ formatMoney(lineTotal(activeLine)) }}
                </span>
            </p>
            <div class="flex gap-2">
                <button
                    type="button"
                    class="flex items-center gap-1 rounded-xl px-3 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200"
                    @click="removeActiveLine"
                >
                    <Trash2 class="size-3.5" />
                    Delete line
                </button>
                <button
                    type="button"
                    class="flex-1 rounded-xl bg-neutral-900 py-3 text-sm font-medium text-white"
                    @click="back"
                >
                    Save line
                </button>
            </div>
        </section>

        <!-- Adjustment drill-in -->
        <section v-else-if="activeAdj" class="space-y-4 px-4 pt-4">
            <label class="block">
                <span class="text-xs font-medium text-neutral-500">Label</span>
                <input
                    v-model="activeAdj.label"
                    type="text"
                    class="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 outline-none"
                />
            </label>
            <label class="block">
                <span class="text-xs font-medium text-neutral-500">Amount</span>
                <input
                    :value="majorInputValue(activeAdj.amountMinor)"
                    type="text"
                    inputmode="decimal"
                    class="mt-1 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-right tabular-nums outline-none"
                    @change="
                        activeAdj.amountMinor = parseMajorToMinor(
                            ($event.target as HTMLInputElement).value,
                        )
                    "
                />
            </label>
            <fieldset>
                <legend class="text-xs font-medium text-neutral-500">
                    How it splits
                </legend>
                <div class="mt-1.5 grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        class="rounded-xl px-3 py-3 text-left text-sm ring-1"
                        :class="
                            activeAdj.allocation === 'pro-rata'
                                ? 'bg-sky-50 ring-sky-300'
                                : 'bg-white ring-neutral-200'
                        "
                        @click="activeAdj.allocation = 'pro-rata'"
                    >
                        <p class="font-medium">Pro-rata</p>
                        <p class="mt-0.5 text-xs text-neutral-500">
                            With each claimer’s subtotal
                        </p>
                    </button>
                    <button
                        type="button"
                        class="rounded-xl px-3 py-3 text-left text-sm ring-1"
                        :class="
                            activeAdj.allocation === 'even'
                                ? 'bg-sky-50 ring-sky-300'
                                : 'bg-white ring-neutral-200'
                        "
                        @click="activeAdj.allocation = 'even'"
                    >
                        <p class="font-medium">Even</p>
                        <p class="mt-0.5 text-xs text-neutral-500">
                            Anyone who claimed in the Group
                        </p>
                    </button>
                </div>
            </fieldset>
            <div class="flex gap-2">
                <button
                    type="button"
                    class="rounded-xl px-3 py-3 text-sm font-medium text-rose-700 ring-1 ring-rose-200"
                    @click="removeActiveAdj"
                >
                    Delete
                </button>
                <button
                    type="button"
                    class="flex-1 rounded-xl bg-neutral-900 py-3 text-sm font-medium text-white"
                    @click="back"
                >
                    Save adjustment
                </button>
            </div>
        </section>
    </div>
</template>
