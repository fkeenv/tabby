<script setup lang="ts">
/**
 * PROTOTYPE variant A — "Just you".
 *
 * Bet: a Participant does not want a board, they want one sentence and one
 * button. Everything that is not "what do I owe and to whom" is collapsed.
 * The explanation is a disclosure directly under the amount, and it leads with
 * the checkable part (what you claimed) before the part people distrust (why
 * this person).
 */
import { ArrowRight, ChevronDown, ChevronUp, CircleCheck } from '@lucide/vue';
import { computed, ref } from 'vue';
import {
    balanceOf,
    formatMoney,
    groupName,
    haveSharedAnExpense,
    lastChange,
    nameOf,
    owedLinesFor,
    participantOf,
    recordPayment,
    suggestedTransfers,
    viewer
    
} from './state';
import type {SuggestedTransfer} from './state';

const expanded = ref<string | null>(null);
const paying = ref<string | null>(null);
const payAmount = ref('');

const myBalance = computed(() => balanceOf(viewer.value.id));
const iOwe = computed(() =>
    suggestedTransfers.value.filter((t) => t.fromId === viewer.value.id),
);
const owedToMe = computed(() =>
    suggestedTransfers.value.filter((t) => t.toId === viewer.value.id),
);
const myLines = computed(() => owedLinesFor(viewer.value.id));

