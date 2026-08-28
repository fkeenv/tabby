<script setup lang="ts">
/**
 * PROTOTYPE variant D — "Honest first".
 *
 * Bet: minimisation is the thing people distrust, so don't make it the default.
 * Open on the debts exactly as they arose — every one of which is defensible to
 * the person you owe — and offer simplification as an explicit trade the user
 * opts into, showing what each shortcut replaced. If this wins, the minimal set
 * is a feature, not the model.
 */
import { ArrowRight, ChevronDown, ChevronUp, CircleCheck } from '@lucide/vue';
import { computed, ref } from 'vue';
import {
    formatMoney,
    groupName,
    isSettled,
    lastChange,
    nameOf,
    pairDebts,
    paidBetween,
    participantOf,
    rawObligations,
    recordPayment,
    suggestedTransfers,
    unclaimedTotal,
    viewer
    
} from './state';
import type {PairDebt} from './state';

const simplified = ref(false);
const openPair = ref<string | null>(null);

const rawTotal = computed(() =>
    pairDebts.value.reduce((sum, p) => sum + p.amountMinor, 0),
);
const simpleTotal = computed(() =>
    suggestedTransfers.value.reduce((sum, t) => sum + t.amountMinor, 0),
);

const myDebts = computed(() =>
    pairDebts.value.filter((p) => p.fromId === viewer.value.id),
);
const myCredits = computed(() =>
    pairDebts.value.filter((p) => p.toId === viewer.value.id),
);
const otherDebts = computed(() =>
    pairDebts.value.filter(
        (p) => p.fromId !== viewer.value.id && p.toId !== viewer.value.id,
    ),
);

function key(pair: PairDebt): string {
    return pair.fromId + '>' + pair.toId;
}

function behind(pair: PairDebt) {
    return rawObligations.value.filter(
        (row) => row.fromId === pair.fromId && row.toId === pair.toId,
    );
}
</script>

