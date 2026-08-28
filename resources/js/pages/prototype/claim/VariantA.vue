<script setup lang="ts">
/**
 * PROTOTYPE Variant A — "The receipt".
 * The bill reproduced top to bottom, one row per Line Item, a stepper on each row.
 * First contact: full-screen name gate with near-duplicate detection.
 * Completeness warning: inline on the row.
 */
import { AlertTriangle, ChevronDown, Minus, Plus } from '@lucide/vue';
import { computed, ref } from 'vue';
import {
    actingAs,
    addParticipant,
    adjustmentCentsFor,
    bumpShares,
    claimersOf,
    formatMoney,
    groupName,
    joinAs,
    lineItems,
    payerName,
    resetSession,
    sharesFor,
    similarNames,
    subtotalCentsFor,
    totalCentsFor,
    totalShares
    
} from './state';
import type {LineItem} from './state';

const typedName = ref('');
const suggestions = computed(() => similarNames(typedName.value));
const breakdownOpen = ref(false);

function join(): void {
    if (!typedName.value.trim()) {
        return;
    }

    joinAs(addParticipant(typedName.value));
}

function lineTotal(item: LineItem): number {
    return item.quantity * item.unitPriceCents;
}

function overClaimed(item: LineItem): boolean {
    return totalShares(item.id) > item.quantity;
}

function myShares(item: LineItem): number {
    return actingAs.value ? sharesFor(item.id, actingAs.value.id) : 0;
}
</script>

