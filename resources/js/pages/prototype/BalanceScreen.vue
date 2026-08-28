<script setup lang="ts">
/**
 * PROTOTYPE — throwaway. Delete before this branch goes anywhere near main.
 *
 * Four variants of the Balances / Suggested Transfers screen on one route,
 * switchable via ?variant=. Question (issue #5): how are Balances and Suggested
 * Transfers presented so a minimised transfer set feels fair rather than
 * arbitrary?
 *
 *   A  Just you      — one amount, one button, everything else collapsed
 *   B  The board     — the full ledger permanently on screen, transfers derived
 *   C  Money moves   — a flow diagram; tap an arrow to unpack it
 *   D  Honest first  — raw pairwise debts by default, minimisation opt-in
 *
 * They disagree about one thing: whether the minimal set is the model or a
 * convenience, and how much of the workings has to be visible for it to be
 * believed.
 *
 * State lives in ./balances/state.ts and survives variant switches, so the same
 * balances, payments and scenario can be compared across all four. The
 * arithmetic is the real ADR-0002 allocator. Nothing persists.
 */
import { Head, usePage } from '@inertiajs/vue3';
import { computed } from 'vue';
import PrototypeSwitcher from '@/components/PrototypeSwitcher.vue';
import Board from './balances/Board.vue';
import HonestFirst from './balances/HonestFirst.vue';
import JustYou from './balances/JustYou.vue';
import MoneyMoves from './balances/MoneyMoves.vue';
import ScenarioBar from './balances/ScenarioBar.vue';

const variants = [
    { key: 'A', name: 'Just you' },
    { key: 'B', name: 'The board' },
    { key: 'C', name: 'Money moves' },
    { key: 'D', name: 'Honest first' },
];

const page = usePage();
const current = computed(() => {
    const key = (
        new URL(page.url, 'http://localhost').searchParams.get('variant') ?? 'A'
    ).toUpperCase();

    return variants.some((v) => v.key === key) ? key : 'A';
});
</script>

<template>
    <Head title="PROTOTYPE — Balances">
        <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1"
        />
    </Head>

    <JustYou v-if="current === 'A'" />
    <Board v-else-if="current === 'B'" />
    <MoneyMoves v-else-if="current === 'C'" />
    <HonestFirst v-else />

    <ScenarioBar />
    <PrototypeSwitcher :variants="variants" :current="current" />
</template>
