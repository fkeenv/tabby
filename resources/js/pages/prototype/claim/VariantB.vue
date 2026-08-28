<script setup lang="ts">
/**
 * PROTOTYPE Variant B — "One at a time".
 * A deck: one Line Item fills the screen, three big verbs, a review at the end.
 * First contact: the name question is card zero, inside the same flow.
 * Completeness warning: on the card, as who-else-had-this.
 */
import { ArrowLeft, Check, Minus, Plus, Users, X } from '@lucide/vue';
import { computed, ref } from 'vue';
import {
    actingAs,
    addParticipant,
    adjustmentCentsFor,
    claimersOf,
    formatMoney,
    groupName,
    joinAs,
    lineItems,
    payerName,
    resetSession,
    setShares,
    sharesFor,
    similarNames,
    subtotalCentsFor,
    totalCentsFor,
    totalShares,
} from './state';

const typedName = ref('');
const suggestions = computed(() => similarNames(typedName.value));
const index = ref(0);
const reviewing = ref(false);

const item = computed(() => lineItems[index.value]);
const myShares = computed(() =>
    actingAs.value ? sharesFor(item.value.id, actingAs.value.id) : 0,
);
const others = computed(() =>
    claimersOf(item.value.id).filter((p) => p.id !== actingAs.value?.id),
);

function join(): void {
    if (typedName.value.trim()) {
        joinAs(addParticipant(typedName.value));
    }
}

function claim(shares: number): void {
    if (!actingAs.value) {
        return;
    }

    setShares(item.value.id, actingAs.value.id, shares);
    next();
}

function next(): void {
    if (index.value >= lineItems.length - 1) {
        reviewing.value = true;

        return;
    }

    index.value += 1;
}

function back(): void {
    if (reviewing.value) {
        reviewing.value = false;

        return;
    }

    index.value = Math.max(0, index.value - 1);
}

const myClaimedItems = computed(() =>
    lineItems.filter((i) =>
        actingAs.value ? sharesFor(i.id, actingAs.value.id) > 0 : false,
    ),
);
</script>

