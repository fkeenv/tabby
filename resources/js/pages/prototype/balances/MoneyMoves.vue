<script setup lang="ts">
/**
 * PROTOTYPE variant C — "Money moves".
 *
 * Bet: the netting is strange because it is invisible. Draw it. Payers on the
 * left, receivers on the right, one arrow per Suggested Transfer with its
 * thickness proportional to the amount, and tapping an arrow unpacks what that
 * one payment is standing in for. The explanation is the primary affordance;
 * paying is secondary.
 */
import { CircleCheck } from '@lucide/vue';
import { computed, ref } from 'vue';
import {
    balanceOf,
    formatMoney,
    groupName,
    haveSharedAnExpense,
    isSettled,
    lastChange,
    nameOf,
    participantOf,
    recordPayment,
    suggestedTransfers,
    unclaimedTotal,
    viewer,
} from './state';

const ROW = 84;
const NODE_TOP = 8;
const LEFT_EDGE = 132;
const RIGHT_EDGE = 228;

const selectedId = ref<string | null>(null);

const debtors = computed(() => {
    const seen: string[] = [];

    for (const transfer of suggestedTransfers.value) {
        if (!seen.includes(transfer.fromId)) {
            seen.push(transfer.fromId);
        }
    }

    return seen;
});

const creditors = computed(() => {
    const seen: string[] = [];

    for (const transfer of suggestedTransfers.value) {
        if (!seen.includes(transfer.toId)) {
            seen.push(transfer.toId);
        }
    }

    return seen;
});

const height = computed(
    () =>
        Math.max(debtors.value.length, creditors.value.length) * ROW + NODE_TOP,
);

const maxAmount = computed(() =>
    Math.max(1, ...suggestedTransfers.value.map((t) => t.amountMinor)),
);

function centerY(column: string[], id: string): number {
    return column.indexOf(id) * ROW + NODE_TOP + 32;
}

function pathFor(fromId: string, toId: string): string {
    const y1 = centerY(debtors.value, fromId);
    const y2 = centerY(creditors.value, toId);

    return `M ${LEFT_EDGE},${y1} C 180,${y1} 180,${y2} ${RIGHT_EDGE},${y2}`;
}

function strokeFor(amountMinor: number): number {
    return 2 + (12 * amountMinor) / maxAmount.value;
}

const selected = computed(
    () =>
        suggestedTransfers.value.find((t) => t.id === selectedId.value) ?? null,
);

function pay(): void {
    if (selected.value) {
        recordPayment(
            selected.value.fromId,
            selected.value.toId,
            selected.value.amountMinor,
        );
        selectedId.value = null;
    }
}
</script>

