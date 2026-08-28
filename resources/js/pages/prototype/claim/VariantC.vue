<script setup lang="ts">
/**
 * PROTOTYPE Variant C — "The table".
 * Everyone at once: a rail of Participants at the top, a grid of Line Items below.
 * You pick who you are, then tap items; tapping again adds another Share.
 * Built for the phone being passed around the table, not one phone per person.
 * Completeness warning: a fill bar on the tile itself.
 */
import { Minus, TriangleAlert, UserPlus, X } from '@lucide/vue';
import { computed, ref } from 'vue';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
    participants,
    payerName,
    session,
    sharesFor,
    similarNames,
    totalCentsFor,
    totalShares,
    unclaimedItems,
} from './state';
import type { LineItem } from './state';

const adding = ref(false);
const typedName = ref('');
const suggestions = computed(() => similarNames(typedName.value));
const totalsOpen = ref(false);

function add(): void {
    if (!typedName.value.trim()) {
        return;
    }

    joinAs(addParticipant(typedName.value));
    typedName.value = '';
    adding.value = false;
}

function segments(
    item: LineItem,
): { color: string; width: string; name: string }[] {
    const total = Math.max(totalShares(item.id), item.quantity);

    if (total === 0) {
        return [];
    }

    return participants
        .filter((p) => sharesFor(item.id, p.id) > 0)
        .map((p) => ({
            color: p.color,
            name: p.name,
            width: (sharesFor(item.id, p.id) / total) * 100 + '%',
        }));
}

function mine(item: LineItem): number {
    return session.actingAsId ? sharesFor(item.id, session.actingAsId) : 0;
}

function overClaimed(item: LineItem): boolean {
    return totalShares(item.id) > item.quantity;
}

/** Line Items whose over-claim has already been confirmed once this session. */
const waved = ref<string[]>([]);
const pending = ref<LineItem | null>(null);

function tap(item: LineItem): void {
    if (!session.actingAsId) {
        adding.value = true;

        return;
    }

    if (isFull(item.id, item.quantity) && !waved.value.includes(item.id)) {
        pending.value = item;

        return;
    }

    bumpShares(item.id, session.actingAsId, 1);
}

function confirmOverClaim(): void {
    const item = pending.value;

    if (!item || !session.actingAsId) {
        return;
    }

    waved.value = [...waved.value, item.id];
    bumpShares(item.id, session.actingAsId, 1);
    pending.value = null;
}
</script>