const paidAndBackInDebt = computed(
    () => myBalance.value.paymentsSentMinor > 0 && myBalance.value.netMinor < 0,
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
    <div
        class="mx-auto min-h-screen max-w-md bg-neutral-50 pb-64 text-neutral-900"
    >
        <header class="px-5 pt-6 pb-4">
            <p class="text-xs text-neutral-500">{{ groupName }}</p>
            <p class="text-sm font-medium">Signed in as {{ viewer.name }}</p>
        </header>

        <div
            v-if="lastChange"
            class="mx-5 mb-4 rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-900"
        >
            <p class="font-medium">{{ lastChange.note }}</p>
            <p v-if="paidAndBackInDebt" class="mt-1 text-amber-800">
                You had paid up. That claim re-split the bill, so you are back
                in debt — nothing you did was wrong.
            </p>
            <p v-else class="mt-1 text-amber-800">
                Your total was recalculated.
            </p>
        </div>

        <!-- Zero state -->
        <section v-if="myBalance.netMinor === 0" class="px-5">
            <div class="rounded-3xl bg-white p-6 text-center shadow-sm">
                <CircleCheck class="mx-auto size-10 text-emerald-500" />
                <p class="mt-3 text-2xl font-semibold">You're square</p>
                <p class="mt-2 text-sm text-neutral-500">
                    Nothing to pay, nothing to collect. Claiming never closes,
                    so if someone claims something later this can move again.
                </p>
            </div>
        </section>

        <!-- What you owe -->
        <section
            v-for="(transfer, index) in iOwe"
            :key="transfer.id"
            class="px-5 pb-4"
        >
            <div
                class="rounded-3xl bg-white shadow-sm"
                :class="index === 0 ? 'p-6' : 'p-5'"
            >
                <p class="text-sm text-neutral-500">You owe</p>
                <p
                    class="mt-1 font-semibold tabular-nums"
                    :class="index === 0 ? 'text-5xl' : 'text-3xl'"
                >
                    {{ formatMoney(transfer.amountMinor) }}
                </p>
                <p class="mt-2 flex items-center gap-2 text-lg">
                    <span
                        class="grid size-7 place-items-center rounded-full text-xs font-semibold text-white"
                        :class="participantOf(transfer.toId).color"
                    >
                        {{ nameOf(transfer.toId).charAt(0) }}
                    </span>
                    to {{ nameOf(transfer.toId) }}
                </p>

                <button
                    v-if="paying !== transfer.id"
                    type="button"
                    class="mt-5 w-full rounded-full bg-neutral-900 py-3.5 text-base font-medium text-white"
                    @click="startPaying(transfer)"
                >
                    I've paid {{ nameOf(transfer.toId) }}
                </button>

                <div v-else class="mt-5 space-y-3">
                    <label class="block text-sm text-neutral-500">
                        How much did you send?
                        <div class="mt-1 flex items-center gap-2">
                            <span class="text-2xl">$</span>
                            <input
                                v-model="payAmount"
                                type="text"
                                inputmode="decimal"
                                class="w-full rounded-xl border border-neutral-300 px-3 py-2 text-2xl tabular-nums"
                            />
                        </div>
                    </label>
                    <p class="text-xs text-neutral-500">
                        Part of it is fine. Nobody checks — this is a note to
                        the group, not a receipt.
                    </p>
                    <div class="flex gap-2">
                        <button
                            type="button"
                            class="flex-1 rounded-full bg-neutral-900 py-3 text-sm font-medium text-white"
                            @click="confirmPayment(transfer)"
                        >
                            Record it
                        </button>
                        <button
                            type="button"
                            class="rounded-full px-4 py-3 text-sm text-neutral-500"
                            @click="paying = null"
                        >
                            Cancel
                        </button>
                    </div>
                </div>

                <button
                    type="button"
                    class="mt-4 flex w-full items-center justify-between text-sm font-medium text-neutral-600"
                    @click="
                        expanded = expanded === transfer.id ? null : transfer.id
                    "
                >
                    <span>Why {{ nameOf(transfer.toId) }}?</span>
                    <ChevronUp v-if="expanded === transfer.id" class="size-4" />
                    <ChevronDown v-else class="size-4" />
                </button>

                <div
                    v-if="expanded === transfer.id"
                    class="mt-4 space-y-5 border-t border-neutral-100 pt-4 text-sm"
                >
                    <div>
                        <p class="font-medium">First, what you owe the group</p>
                        <ul class="mt-2 space-y-1 text-neutral-600">
                            <li
                                v-for="line in myLines"
                                :key="line.expense.id"
                                class="flex justify-between gap-3"
                            >
                                <span>
                                    {{ line.expense.description }}
                                    <span class="text-neutral-400">
                                        · {{ nameOf(line.payerId) }} paid
                                    </span>
                                </span>
                                <span class="tabular-nums">
                                    {{ formatMoney(line.amountMinor) }}
                                </span>
                            </li>
                            <li
                                v-if="myBalance.paidMinor > 0"
                                class="flex justify-between gap-3 text-neutral-600"
                            >
                                <span>You fronted</span>
                                <span class="tabular-nums">
                                    −{{ formatMoney(myBalance.paidMinor) }}
                                </span>
                            </li>
                            <li
                                v-if="myBalance.paymentsSentMinor > 0"
                                class="flex justify-between gap-3 text-neutral-600"
                            >
                                <span>Already paid back</span>
                                <span class="tabular-nums">
                                    −{{
                                        formatMoney(myBalance.paymentsSentMinor)
                                    }}
                                </span>
                            </li>
                        </ul>
                        <p
                            class="mt-2 flex justify-between border-t border-neutral-100 pt-2 font-medium"
                        >
                            <span>You owe the group</span>
                            <span class="tabular-nums">
                                {{ formatMoney(-myBalance.netMinor) }}
                            </span>
                        </p>
                    </div>

                    <div>
                        <p class="font-medium">
                            Then, who actually fronted it for you
                        </p>
                        <ul class="mt-2 space-y-1 text-neutral-600">
                            <li
                                v-for="source in transfer.sources"
                                :key="source.creditorId"
                                class="flex justify-between gap-3"
                            >
                                <span>
                                    {{ nameOf(source.creditorId) }}
                                    <span
                                        v-if="source.direct"
                                        class="text-neutral-400"
                                    >
                                        · the person you're paying
                                    </span>
                                </span>
                                <span class="tabular-nums">
                                    {{ formatMoney(source.amountMinor) }}
                                </span>
                            </li>
                        </ul>
                        <p class="mt-3 text-neutral-600">
                            <template
                                v-if="transfer.sources.some((s) => !s.direct)"
                            >
                                Rather than send
                                {{ transfer.sources.length }} separate payments,
                                the group settles in one hop: everyone else's
                                payments cover what
                                {{ nameOf(transfer.toId) }} is owed by the
                                others, so sending the whole
                                {{ formatMoney(transfer.amountMinor) }} to
                                {{ nameOf(transfer.toId) }} leaves everybody
                                with exactly the right amount.
                            </template>
                            <template v-else>
                                All of it is money
                                {{ nameOf(transfer.toId) }} fronted for you
                                directly.
                            </template>
                        </p>
                        <p
                            v-if="
                                !haveSharedAnExpense(viewer.id, transfer.toId)
                            "
                            class="mt-2 rounded-lg bg-neutral-100 px-3 py-2 text-neutral-600"
                        >
                            You and {{ nameOf(transfer.toId) }} never shared
                            anything on this trip. That's expected — you're
                            clearing the group, not a debt between the two of
                            you.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        <!-- What you're owed -->
        <section v-if="owedToMe.length" class="px-5 pb-4">
            <div class="rounded-3xl bg-white p-5 shadow-sm">
                <p class="text-sm text-neutral-500">Coming to you</p>
                <p class="mt-1 text-3xl font-semibold tabular-nums">
                    {{ formatMoney(myBalance.netMinor) }}
                </p>
                <ul class="mt-3 space-y-2 text-sm">
                    <li
                        v-for="transfer in owedToMe"
                        :key="transfer.id"
                        class="flex items-center justify-between"
                    >
                        <span class="flex items-center gap-2">
                            <span
                                class="grid size-6 place-items-center rounded-full text-[10px] font-semibold text-white"
                                :class="participantOf(transfer.fromId).color"
                            >
                                {{ nameOf(transfer.fromId).charAt(0) }}
                            </span>
                            {{ nameOf(transfer.fromId) }}
                        </span>
                        <span class="tabular-nums">
                            {{ formatMoney(transfer.amountMinor) }}
                        </span>
                    </li>
                </ul>
            </div>
        </section>

        <!-- Everything else, out of the way -->
        <section class="px-5 pb-8">
            <button
                type="button"
                class="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm shadow-sm"
                @click="expanded = expanded === 'board' ? null : 'board'"
            >
                <span class="font-medium">Everyone's balances</span>
                <ArrowRight class="size-4 text-neutral-400" />
            </button>

            <ul
                v-if="expanded === 'board'"
                class="mt-2 divide-y divide-neutral-100 rounded-2xl bg-white px-4 shadow-sm"
            >
                <li
                    v-for="transfer in suggestedTransfers"
                    :key="transfer.id"
                    class="flex items-center justify-between py-3 text-sm"
                >
                    <span class="flex items-center gap-2">
                        {{ nameOf(transfer.fromId) }}
                        <ArrowRight class="size-3.5 text-neutral-400" />
                        {{ nameOf(transfer.toId) }}
                    </span>
                    <span class="tabular-nums">
                        {{ formatMoney(transfer.amountMinor) }}
                    </span>
                </li>
            </ul>
        </section>
    </div>
</template>