<template>
    <!-- First contact: nothing but the name gate -->
    <div
        v-if="!actingAs"
        class="flex min-h-screen flex-col justify-center gap-6 bg-neutral-50 px-6 pb-24"
    >
        <div>
            <p class="text-sm text-neutral-500">{{ groupName }}</p>
            <h1 class="mt-1 text-2xl font-semibold text-neutral-900">
                Who are you?
            </h1>
            <p class="mt-2 text-sm text-neutral-500">
                {{ payerName }} paid. Tell us your name so we know whose food is
                whose.
            </p>
        </div>

        <input
            v-model="typedName"
            type="text"
            autocomplete="given-name"
            placeholder="Your name"
            class="w-full rounded-xl border border-neutral-300 bg-white px-4 py-4 text-lg outline-none focus:border-neutral-900"
            @keyup.enter="join"
        />

        <div v-if="suggestions.length" class="rounded-xl bg-amber-50 p-4">
            <p class="text-sm font-medium text-amber-900">
                Already at this table?
            </p>
            <div class="mt-2 flex flex-wrap gap-2">
                <button
                    v-for="p in suggestions"
                    :key="p.id"
                    type="button"
                    class="rounded-full bg-white px-4 py-2 text-sm font-medium shadow-sm"
                    @click="joinAs(p)"
                >
                    I'm {{ p.name }}
                </button>
            </div>
        </div>

        <button
            type="button"
            class="rounded-xl bg-neutral-900 py-4 text-base font-semibold text-white disabled:opacity-30"
            :disabled="!typedName.trim()"
            @click="join"
        >
            Start claiming
        </button>
    </div>

    <!-- The receipt -->
    <div v-else class="min-h-screen bg-neutral-50 pb-44">
        <header
            class="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur"
        >
            <div class="flex items-baseline justify-between">
                <div>
                    <p class="text-xs text-neutral-500">{{ groupName }}</p>
                    <h1 class="text-base font-semibold text-neutral-900">
                        Claim what you had
                    </h1>
                </div>
                <button
                    type="button"
                    class="text-right text-xs text-neutral-500 underline decoration-dotted"
                    @click="resetSession()"
                >
                    <span class="block font-medium text-neutral-900">{{
                        actingAs.name
                    }}</span>
                    Not you?
                </button>
            </div>
        </header>

        <ul class="divide-y divide-neutral-200 bg-white">
            <li
                v-for="item in lineItems"
                :key="item.id"
                class="px-4 py-3"
                :class="
                    overClaimed(item)
                        ? 'bg-amber-50'
                        : myShares(item) > 0
                          ? 'bg-neutral-50'
                          : ''
                "
            >
                <div class="flex items-start gap-3">
                    <div class="min-w-0 flex-1">
                        <p
                            class="text-[15px] leading-snug font-medium text-neutral-900"
                        >
                            {{ item.description }}
                        </p>
                        <p class="mt-0.5 text-xs text-neutral-500 tabular-nums">
                            <template v-if="item.quantity > 1">
                                {{ item.quantity }} ×
                                {{ formatMoney(item.unitPriceCents) }} =
                            </template>
                            {{ formatMoney(lineTotal(item)) }}
                        </p>

                        <div
                            class="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1"
                        >
                            <div
                                v-if="claimersOf(item.id).length"
                                class="flex -space-x-1.5"
                            >
                                <span
                                    v-for="p in claimersOf(item.id)"
                                    :key="p.id"
                                    class="grid size-5 place-items-center rounded-full text-[10px] font-bold text-white ring-2 ring-white"
                                    :class="p.color"
                                    :title="p.name"
                                >
                                    {{ p.name.charAt(0) }}
                                </span>
                            </div>
                            <span
                                class="text-xs tabular-nums"
                                :class="
                                    overClaimed(item)
                                        ? 'font-medium text-amber-700'
                                        : 'text-neutral-500'
                                "
                            >
                                <AlertTriangle
                                    v-if="overClaimed(item)"
                                    class="mr-0.5 inline size-3"
                                />
                                {{ totalShares(item.id) }} of
                                {{ item.quantity }} claimed
                            </span>
                        </div>
                    </div>

                    <div class="flex shrink-0 items-center gap-1">
                        <button
                            type="button"
                            class="grid size-11 place-items-center rounded-full border border-neutral-300 bg-white text-neutral-700 disabled:opacity-25"
                            :disabled="myShares(item) === 0"
                            :aria-label="
                                'Remove a share of ' + item.description
                            "
                            @click="bumpShares(item.id, actingAs.id, -1)"
                        >
                            <Minus class="size-4" />
                        </button>
                        <span
                            class="w-6 text-center text-lg font-semibold tabular-nums"
                        >
                            {{ myShares(item) || '·' }}
                        </span>
                        <button
                            type="button"
                            class="grid size-11 place-items-center rounded-full bg-neutral-900 text-white"
                            :aria-label="'Take a share of ' + item.description"
                            @click="bumpShares(item.id, actingAs.id, 1)"
                        >
                            <Plus class="size-4" />
                        </button>
                    </div>
                </div>
            </li>
        </ul>

        <!-- Running total -->
        <div
            class="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white px-4 pt-3 pb-20"
        >
            <button
                type="button"
                class="flex w-full items-center justify-between"
                @click="breakdownOpen = !breakdownOpen"
            >
                <span class="flex items-center gap-1 text-sm text-neutral-500">
                    Your total
                    <ChevronDown
                        class="size-4 transition-transform"
                        :class="breakdownOpen ? 'rotate-180' : ''"
                    />
                </span>
                <span
                    class="text-2xl font-semibold text-neutral-900 tabular-nums"
                >
                    {{ formatMoney(totalCentsFor(actingAs.id)) }}
                </span>
            </button>
            <dl
                v-if="breakdownOpen"
                class="mt-2 space-y-1 border-t border-dashed border-neutral-200 pt-2 text-sm text-neutral-600"
            >
                <div class="flex justify-between tabular-nums">
                    <dt>What you claimed</dt>
                    <dd>{{ formatMoney(subtotalCentsFor(actingAs.id)) }}</dd>
                </div>
                <div class="flex justify-between tabular-nums">
                    <dt>Your share of tax, tip &amp; service</dt>
                    <dd>{{ formatMoney(adjustmentCentsFor(actingAs.id)) }}</dd>
                </div>
                <p class="pt-1 text-xs text-neutral-500">
                    You'll owe {{ payerName }}. Nothing to confirm — the total
                    is live.
                </p>
            </dl>
        </div>
    </div>
</template>