<template>
    <div
        class="mx-auto min-h-screen max-w-md bg-neutral-950 pb-64 text-neutral-100"
    >
        <header class="px-5 pt-6 pb-3">
            <h1 class="text-lg font-semibold">{{ groupName }}</h1>
            <p class="text-xs text-neutral-400">
                Four payments clear the whole group. Tap one to see what it's
                made of.
            </p>
        </header>

        <p
            v-if="lastChange"
            class="mx-5 mb-3 rounded-lg bg-amber-500/15 px-3 py-2 text-xs text-amber-200"
        >
            {{ lastChange.note }} — the arrows below moved.
        </p>

        <section v-if="isSettled" class="px-5 py-16 text-center">
            <CircleCheck class="mx-auto size-12 text-emerald-400" />
            <p class="mt-4 text-2xl font-semibold">Nothing left to move</p>
            <p class="mx-auto mt-2 max-w-xs text-sm text-neutral-400">
                Every balance is zero. The Group stays open — a Claim landing
                tomorrow will put arrows back on this screen.
            </p>
        </section>

        <section v-else class="px-2">
            <div
                class="mb-1 flex justify-between px-4 text-[11px] text-neutral-500"
            >
                <span>pays</span>
                <span>receives</span>
            </div>

            <svg
                :viewBox="`0 0 360 ${height}`"
                class="w-full"
                :style="{ height: height + 'px' }"
            >
                <!-- arrows first, so nodes sit on top -->
                <g
                    v-for="transfer in suggestedTransfers"
                    :key="transfer.id"
                    class="cursor-pointer"
                    @click="
                        selectedId =
                            selectedId === transfer.id ? null : transfer.id
                    "
                >
                    <path
                        :d="pathFor(transfer.fromId, transfer.toId)"
                        fill="none"
                        stroke="transparent"
                        stroke-width="24"
                    />
                    <path
                        :d="pathFor(transfer.fromId, transfer.toId)"
                        fill="none"
                        :stroke="
                            selectedId === transfer.id
                                ? 'rgb(255 255 255)'
                                : transfer.fromId === viewer.id ||
                                    transfer.toId === viewer.id
                                  ? 'rgb(129 140 248)'
                                  : 'rgb(64 64 64)'
                        "
                        :stroke-width="strokeFor(transfer.amountMinor)"
                        stroke-linecap="round"
                    />
                    <text
                        x="180"
                        :y="
                            (centerY(debtors, transfer.fromId) +
                                centerY(creditors, transfer.toId)) /
                                2 -
                            8
                        "
                        text-anchor="middle"
                        class="fill-neutral-300 text-[10px] tabular-nums"
                    >
                        {{ formatMoney(transfer.amountMinor) }}
                    </text>
                </g>

                <!-- debtor nodes -->
                <g v-for="(id, index) in debtors" :key="'d' + id">
                    <rect
                        x="8"
                        :y="index * ROW + NODE_TOP"
                        width="124"
                        height="64"
                        rx="14"
                        :class="
                            id === viewer.id
                                ? 'fill-indigo-500/20 stroke-indigo-400'
                                : 'fill-neutral-900 stroke-neutral-800'
                        "
                        stroke-width="1"
                    />
                    <text
                        x="24"
                        :y="index * ROW + NODE_TOP + 26"
                        class="fill-neutral-100 text-[13px] font-medium"
                    >
                        {{ nameOf(id) }}{{ id === viewer.id ? ' (you)' : '' }}
                    </text>
                    <text
                        x="24"
                        :y="index * ROW + NODE_TOP + 46"
                        class="fill-rose-300 text-[13px] tabular-nums"
                    >
                        {{ formatMoney(balanceOf(id).netMinor) }}
                    </text>
                </g>

                <!-- creditor nodes -->
                <g v-for="(id, index) in creditors" :key="'c' + id">
                    <rect
                        x="228"
                        :y="index * ROW + NODE_TOP"
                        width="124"
                        height="64"
                        rx="14"
                        :class="
                            id === viewer.id
                                ? 'fill-indigo-500/20 stroke-indigo-400'
                                : 'fill-neutral-900 stroke-neutral-800'
                        "
                        stroke-width="1"
                    />
                    <text
                        x="244"
                        :y="index * ROW + NODE_TOP + 26"
                        class="fill-neutral-100 text-[13px] font-medium"
                    >
                        {{ nameOf(id) }}{{ id === viewer.id ? ' (you)' : '' }}
                    </text>
                    <text
                        x="244"
                        :y="index * ROW + NODE_TOP + 46"
                        class="fill-emerald-300 text-[13px] tabular-nums"
                    >
                        +{{ formatMoney(balanceOf(id).netMinor) }}
                    </text>
                </g>
            </svg>

            <p
                v-if="unclaimedTotal > 0"
                class="px-5 pt-2 text-[11px] text-neutral-500"
            >
                {{ formatMoney(unclaimedTotal) }} of the bill is still unclaimed
                and is not moving on this diagram.
            </p>
        </section>

        <!-- the trace -->
        <section v-if="selected" class="mt-4 px-5">
            <div class="rounded-2xl bg-neutral-900 p-5">
                <p class="text-sm text-neutral-400">
                    {{ nameOf(selected.fromId) }} pays
                    {{ nameOf(selected.toId) }}
                </p>
                <p class="mt-1 text-3xl font-semibold tabular-nums">
                    {{ formatMoney(selected.amountMinor) }}
                </p>

                <p
                    class="mt-4 text-xs tracking-wide text-neutral-500 uppercase"
                >
                    What it's made of
                </p>
                <ul class="mt-2 space-y-2 text-sm">
                    <li
                        v-for="source in selected.sources"
                        :key="source.creditorId"
                        class="flex items-start justify-between gap-3"
                    >
                        <span>
                            <span class="flex items-center gap-2">
                                <span
                                    class="grid size-5 place-items-center rounded-full text-[9px] font-semibold text-white"
                                    :class="
                                        participantOf(source.creditorId).color
                                    "
                                >
                                    {{ nameOf(source.creditorId).charAt(0) }}
                                </span>
                                owed to {{ nameOf(source.creditorId) }}
                            </span>
                            <span class="mt-0.5 block text-xs text-neutral-500">
                                {{
                                    source.direct
                                        ? 'goes straight to them'
                                        : nameOf(source.creditorId) +
                                          ' gets it back through the other payments'
                                }}
                            </span>
                        </span>
                        <span class="tabular-nums">
                            {{ formatMoney(source.amountMinor) }}
                        </span>
                    </li>
                </ul>

                <p
                    v-if="!haveSharedAnExpense(selected.fromId, selected.toId)"
                    class="mt-4 rounded-lg bg-neutral-800 px-3 py-2 text-xs text-neutral-300"
                >
                    {{ nameOf(selected.fromId) }} and
                    {{ nameOf(selected.toId) }}
                    never shared an Expense. The arrow exists because it saves
                    the group payments, not because there is a debt between
                    them.
                </p>

                <button
                    type="button"
                    class="mt-5 w-full rounded-full bg-white py-3 text-sm font-medium text-neutral-900"
                    @click="pay"
                >
                    Mark this paid in full
                </button>
            </div>
        </section>
    </div>
</template>