<template>
    <!-- Card zero: the name -->
    <div
        v-if="!actingAs"
        class="flex min-h-screen flex-col justify-between bg-neutral-900 px-6 pt-16 pb-28 text-white"
    >
        <div>
            <p class="text-sm text-neutral-400">{{ groupName }}</p>
            <h1 class="mt-6 text-4xl leading-tight font-semibold">
                First, your name.
            </h1>
            <p class="mt-3 text-neutral-400">
                We'll show you the bill one thing at a time. Tap what you had.
            </p>
            <input
                v-model="typedName"
                type="text"
                placeholder="Type your name"
                class="mt-8 w-full border-b-2 border-neutral-700 bg-transparent pb-3 text-3xl outline-none placeholder:text-neutral-700 focus:border-white"
                @keyup.enter="join"
            />
            <div v-if="suggestions.length" class="mt-4 flex flex-wrap gap-2">
                <button
                    v-for="p in suggestions"
                    :key="p.id"
                    type="button"
                    class="rounded-full border border-neutral-700 px-4 py-2 text-sm"
                    @click="joinAs(p)"
                >
                    Already here as {{ p.name }}?
                </button>
            </div>
        </div>
        <button
            type="button"
            class="rounded-full bg-white py-5 text-lg font-semibold text-neutral-900 disabled:opacity-20"
            :disabled="!typedName.trim()"
            @click="join"
        >
            Start
        </button>
    </div>

    <!-- Review -->
    <div
        v-else-if="reviewing"
        class="min-h-screen bg-neutral-900 px-6 pt-12 pb-32 text-white"
    >
        <button
            type="button"
            class="mb-6 flex items-center gap-1 text-sm text-neutral-400"
            @click="back"
        >
            <ArrowLeft class="size-4" /> Back to the bill
        </button>
        <p class="text-sm text-neutral-400">
            {{ actingAs.name }}, here's your share
        </p>
        <p class="mt-1 text-6xl font-semibold tabular-nums">
            {{ formatMoney(totalCentsFor(actingAs.id)) }}
        </p>
        <p class="mt-2 text-sm text-neutral-400">
            {{ formatMoney(subtotalCentsFor(actingAs.id)) }} of food and drink,
            plus {{ formatMoney(adjustmentCentsFor(actingAs.id)) }} tax, tip and
            service. You owe {{ payerName }}.
        </p>

        <ul class="mt-8 divide-y divide-neutral-800">
            <li
                v-for="claimed in myClaimedItems"
                :key="claimed.id"
                class="flex items-center justify-between gap-3 py-3"
            >
                <span class="text-sm">
                    {{ claimed.description }}
                    <span class="text-neutral-500">
                        · {{ sharesFor(claimed.id, actingAs.id) }} of
                        {{ totalShares(claimed.id) }} shares
                    </span>
                </span>
                <span class="flex shrink-0 items-center gap-1">
                    <button
                        type="button"
                        class="grid size-9 place-items-center rounded-full border border-neutral-700"
                        @click="
                            setShares(
                                claimed.id,
                                actingAs.id,
                                sharesFor(claimed.id, actingAs.id) - 1,
                            )
                        "
                    >
                        <Minus class="size-4" />
                    </button>
                    <button
                        type="button"
                        class="grid size-9 place-items-center rounded-full border border-neutral-700"
                        @click="
                            setShares(
                                claimed.id,
                                actingAs.id,
                                sharesFor(claimed.id, actingAs.id) + 1,
                            )
                        "
                    >
                        <Plus class="size-4" />
                    </button>
                </span>
            </li>
            <li
                v-if="!myClaimedItems.length"
                class="py-6 text-sm text-neutral-500"
            >
                You didn't claim anything.
            </li>
        </ul>

        <button
            type="button"
            class="mt-8 text-sm text-neutral-500 underline decoration-dotted"
            @click="resetSession()"
        >
            Not {{ actingAs.name }}? Hand the phone on.
        </button>
    </div>

    <!-- The deck -->
    <div
        v-else
        class="flex min-h-screen flex-col bg-neutral-900 px-6 pt-10 pb-28 text-white"
    >
        <div class="flex items-center gap-3">
            <button
                type="button"
                class="grid size-8 place-items-center rounded-full border border-neutral-700 disabled:opacity-20"
                :disabled="index === 0"
                @click="back"
            >
                <ArrowLeft class="size-4" />
            </button>
            <div class="h-1 flex-1 overflow-hidden rounded-full bg-neutral-800">
                <div
                    class="h-full rounded-full bg-white transition-all"
                    :style="{
                        width: ((index + 1) / lineItems.length) * 100 + '%',
                    }"
                />
            </div>
            <span class="font-mono text-xs text-neutral-500 tabular-nums">
                {{ index + 1 }}/{{ lineItems.length }}
            </span>
        </div>

        <div class="flex flex-1 flex-col justify-center py-10">
            <p class="text-sm text-neutral-500 tabular-nums">
                <template v-if="item.quantity > 1"
                    >{{ item.quantity }} ×
                </template>
                {{ formatMoney(item.unitPriceCents) }}
            </p>
            <h2 class="mt-2 text-4xl leading-tight font-semibold">
                {{ item.description }}
            </h2>

            <p
                v-if="others.length"
                class="mt-5 flex items-center gap-2 text-sm text-neutral-400"
            >
                <Users class="size-4" />
                {{ others.map((p) => p.name).join(', ') }}
                {{ others.length === 1 ? 'has' : 'have' }} claimed
                {{ totalShares(item.id) }} of {{ item.quantity }}
            </p>
            <p v-else class="mt-5 text-sm text-neutral-500">
                Nobody has claimed this yet.
            </p>

            <p
                v-if="myShares"
                class="mt-4 inline-flex items-center gap-2 text-sm text-emerald-400"
            >
                <Check class="size-4" /> You have {{ myShares }}
                {{ myShares === 1 ? 'share' : 'shares' }} of this
            </p>
        </div>

        <div class="space-y-3">
            <button
                type="button"
                class="w-full rounded-2xl bg-white py-5 text-lg font-semibold text-neutral-900"
                @click="claim(item.quantity)"
            >
                All mine
            </button>
            <button
                type="button"
                class="w-full rounded-2xl border border-neutral-700 py-5 text-lg font-semibold"
                @click="claim(myShares + 1)"
            >
                I shared it
                <span class="text-neutral-500">· +1 share</span>
            </button>
            <button
                type="button"
                class="flex w-full items-center justify-center gap-2 py-3 text-neutral-500"
                @click="claim(0)"
            >
                <X class="size-4" /> Didn't have it
            </button>
        </div>
    </div>
</template>
