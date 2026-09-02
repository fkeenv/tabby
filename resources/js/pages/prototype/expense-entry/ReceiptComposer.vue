<script setup lang="ts">
/**
 * PROTOTYPE Variant A — Receipt composer.
 * One nested phone form: payer → lines (qty × unit) → adjustments → save.
 * Contests nested create vs in-place edit, and qty + unit price as the fields.
 */
import { Minus, Plus, Trash2 } from '@lucide/vue';
import { computed } from 'vue';
import {
    addAdjustment,
    addLineItem,
    adjustmentsTotal,
    claimerCount,
    claimerNames,
    deleteExpense,
    draft,
    expenseTotal,
    flash,
    formatMoney,
    isOverClaimed,
    linesSubtotal,
    majorInputValue,
    mode,
    originalPayerName,
    parseMajorToMinor,
    participants,
    payerChanged,
    payerName,
    removeAdjustment,
    removeLineItem,
    saveDraft,
    sharesOn,
} from './state';

const title = computed(() =>
    mode.value === 'create' ? 'New Expense' : 'Correct Expense',
);
</script>

<template>
    <div class="mx-auto flex min-h-dvh max-w-md flex-col bg-stone-50 pb-28 text-stone-900">
        <header class="border-b border-stone-200 bg-white px-4 pt-4 pb-3">
            <p class="text-[11px] font-medium tracking-wide text-stone-400 uppercase">
                Receipt composer
            </p>
            <h1 class="mt-0.5 text-xl font-semibold tracking-tight">
                {{ title }}
            </h1>
            <p class="mt-1 text-sm text-stone-500">
                Whole receipt in one breath. Qty × unit price — line total is derived.
            </p>
        </header>

        <div v-if="flash" class="mx-4 mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {{ flash }}
        </div>

        <div
            v-if="mode === 'edit' && payerChanged"
            class="mx-4 mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
            Payer changing from {{ originalPayerName }} to {{ payerName }}. Anyone already paid
            {{ originalPayerName }} may be stranded — warn, never block.
        </div>

        <section class="space-y-3 px-4 pt-4">
            <label class="block">
                <span class="text-xs font-medium text-stone-500">Description</span>
                <input
                    v-model="draft.description"
                    type="text"
                    placeholder="Nonna Rosa — dinner"
                    class="mt-1 w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-base outline-none focus:border-stone-400"
                />
            </label>

            <fieldset>
                <legend class="text-xs font-medium text-stone-500">Who paid</legend>
                <div class="mt-1.5 flex flex-wrap gap-1.5">
                    <button
                        v-for="p in participants"
                        :key="p.id"
                        type="button"
                        class="rounded-full px-3 py-1.5 text-sm font-medium transition"
                        :class="
                            draft.payerId === p.id
                                ? 'bg-stone-900 text-white'
                                : 'bg-white text-stone-600 ring-1 ring-stone-200'
                        "
                        @click="draft.payerId = p.id"
                    >
                        {{ p.name }}
                    </button>
                </div>
            </fieldset>
        </section>

        <section class="mt-5 px-4">
            <div class="mb-2 flex items-end justify-between">
                <h2 class="text-sm font-semibold text-stone-800">Line Items</h2>
                <span class="text-xs tabular-nums text-stone-400">
                    {{ formatMoney(linesSubtotal) }}
                </span>
            </div>

            <ul class="space-y-2">
                <li
                    v-for="item in draft.lineItems"
                    :key="item.id"
                    class="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200/80"
                    :class="isOverClaimed(item) ? 'ring-amber-400' : ''"
                >
                    <input
                        v-model="item.description"
                        type="text"
                        placeholder="Item"
                        class="w-full border-0 bg-transparent text-sm font-medium outline-none placeholder:text-stone-300"
                    />
                    <div class="mt-2 flex items-center gap-2">
                        <div class="flex items-center rounded-lg bg-stone-100">
                            <button
                                type="button"
                                class="grid size-8 place-items-center text-stone-600"
                                aria-label="Decrease quantity"
                                @click="item.quantity = Math.max(1, item.quantity - 1)"
                            >
                                <Minus class="size-3.5" />
                            </button>
                            <span class="w-7 text-center text-sm tabular-nums">{{
                                item.quantity
                            }}</span>
                            <button
                                type="button"
                                class="grid size-8 place-items-center text-stone-600"
                                aria-label="Increase quantity"
                                @click="item.quantity += 1"
                            >
                                <Plus class="size-3.5" />
                            </button>
                        </div>
                        <span class="text-xs text-stone-400">×</span>
                        <input
                            :value="majorInputValue(item.unitPriceMinor)"
                            type="text"
                            inputmode="decimal"
                            placeholder="0.00"
                            class="min-w-0 flex-1 rounded-lg bg-stone-100 px-2.5 py-1.5 text-right text-sm tabular-nums outline-none"
                            @change="
                                item.unitPriceMinor = parseMajorToMinor(
                                    ($event.target as HTMLInputElement).value,
                                )
                            "
                        />
                        <span class="w-16 text-right text-sm font-medium tabular-nums">
                            {{ formatMoney(item.quantity * item.unitPriceMinor) }}
                        </span>
                        <button
                            type="button"
                            class="grid size-8 place-items-center text-stone-400 hover:text-rose-600"
                            aria-label="Remove line"
                            @click="removeLineItem(item.id)"
                        >
                            <Trash2 class="size-3.5" />
                        </button>
                    </div>
                    <p
                        v-if="mode === 'edit' && claimerCount(item.id) > 0"
                        class="mt-2 text-[11px] text-stone-500"
                    >
                        {{ claimerCount(item.id) }} claimer{{
                            claimerCount(item.id) === 1 ? '' : 's'
                        }}
                        · {{ claimerNames(item.id) }}
                        · {{ sharesOn(item.id) }}/{{ item.quantity }} shares
                        <span v-if="isOverClaimed(item)" class="font-medium text-amber-700">
                            · over-claimed
                        </span>
                    </p>
                </li>
            </ul>

            <button
                type="button"
                class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 py-2.5 text-sm font-medium text-stone-600"
                @click="addLineItem()"
            >
                <Plus class="size-4" />
                Add line
            </button>
        </section>

        <section class="mt-5 px-4">
            <div class="mb-2 flex items-end justify-between">
                <h2 class="text-sm font-semibold text-stone-800">Adjustments</h2>
                <span class="text-xs tabular-nums text-stone-400">
                    {{ formatMoney(adjustmentsTotal) }}
                </span>
            </div>

            <ul class="space-y-2">
                <li
                    v-for="adj in draft.adjustments"
                    :key="adj.id"
                    class="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200/80"
                >
                    <div class="flex gap-2">
                        <input
                            v-model="adj.label"
                            type="text"
                            placeholder="Tax, tip…"
                            class="min-w-0 flex-1 border-0 bg-transparent text-sm font-medium outline-none placeholder:text-stone-300"
                        />
                        <input
                            :value="majorInputValue(adj.amountMinor)"
                            type="text"
                            inputmode="decimal"
                            placeholder="0.00"
                            class="w-20 rounded-lg bg-stone-100 px-2 py-1 text-right text-sm tabular-nums outline-none"
                            @change="
                                adj.amountMinor = parseMajorToMinor(
                                    ($event.target as HTMLInputElement).value,
                                )
                            "
                        />
                        <button
                            type="button"
                            class="grid size-8 place-items-center text-stone-400 hover:text-rose-600"
                            aria-label="Remove adjustment"
                            @click="removeAdjustment(adj.id)"
                        >
                            <Trash2 class="size-3.5" />
                        </button>
                    </div>
                    <div class="mt-2 flex rounded-lg bg-stone-100 p-0.5">
                        <button
                            type="button"
                            class="flex-1 rounded-md py-1 text-xs font-medium"
                            :class="
                                adj.allocation === 'pro-rata'
                                    ? 'bg-white shadow-sm'
                                    : 'text-stone-500'
                            "
                            @click="adj.allocation = 'pro-rata'"
                        >
                            Pro-rata
                        </button>
                        <button
                            type="button"
                            class="flex-1 rounded-md py-1 text-xs font-medium"
                            :class="
                                adj.allocation === 'even'
                                    ? 'bg-white shadow-sm'
                                    : 'text-stone-500'
                            "
                            @click="adj.allocation = 'even'"
                        >
                            Even
                        </button>
                    </div>
                    <p class="mt-1.5 text-[11px] text-stone-400">
                        {{
                            adj.allocation === 'pro-rata'
                                ? 'Splits with each claimer’s subtotal on this Expense'
                                : 'Splits evenly among anyone who claimed anything in the Group'
                        }}
                    </p>
                </li>
            </ul>

            <button
                type="button"
                class="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 py-2.5 text-sm font-medium text-stone-600"
                @click="addAdjustment({ label: 'Tip', allocation: 'pro-rata' })"
            >
                <Plus class="size-4" />
                Add tax / tip
            </button>
        </section>

        <footer
            class="fixed inset-x-0 bottom-14 z-30 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur"
        >
            <div class="mx-auto flex max-w-md items-center gap-3">
                <div class="min-w-0 flex-1">
                    <p class="text-[10px] tracking-wide text-stone-400 uppercase">Total</p>
                    <p class="text-lg font-semibold tabular-nums">
                        {{ formatMoney(expenseTotal) }}
                    </p>
                </div>
                <button
                    v-if="mode === 'edit'"
                    type="button"
                    class="rounded-xl px-3 py-2.5 text-sm font-medium text-rose-700 ring-1 ring-rose-200"
                    @click="deleteExpense()"
                >
                    Delete
                </button>
                <button
                    type="button"
                    class="rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-medium text-white"
                    @click="saveDraft()"
                >
                    {{ mode === 'create' ? 'Save receipt' : 'Save correction' }}
                </button>
            </div>
        </footer>
    </div>
</template>
