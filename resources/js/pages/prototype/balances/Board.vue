<script setup lang="ts">
/**
 * PROTOTYPE variant B — "The board".
 *
 * Bet: the reason a minimised set feels arbitrary is that it is presented
 * without its workings. So show the workings permanently: claimed, fronted,
 * paid, net — for everybody, on one dense table — and hang the transfers off
 * the bottom as a derived consequence rather than the headline. The Organizer's
 * view; a Participant reads their own highlighted row.
 */
import { ArrowRight, TriangleAlert } from '@lucide/vue';
import { computed, ref } from 'vue';
import {
    balances,
    formatMoney,
    groupName,
    imbalanceMinor,
    lastChange,
    nameOf,
    pairDebts,
    participantOf,
    payments,
    recordPayment,
    suggestedTransfers,
    unclaimedTotal,
    viewer
    
} from './state';
import type {SuggestedTransfer} from './state';

const mode = ref<'suggested' | 'raw'>('suggested');
const paying = ref<string | null>(null);
const payAmount = ref('');

const sorted = computed(() =>
    [...balances.value].sort((a, b) => b.netMinor - a.netMinor),
);

const totalMoved = computed(() =>
    suggestedTransfers.value.reduce((sum, t) => sum + t.amountMinor, 0),
);

function startPaying(transfer: SuggestedTransfer): void {
    paying.value = transfer.id;
    payAmount.value = (transfer.amountMinor / 100).toFixed(2);
}

function confirmPayment(transfer: SuggestedTransfer): void {
    const minor = Math.round(Number(payAmount.value) * 100);

    if (Number.isFinite(minor)) {
        recordPayment(transfer.fromId, transfer.toId, minor);
    }

    paying.value = null;
}
</script>

