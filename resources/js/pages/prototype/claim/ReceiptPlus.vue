<script setup lang="ts">
/**
 * PROTOTYPE Variants D and E — "Receipt+", the elegance pass on Variant A.
 *
 * D and E differ on exactly one axis, the `mode` prop, so the cap question can be
 * felt rather than argued:
 *
 *   confirm  the + never dies; the first tap past quantity asks once, then gets out of the way
 *   hard     the + is disabled the moment total shares reach quantity
 *
 * Try the Chianti (quantity 1, three people already on it) and the pizzas
 * (quantity 2, meant for three) under `hard`. That is the case the cap costs.
 */
import { Check, Minus, Plus, TriangleAlert } from '@lucide/vue';
import { computed, ref } from 'vue';
import {
    actingAs,
    addParticipant,
    adjustmentCentsFor,
    bumpShares,
    claimersOf,
    formatMoney,
    groupName,
    isFull,
    joinAs,
    lineItems,
    payerName,
    resetSession,
    sharesFor,
    similarNames,
    subtotalCentsFor,
    totalCentsFor,
    totalShares,
    unclaimedItems,
} from './state';
import type { LineItem } from './state';

const props = defineProps<{ mode: 'confirm' | 'hard' }>();

const typedName = ref('');
const suggestions = computed(() => similarNames(typedName.value));
const breakdownOpen = ref(false);

/** Rows where the "did you share one?" strip is showing, and rows already waved through. */
const asking = ref<string[]>([]);
const waved = ref<string[]>([]);

function join(): void {
    if (typedName.value.trim()) {
        joinAs(addParticipant(typedName.value));
    }
}

function myShares(item: LineItem): number {
    return actingAs.value ? sharesFor(item.id, actingAs.value.id) : 0;
}

function full(item: LineItem): boolean {
    return isFull(item.id, item.quantity);
}

function over(item: LineItem): boolean {
    return totalShares(item.id) > item.quantity;
}

function locked(item: LineItem): boolean {
    return props.mode === 'hard' && full(item);
}

/** Units as pips: one per unit bought, plus amber pips for shares beyond them. */
function pips(item: LineItem): ('taken' | 'free' | 'extra')[] {
    const claimed = totalShares(item.id);
    const row: ('taken' | 'free' | 'extra')[] = [];

    for (let i = 0; i < item.quantity; i++) {
        row.push(i < claimed ? 'taken' : 'free');
    }

    for (let i = item.quantity; i < claimed; i++) {
        row.push('extra');
    }

    return row.slice(0, 12);
}

function take(item: LineItem): void {
    if (locked(item)) {
        return;
    }

    if (
        props.mode === 'confirm' &&
        full(item) &&
        !waved.value.includes(item.id)
    ) {
        asking.value = [...asking.value, item.id];

        return;
    }

    bumpShares(item.id, actingAs.value!.id, 1);
}

function confirmTake(item: LineItem): void {
    waved.value = [...waved.value, item.id];
    asking.value = asking.value.filter((id) => id !== item.id);
    bumpShares(item.id, actingAs.value!.id, 1);
}

function cancelTake(item: LineItem): void {
    asking.value = asking.value.filter((id) => id !== item.id);
}
</script>