<template>
    <div class="min-h-screen bg-white pb-44">
        <header class="px-4 pt-4">
            <p class="text-xs text-neutral-500">
                {{ groupName }} · {{ payerName }} paid
            </p>
            <h1 class="text-lg font-semibold text-neutral-900">
                Tap what you had
                <span class="font-normal text-neutral-500"
                    >— tap twice for two</span
                >
            </h1>
        </header>

        <!-- Who's at the table -->
        <div
            class="sticky top-0 z-10 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur"
        >
            <div class="flex gap-2 overflow-x-auto pb-1">
                <button
                    v-for="p in participants"
                    :key="p.id"
                    type="button"
                    class="flex shrink-0 flex-col items-center gap-1"
                    @click="joinAs(p)"
                >
                    <span
                        class="grid size-11 place-items-center rounded-full text-sm font-bold text-white transition"
                        :class="[
                            p.color,
                            session.actingAsId === p.id
                                ? 'ring-2 ring-neutral-900 ring-offset-2'
                                : 'opacity-45',
                        ]"
                    >
                        {{ p.name.charAt(0) }}
                    </span>
                    <span
                        class="max-w-14 truncate text-[11px]"
                        :class="
                            session.actingAsId === p.id
                                ? 'font-semibold text-neutral-900'
                                : 'text-neutral-500'
                        "
                    >
                        {{ p.name }}
                    </span>
                </button>

                <button
                    type="button"
                    class="flex shrink-0 flex-col items-center gap-1"
                    @click="adding = true"
                >
                    <span
                        class="grid size-11 place-items-center rounded-full border-2 border-dashed border-neutral-300 text-neutral-400"
                    >
                        <UserPlus class="size-4" />
                    </span>
                    <span class="text-[11px] text-neutral-500">Add me</span>
                </button>
            </div>

            <div v-if="adding" class="mt-3 rounded-xl bg-neutral-100 p-3">
                <div class="flex gap-2">
                    <input
                        v-model="typedName"
                        type="text"
                        placeholder="Your name"
                        class="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2.5 outline-none focus:border-neutral-900"
                        @keyup.enter="add"
                    />
                    <button
                        type="button"
                        class="rounded-lg bg-neutral-900 px-4 text-sm font-semibold text-white"
                        @click="add"
                    >
                        Add
                    </button>
                    <button
                        type="button"
                        class="grid size-10 place-items-center rounded-lg text-neutral-500"
                        @click="adding = false"
                    >
                        <X class="size-4" />
                    </button>
                </div>
                <div
                    v-if="suggestions.length"
                    class="mt-2 flex flex-wrap gap-2"
                >
                    <button
                        v-for="p in suggestions"
                        :key="p.id"
                        type="button"
                        class="rounded-full bg-white px-3 py-1.5 text-xs shadow-sm"
                        @click="(joinAs(p), (adding = false))"
                    >
                        That's me — {{ p.name }}
                    </button>
                </div>
            </div>
        </div>

        <!-- The bill as tiles -->
        <div class="grid grid-cols-2 gap-2 px-4 pt-3">
            <button
                v-for="item in lineItems"
                :key="item.id"
                type="button"
                class="relative flex min-h-24 flex-col justify-between rounded-xl border p-3 text-left transition active:scale-[0.98]"
                :class="[
                    overClaimed(item)
                        ? 'border-amber-400 bg-amber-50'
                        : mine(item) > 0
                          ? 'border-neutral-900 bg-neutral-900/[0.03]'
                          : 'border-neutral-200',
                ]"
                @click="tap(item)"
            >
                <span
                    v-if="mine(item) > 0"
                    class="absolute -top-2.5 -right-2 flex items-center gap-0.5 rounded-full bg-neutral-900 py-0.5 pr-2 pl-0.5 text-white shadow-sm"
                >
                    <span
                        class="grid size-6 place-items-center rounded-full bg-white/15 active:bg-white/35"
                        role="button"
                        :aria-label="'Give back a share of ' + item.description"
                        @click.stop="
                            bumpShares(item.id, session.actingAsId!, -1)
                        "
                    >
                        <Minus class="size-3.5" />
                    </span>
                    <span class="text-xs font-bold tabular-nums">{{
                        mine(item)
                    }}</span>
                </span>

                <span
                    class="text-[13px] leading-snug font-medium text-neutral-900"
                >
                    {{ item.description }}
                </span>

                <span class="mt-2 block">
                    <span
                        class="flex items-baseline justify-between text-[11px] tabular-nums"
                    >
                        <span class="text-neutral-500">
                            <template v-if="item.quantity > 1"
                                >{{ item.quantity }} ×
                            </template>
                            {{ formatMoney(item.unitPriceCents) }}
                        </span>
                        <span
                            :class="
                                overClaimed(item)
                                    ? 'font-semibold text-amber-700'
                                    : 'text-neutral-400'
                            "
                        >
                            {{ totalShares(item.id) }}/{{ item.quantity }}
                        </span>
                    </span>
                    <span
                        class="mt-1 flex h-1.5 gap-px overflow-hidden rounded-full bg-neutral-100"
                    >
                        <span
                            v-for="(seg, i) in segments(item)"
                            :key="i"
                            class="h-full"
                            :class="seg.color"
                            :style="{ width: seg.width }"
                        />
                    </span>
                </span>
            </button>
        </div>

        <p
            v-if="unclaimedItems.length"
            class="px-4 pt-4 text-xs text-neutral-500"
        >
            {{ unclaimedItems.length }} things nobody has claimed yet —
            {{ unclaimedItems.map((i) => i.description).join(', ') }}.
        </p>

        <!-- Everyone's totals -->
        <div
            class="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white px-4 pt-3 pb-20"
        >
            <button
                type="button"
                class="flex w-full items-center justify-between"
                @click="totalsOpen = !totalsOpen"
            >
                <span class="text-sm text-neutral-500">
                    {{
                        actingAs
                            ? actingAs.name + "'s total"
                            : 'Pick who you are'
                    }}
                </span>
                <span
                    class="text-2xl font-semibold text-neutral-900 tabular-nums"
                >
                    {{
                        actingAs ? formatMoney(totalCentsFor(actingAs.id)) : '—'
                    }}
                </span>
            </button>
            <ul
                v-if="totalsOpen"
                class="mt-2 space-y-1 border-t border-dashed border-neutral-200 pt-2"
            >
                <li
                    v-for="p in participants"
                    :key="p.id"
                    class="flex justify-between text-sm tabular-nums"
                    :class="
                        p.id === session.actingAsId
                            ? 'font-semibold text-neutral-900'
                            : 'text-neutral-600'
                    "
                >
                    <span class="flex items-center gap-2">
                        <span class="size-2 rounded-full" :class="p.color" />
                        {{ p.name }}
                    </span>
                    <span>
                        {{ formatMoney(totalCentsFor(p.id)) }}
                        <span class="text-xs font-normal text-neutral-400">
                            (incl.
                            {{ formatMoney(adjustmentCentsFor(p.id)) }} tax
                            &amp; tip)
                        </span>
                    </span>
                </li>
            </ul>
        </div>

        <Dialog
            :open="pending !== null"
            @update:open="(open: boolean) => !open && (pending = null)"
        >
            <DialogContent
                class="max-w-sm rounded-2xl"
                :show-close-button="false"
            >
                <DialogHeader>
                    <span
                        class="mb-1 grid size-10 place-items-center rounded-full bg-amber-100 text-amber-700"
                    >
                        <TriangleAlert class="size-5" />
                    </span>
                    <DialogTitle class="text-left">
                        All {{ pending?.quantity }} already claimed
                    </DialogTitle>
                    <DialogDescription class="text-left">
                        <template v-if="pending">
                            {{
                                claimersOf(pending.id)
                                    .map((p) => p.name)
                                    .join(', ')
                            }}
                            {{
                                claimersOf(pending.id).length === 1
                                    ? 'has'
                                    : 'have'
                            }}
                            taken {{ totalShares(pending.id) }} of
                            {{ pending.quantity }} &middot;
                            {{ pending.description }}. Take a share anyway if
                            you shared one &mdash; everyone on it splits the
                            cost.
                        </template>
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter class="flex-col gap-2 sm:flex-col">
                    <button
                        type="button"
                        class="w-full rounded-xl bg-neutral-900 py-3.5 text-sm font-semibold text-white"
                        @click="confirmOverClaim"
                    >
                        Yes, I shared it
                    </button>
                    <button
                        type="button"
                        class="w-full py-2 text-sm font-medium text-neutral-500"
                        @click="pending = null"
                    >
                        Never mind
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>