<template>
    <div class="mx-auto min-h-screen max-w-md bg-white pb-64 text-neutral-900">
        <header class="px-5 pt-6 pb-4">
            <h1 class="text-lg font-semibold">{{ groupName }}</h1>
            <p class="mt-0.5 text-xs text-neutral-500">
                Viewing as {{ viewer.name }}. Balances move whenever anyone
                claims.
            </p>
        </header>

        <p
            v-if="lastChange"
            class="mx-5 mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900"
        >
            {{ lastChange.note }} — the amounts below changed.
        </p>

        <section v-if="isSettled" class="px-5 py-16 text-center">
            <CircleCheck class="mx-auto size-12 text-emerald-500" />
            <p class="mt-4 text-2xl font-semibold">Everyone's square</p>
            <p class="mx-auto mt-2 max-w-xs text-sm text-neutral-500">
                No debts left. This Group isn't closed — it can't be. If someone
                claims a Line Item next week, debts reappear here.
            </p>
        </section>

        <template v-else>
            <div class="px-5">
                <div
                    class="flex items-center justify-between rounded-2xl border border-neutral-200 p-3"
                >
                    <div>
                        <p class="text-sm font-medium">
                            {{ simplified ? 'Simplified' : 'As it happened' }}
                        </p>
                        <p class="mt-0.5 text-xs text-neutral-500">
                            <template v-if="simplified">
                                {{ suggestedTransfers.length }} payments,
                                {{ formatMoney(simpleTotal) }} moved
                            </template>
                            <template v-else>
                                {{ pairDebts.length }} payments,
                                {{ formatMoney(rawTotal) }} moved
                            </template>
                        </p>
                    </div>
                    <button
                        type="button"
                        class="rounded-full px-4 py-2 text-sm font-medium"
                        :class="
                            simplified
                                ? 'bg-neutral-100 text-neutral-700'
                                : 'bg-neutral-900 text-white'
                        "
                        @click="simplified = !simplified"
                    >
                        {{ simplified ? 'Show it as it happened' : 'Simplify' }}
                    </button>
                </div>
                <p class="mt-2 px-1 text-xs text-neutral-500">
                    <template v-if="simplified">
                        Fewer payments, but some of them go to people you never
                        shared anything with. Each one shows what it replaced.
                    </template>
                    <template v-else>
                        Every debt below is between two people who actually
                        shared an Expense. It's more payments than necessary.
                    </template>
                </p>
            </div>

            <!-- Raw, honest view -->
            <template v-if="!simplified">
                <section v-if="myDebts.length" class="px-5 pt-6">
                    <h2
                        class="mb-2 text-xs font-medium tracking-wide text-neutral-500 uppercase"
                    >
                        You owe
                    </h2>
                    <ul
                        class="divide-y divide-neutral-100 rounded-2xl border border-neutral-200"
                    >
                        <li
                            v-for="pair in myDebts"
                            :key="key(pair)"
                            class="px-4"
                        >
                            <div class="flex items-center justify-between py-3">
                                <span class="flex items-center gap-2 text-sm">
                                    <span
                                        class="grid size-7 place-items-center rounded-full text-[11px] font-semibold text-white"
                                        :class="participantOf(pair.toId).color"
                                    >
                                        {{ nameOf(pair.toId).charAt(0) }}
                                    </span>
                                    {{ nameOf(pair.toId) }}
                                </span>
                                <span class="flex items-center gap-3">
                                    <span
                                        class="text-sm font-medium tabular-nums"
                                    >
                                        {{ formatMoney(pair.amountMinor) }}
                                    </span>
                                    <button
                                        type="button"
                                        class="rounded-full bg-neutral-900 px-3 py-1.5 text-xs text-white"
                                        @click="
                                            recordPayment(
                                                pair.fromId,
                                                pair.toId,
                                                pair.amountMinor,
                                            )
                                        "
                                    >
                                        Paid
                                    </button>
                                </span>
                            </div>
                            <button
                                type="button"
                                class="flex w-full items-center justify-between pb-3 text-xs text-neutral-500"
                                @click="
                                    openPair =
                                        openPair === key(pair)
                                            ? null
                                            : key(pair)
                                "
                            >
                                <span>
                                    {{ behind(pair).length }} thing{{
                                        behind(pair).length === 1 ? '' : 's'
                                    }}
                                    {{ nameOf(pair.toId) }} paid for
                                </span>
                                <ChevronUp
                                    v-if="openPair === key(pair)"
                                    class="size-3.5"
                                />
                                <ChevronDown v-else class="size-3.5" />
                            </button>
                            <ul
                                v-if="openPair === key(pair)"
                                class="space-y-1 pb-3 text-xs text-neutral-600"
                            >
                                <li
                                    v-for="row in behind(pair)"
                                    :key="row.expense.id"
                                    class="flex justify-between"
                                >
                                    <span>{{ row.expense.description }}</span>
                                    <span class="tabular-nums">
                                        {{ formatMoney(row.amountMinor) }}
                                    </span>
                                </li>
                                <li
                                    v-if="
                                        paidBetween(pair.fromId, pair.toId) > 0
                                    "
                                    class="flex justify-between text-emerald-700"
                                >
                                    <span>already paid</span>
                                    <span class="tabular-nums">
                                        −{{
                                            formatMoney(
                                                paidBetween(
                                                    pair.fromId,
                                                    pair.toId,
                                                ),
                                            )
                                        }}
                                    </span>
                                </li>
                            </ul>
                        </li>
                    </ul>
                </section>

                <section v-if="myCredits.length" class="px-5 pt-6">
                    <h2
                        class="mb-2 text-xs font-medium tracking-wide text-neutral-500 uppercase"
                    >
                        Owed to you
                    </h2>
                    <ul
                        class="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 px-4"
                    >
                        <li
                            v-for="pair in myCredits"
                            :key="key(pair)"
                            class="flex items-center justify-between py-3 text-sm"
                        >
                            <span>{{ nameOf(pair.fromId) }}</span>
                            <span class="tabular-nums">
                                {{ formatMoney(pair.amountMinor) }}
                            </span>
                        </li>
                    </ul>
                </section>

                <section v-if="otherDebts.length" class="px-5 pt-6">
                    <h2
                        class="mb-2 text-xs font-medium tracking-wide text-neutral-500 uppercase"
                    >
                        Between other people
                    </h2>
                    <ul
                        class="divide-y divide-neutral-100 rounded-2xl border border-neutral-200 px-4"
                    >
                        <li
                            v-for="pair in otherDebts"
                            :key="key(pair)"
                            class="flex items-center justify-between py-2.5 text-sm text-neutral-600"
                        >
                            <span class="flex items-center gap-1.5">
                                {{ nameOf(pair.fromId) }}
                                <ArrowRight class="size-3 text-neutral-400" />
                                {{ nameOf(pair.toId) }}
                            </span>
                            <span class="tabular-nums">
                                {{ formatMoney(pair.amountMinor) }}
                            </span>
                        </li>
                    </ul>
                </section>
            </template>

            <!-- Simplified, with the receipts for the shortcut -->
            <section v-else class="space-y-3 px-5 pt-6">
                <div
                    v-for="transfer in suggestedTransfers"
                    :key="transfer.id"
                    class="rounded-2xl border p-4"
                    :class="
                        transfer.fromId === viewer.id
                            ? 'border-neutral-900'
                            : 'border-neutral-200'
                    "
                >
                    <div class="flex items-center justify-between">
                        <span
                            class="flex items-center gap-2 text-sm font-medium"
                        >
                            {{ nameOf(transfer.fromId) }}
                            <ArrowRight class="size-3.5 text-neutral-400" />
                            {{ nameOf(transfer.toId) }}
                        </span>
                        <span class="text-sm font-semibold tabular-nums">
                            {{ formatMoney(transfer.amountMinor) }}
                        </span>
                    </div>

                    <p
                        class="mt-3 text-xs tracking-wide text-neutral-500 uppercase"
                    >
                        Instead of
                    </p>
                    <ul class="mt-1 space-y-1 text-xs">
                        <li
                            v-for="source in transfer.sources"
                            :key="source.creditorId"
                            class="flex justify-between"
                            :class="
                                source.direct
                                    ? 'text-neutral-700'
                                    : 'text-neutral-400 line-through'
                            "
                        >
                            <span>
                                {{ nameOf(transfer.fromId) }} →
                                {{ nameOf(source.creditorId) }}
                            </span>
                            <span class="tabular-nums">
                                {{ formatMoney(source.amountMinor) }}
                            </span>
                        </li>
                    </ul>
                    <p
                        v-if="transfer.sources.some((s) => !s.direct)"
                        class="mt-2 text-xs text-neutral-500"
                    >
                        The struck-through debts are real. They get settled by
                        the other payments on this screen, which is the only
                        reason this shortcut works.
                    </p>

                    <button
                        v-if="transfer.fromId === viewer.id"
                        type="button"
                        class="mt-3 w-full rounded-full bg-neutral-900 py-2.5 text-sm text-white"
                        @click="
                            recordPayment(
                                transfer.fromId,
                                transfer.toId,
                                transfer.amountMinor,
                            )
                        "
                    >
                        I've paid {{ nameOf(transfer.toId) }}
                    </button>
                </div>
            </section>

            <p
                v-if="unclaimedTotal > 0"
                class="px-5 pt-6 text-xs text-neutral-500"
            >
                {{ formatMoney(unclaimedTotal) }} of the bill has no claimer yet
                and appears in nobody's list.
            </p>
        </template>
    </div>
</template>