<template>
    <!-- First contact -->
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

    <div v-else class="min-h-screen bg-neutral-50 pb-44">
        <header
            class="sticky top-0 z-10 border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur"
        >
            <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                    <p class="truncate text-xs text-neutral-500">
                        {{ groupName }}
                    </p>
                    <h1 class="text-base font-semibold text-neutral-900">
                        Claim what you had
                    </h1>
                </div>
                <button
                    type="button"
                    class="flex shrink-0 items-center gap-2 rounded-full bg-neutral-100 py-1 pr-3 pl-1"
                    @click="resetSession()"
                >
                    <span
                        class="grid size-7 place-items-center rounded-full text-xs font-bold text-white"
                        :class="actingAs.color"
                    >
                        {{ actingAs.name.charAt(0) }}
                    </span>
                    <span class="text-xs font-medium text-neutral-700">{{
                        actingAs.name
                    }}</span>
                </button>
            </div>
            <p
                class="mt-2 font-mono text-[10px] tracking-wide text-neutral-400 uppercase"
            >
                {{
                    mode === 'hard'
                        ? 'Rule: a full row locks'
                        : 'Rule: a full row asks once, then lets you'
                }}
            </p>
        </header>

        <ul class="divide-y divide-neutral-200 bg-white">
            <li
                v-for="item in lineItems"
                :key="item.id"
                class="relative px-4 py-3 transition-colors"
                :class="[
                    over(item) ? 'bg-amber-50/60' : '',
                    locked(item) && myShares(item) === 0 ? 'opacity-55' : '',
                ]"
            >
                <span
                    v-if="myShares(item) > 0"
                    class="absolute inset-y-0 left-0 w-1"
                    :class="actingAs.color"
                />

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
                            {{
                                formatMoney(item.quantity * item.unitPriceCents)
                            }}
                        </p>

                        <div class="mt-2 flex items-center gap-2">
                            <span class="flex gap-1">
                                <span
                                    v-for="(pip, i) in pips(item)"
                                    :key="i"
                                    class="size-1.5 rounded-full"
                                    :class="{
                                        'bg-neutral-800': pip === 'taken',
                                        'bg-neutral-200': pip === 'free',
                                        'bg-amber-500': pip === 'extra',
                                    }"
                                />
                            </span>

                            <span
                                v-if="claimersOf(item.id).length"
                                class="flex -space-x-1.5"
                            >
                                <span
                                    v-for="p in claimersOf(item.id)"
                                    :key="p.id"
                                    class="grid size-5 place-items-center rounded-full text-[10px] font-bold text-white ring-2 ring-white"
                                    :class="p.color"
                                    :title="
                                        p.name +
                                        ' · ' +
                                        sharesFor(item.id, p.id) +
                                        ' share(s)'
                                    "
                                >
                                    {{ p.name.charAt(0) }}
                                </span>
                            </span>

                            <span
                                v-if="over(item)"
                                class="flex items-center gap-1 text-[11px] font-medium text-amber-700"
                            >
                                <TriangleAlert class="size-3" />
                                {{ totalShares(item.id) }} sharing
                                {{ item.quantity }}
                            </span>
                            <span
                                v-else-if="full(item)"
                                class="flex items-center gap-1 text-[11px] text-neutral-400"
                            >
                                <Check class="size-3" />
                                {{
                                    locked(item)
                                        ? 'Fully claimed'
                                        : 'All claimed'
                                }}
                            </span>
                        </div>
                    </div>

                    <div class="flex shrink-0 items-center gap-1">
                        <button
                            v-if="myShares(item) > 0"
                            type="button"
                            class="grid size-11 place-items-center rounded-full border border-neutral-300 bg-white text-neutral-700"
                            :aria-label="
                                'Give back a share of ' + item.description
                            "
                            @click="bumpShares(item.id, actingAs.id, -1)"
                        >
                            <Minus class="size-4" />
                        </button>
                        <span
                            v-if="myShares(item) > 0"
                            class="w-5 text-center text-lg font-semibold tabular-nums"
                        >
                            {{ myShares(item) }}
                        </span>
                        <button
                            type="button"
                            class="grid size-11 place-items-center rounded-full transition"
                            :class="
                                locked(item)
                                    ? 'cursor-not-allowed border border-neutral-200 bg-neutral-100 text-neutral-300'
                                    : full(item)
                                      ? 'border border-neutral-900 bg-white text-neutral-900'
                                      : 'bg-neutral-900 text-white'
                            "
                            :disabled="locked(item)"
                            :aria-label="'Take a share of ' + item.description"
                            @click="take(item)"
                        >
                            <Plus class="size-4" />
                        </button>
                    </div>
                </div>

                <div
                    v-if="asking.includes(item.id)"
                    class="mt-3 rounded-lg bg-amber-100/70 p-3 text-sm"
                >
                    <p class="text-amber-900">
                        All {{ item.quantity }} claimed already. Did you share
                        one?
                    </p>
                    <div class="mt-2 flex gap-2">
                        <button
                            type="button"
                            class="rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white"
                            @click="confirmTake(item)"
                        >
                            Yes, I shared it
                        </button>
                        <button
                            type="button"
                            class="rounded-lg bg-white px-3 py-2 text-xs font-medium text-neutral-700"
                            @click="cancelTake(item)"
                        >
                            Never mind
                        </button>
                    </div>
                </div>
            </li>
        </ul>

        <p
            v-if="unclaimedItems.length"
            class="px-4 pt-3 text-xs text-neutral-500"
        >
            Nobody has claimed
            {{ unclaimedItems.map((i) => i.description).join(', ') }} yet.
        </p>

        <div
            class="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white px-4 pt-3 pb-20"
        >
            <button
                type="button"
                class="flex w-full items-center justify-between"
                @click="breakdownOpen = !breakdownOpen"
            >
                <span class="text-sm text-neutral-500">Your total</span>
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