<template>
    <div class="mx-auto min-h-screen max-w-3xl bg-white pb-64 text-neutral-900">
        <header
            class="flex items-baseline justify-between border-b border-neutral-200 px-5 py-4"
        >
            <div>
                <h1 class="text-lg font-semibold">{{ groupName }}</h1>
                <p class="text-xs text-neutral-500">
                    Balances update whenever anyone claims. Nothing is frozen.
                </p>
            </div>
            <p class="text-xs text-neutral-500">as {{ viewer.name }}</p>
        </header>

        <p
            v-if="lastChange"
            class="border-b border-amber-200 bg-amber-50 px-5 py-2 text-xs text-amber-900"
        >
            {{ lastChange.note }} — every figure below was recalculated.
        </p>

        <section class="px-5 py-5">
            <h2
                class="mb-2 text-xs font-medium tracking-wide text-neutral-500 uppercase"
            >
                The ledger
            </h2>
            <div class="overflow-x-auto">
                <table class="w-full min-w-[34rem] text-sm tabular-nums">
                    <thead
                        class="border-b border-neutral-200 text-left text-xs text-neutral-500"
                    >
                        <tr>
                            <th class="py-2 pr-3 font-medium">Participant</th>
                            <th class="py-2 pr-3 text-right font-medium">
                                Claimed
                            </th>
                            <th class="py-2 pr-3 text-right font-medium">
                                Fronted
                            </th>
                            <th class="py-2 pr-3 text-right font-medium">
                                Paid
                            </th>
                            <th class="py-2 text-right font-medium">Net</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-neutral-100">
                        <tr
                            v-for="balance in sorted"
                            :key="balance.participant.id"
                            :class="
                                balance.participant.id === viewer.id
                                    ? 'bg-neutral-50 font-medium'
                                    : ''
                            "
                        >
                            <td class="py-2.5 pr-3">
                                <span class="flex items-center gap-2">
                                    <span
                                        class="grid size-6 place-items-center rounded-full text-[10px] font-semibold text-white"
                                        :class="balance.participant.color"
                                    >
                                        {{ balance.participant.name.charAt(0) }}
                                    </span>
                                    {{ balance.participant.name }}
                                    <span
                                        v-if="balance.participant.isOrganizer"
                                        class="rounded bg-neutral-200 px-1.5 text-[10px] font-normal text-neutral-600"
                                    >
                                        organizer
                                    </span>
                                </span>
                            </td>
                            <td class="py-2.5 pr-3 text-right text-neutral-600">
                                {{ formatMoney(balance.owedMinor) }}
                            </td>
                            <td class="py-2.5 pr-3 text-right text-neutral-600">
                                {{ formatMoney(balance.paidMinor) }}
                            </td>
                            <td class="py-2.5 pr-3 text-right text-neutral-600">
                                {{
                                    formatMoney(
                                        balance.paymentsSentMinor -
                                            balance.paymentsReceivedMinor,
                                    )
                                }}
                            </td>
                            <td
                                class="py-2.5 text-right"
                                :class="
                                    balance.netMinor > 0
                                        ? 'text-emerald-700'
                                        : balance.netMinor < 0
                                          ? 'text-rose-700'
                                          : 'text-neutral-400'
                                "
                            >
                                {{ formatMoney(balance.netMinor) }}
                            </td>
                        </tr>
                        <tr class="text-neutral-500 italic">
                            <td class="py-2.5 pr-3">Unclaimed</td>
                            <td class="py-2.5 pr-3 text-right">
                                {{ formatMoney(unclaimedTotal) }}
                            </td>
                            <td colspan="3" class="py-2.5 text-right text-xs">
                                nobody has claimed the Cacio e pepe or the
                                Tiramisu
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <p
                v-if="imbalanceMinor !== 0"
                class="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800"
            >
                <TriangleAlert class="mt-0.5 size-4 shrink-0" />
                <span>
                    The nets are {{ formatMoney(imbalanceMinor) }} out, because
                    that much of the bill has no claimer. Until somebody absorbs
                    it, no set of transfers can clear this Group.
                </span>
            </p>
        </section>

        <section class="border-t border-neutral-200 px-5 py-5">
            <div class="mb-3 flex items-center justify-between">
                <h2
                    class="text-xs font-medium tracking-wide text-neutral-500 uppercase"
                >
                    Who pays whom
                </h2>
                <div class="flex rounded-full bg-neutral-100 p-0.5 text-xs">
                    <button
                        type="button"
                        class="rounded-full px-3 py-1"
                        :class="
                            mode === 'suggested' ? 'bg-white shadow-sm' : ''
                        "
                        @click="mode = 'suggested'"
                    >
                        {{ suggestedTransfers.length }} suggested
                    </button>
                    <button
                        type="button"
                        class="rounded-full px-3 py-1"
                        :class="mode === 'raw' ? 'bg-white shadow-sm' : ''"
                        @click="mode = 'raw'"
                    >
                        {{ pairDebts.length }} raw
                    </button>
                </div>
            </div>

            <template v-if="mode === 'suggested'">
                <p class="mb-3 text-xs text-neutral-500">
                    The smallest set of payments that clears every net above —
                    {{ formatMoney(totalMoved) }} across
                    {{ suggestedTransfers.length }} payments instead of
                    {{
                        formatMoney(
                            pairDebts.reduce((s, p) => s + p.amountMinor, 0),
                        )
                    }}
                    across {{ pairDebts.length }}. Pairs who never shared an
                    Expense can appear here.
                </p>
                <ul class="divide-y divide-neutral-100 text-sm">
                    <li
                        v-for="transfer in suggestedTransfers"
                        :key="transfer.id"
                        class="py-3"
                    >
                        <div class="flex items-center justify-between gap-3">
                            <span class="flex items-center gap-2">
                                <span
                                    class="grid size-6 place-items-center rounded-full text-[10px] font-semibold text-white"
                                    :class="
                                        participantOf(transfer.fromId).color
                                    "
                                >
                                    {{ nameOf(transfer.fromId).charAt(0) }}
                                </span>
                                <ArrowRight class="size-3.5 text-neutral-400" />
                                <span
                                    class="grid size-6 place-items-center rounded-full text-[10px] font-semibold text-white"
                                    :class="participantOf(transfer.toId).color"
                                >
                                    {{ nameOf(transfer.toId).charAt(0) }}
                                </span>
                                <span>
                                    {{ nameOf(transfer.fromId) }} pays
                                    {{ nameOf(transfer.toId) }}
                                </span>
                            </span>
                            <span class="flex items-center gap-3">
                                <span class="tabular-nums">
                                    {{ formatMoney(transfer.amountMinor) }}
                                </span>
                                <button
                                    type="button"
                                    class="rounded-full border border-neutral-300 px-3 py-1 text-xs"
                                    @click="startPaying(transfer)"
                                >
                                    Record
                                </button>
                            </span>
                        </div>

                        <p class="mt-1.5 text-xs text-neutral-500">
                            stands in for
                            <span
                                v-for="(source, index) in transfer.sources"
                                :key="source.creditorId"
                            >
                                <span v-if="index > 0">, </span>
                                {{ formatMoney(source.amountMinor) }} owed to
                                {{ nameOf(source.creditorId) }}
                            </span>
                        </p>

                        <div
                            v-if="paying === transfer.id"
                            class="mt-2 flex gap-2"
                        >
                            <input
                                v-model="payAmount"
                                type="text"
                                inputmode="decimal"
                                class="w-28 rounded-lg border border-neutral-300 px-2 py-1 text-sm tabular-nums"
                            />
                            <button
                                type="button"
                                class="rounded-lg bg-neutral-900 px-3 py-1 text-xs text-white"
                                @click="confirmPayment(transfer)"
                            >
                                Save
                            </button>
                            <button
                                type="button"
                                class="px-2 text-xs text-neutral-500"
                                @click="paying = null"
                            >
                                Cancel
                            </button>
                        </div>
                    </li>
                </ul>
            </template>

            <template v-else>
                <p class="mb-3 text-xs text-neutral-500">
                    Every debt exactly as it arose: what each person owes
                    whoever fronted it, netted per pair. Nobody appears here who
                    didn't share something.
                </p>
                <ul class="divide-y divide-neutral-100 text-sm">
                    <li
                        v-for="pair in pairDebts"
                        :key="pair.fromId + pair.toId"
                        class="flex items-center justify-between py-2.5"
                    >
                        <span>
                            {{ nameOf(pair.fromId) }} owes
                            {{ nameOf(pair.toId) }}
                        </span>
                        <span class="tabular-nums">
                            {{ formatMoney(pair.amountMinor) }}
                        </span>
                    </li>
                </ul>
            </template>
        </section>

        <section
            v-if="payments.length"
            class="border-t border-neutral-200 px-5 py-5"
        >
            <h2
                class="mb-2 text-xs font-medium tracking-wide text-neutral-500 uppercase"
            >
                Payments recorded
            </h2>
            <ul class="divide-y divide-neutral-100 text-sm">
                <li
                    v-for="payment in payments"
                    :key="payment.id"
                    class="flex items-center justify-between py-2"
                >
                    <span class="text-neutral-600">
                        {{ nameOf(payment.fromId) }} →
                        {{ nameOf(payment.toId) }}
                    </span>
                    <span class="tabular-nums">
                        {{ formatMoney(payment.amountMinor) }}
                    </span>
                </li>
            </ul>
            <p class="mt-2 text-xs text-neutral-500">
                Unverified, entered by hand. A Payment reduces a Balance; it
                never closes one.
            </p>
        </section>
    </div>
</template>
