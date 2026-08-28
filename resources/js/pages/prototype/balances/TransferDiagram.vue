<script setup lang="ts">
/**
 * PROTOTYPE — the winning piece of variant C, extracted so variant A's
 * "Everyone's balances" disclosure can expand into it (issue #5 verdict).
 *
 * Payers left, receivers right, one arrow per Suggested Transfer with its
 * thickness proportional to the amount. Tapping an arrow selects it; the host
 * decides what to show for the selection.
 */
import { computed } from 'vue';
import {
    balanceOf,
    formatMoney,
    nameOf,
    suggestedTransfers,
    viewer,
} from './state';

const props = withDefaults(
    defineProps<{ selectedId?: string | null; theme?: 'light' | 'dark' }>(),
    { selectedId: null, theme: 'dark' },
);

const emit = defineEmits<{ select: [id: string | null] }>();

const ROW = 84;
const NODE_TOP = 8;
const LEFT_EDGE = 132;
const RIGHT_EDGE = 228;

const light = computed(() => props.theme === 'light');

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

function strokeColorFor(transfer: {
    id: string;
    fromId: string;
    toId: string;
}): string {
    if (props.selectedId === transfer.id) {
        return light.value ? 'rgb(23 23 23)' : 'rgb(255 255 255)';
    }

    if (
        transfer.fromId === viewer.value.id ||
        transfer.toId === viewer.value.id
    ) {
        return light.value ? 'rgb(99 102 241)' : 'rgb(129 140 248)';
    }

    return light.value ? 'rgb(212 212 212)' : 'rgb(64 64 64)';
}

function nodeClass(id: string): string {
    if (id === viewer.value.id) {
        return light.value
            ? 'fill-indigo-50 stroke-indigo-400'
            : 'fill-indigo-500/20 stroke-indigo-400';
    }

    return light.value
        ? 'fill-white stroke-neutral-200'
        : 'fill-neutral-900 stroke-neutral-800';
}

function toggle(id: string): void {
    emit('select', props.selectedId === id ? null : id);
}
</script>

<template>
    <div>
        <div
            class="mb-1 flex justify-between px-4 text-[11px]"
            :class="light ? 'text-neutral-400' : 'text-neutral-500'"
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
                @click="toggle(transfer.id)"
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
                    :stroke="strokeColorFor(transfer)"
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
                    class="text-[10px] tabular-nums"
                    :class="light ? 'fill-neutral-500' : 'fill-neutral-300'"
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
                    :class="nodeClass(id)"
                    stroke-width="1"
                />
                <text
                    x="24"
                    :y="index * ROW + NODE_TOP + 26"
                    class="text-[13px] font-medium"
                    :class="light ? 'fill-neutral-900' : 'fill-neutral-100'"
                >
                    {{ nameOf(id) }}{{ id === viewer.id ? ' (you)' : '' }}
                </text>
                <text
                    x="24"
                    :y="index * ROW + NODE_TOP + 46"
                    class="text-[13px] tabular-nums"
                    :class="light ? 'fill-rose-600' : 'fill-rose-300'"
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
                    :class="nodeClass(id)"
                    stroke-width="1"
                />
                <text
                    x="244"
                    :y="index * ROW + NODE_TOP + 26"
                    class="text-[13px] font-medium"
                    :class="light ? 'fill-neutral-900' : 'fill-neutral-100'"
                >
                    {{ nameOf(id) }}{{ id === viewer.id ? ' (you)' : '' }}
                </text>
                <text
                    x="244"
                    :y="index * ROW + NODE_TOP + 46"
                    class="text-[13px] tabular-nums"
                    :class="light ? 'fill-emerald-600' : 'fill-emerald-300'"
                >
                    +{{ formatMoney(balanceOf(id).netMinor) }}
                </text>
            </g>
        </svg>
    </div>
</template>
