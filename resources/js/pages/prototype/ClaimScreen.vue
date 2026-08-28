<script setup lang="ts">
/**
 * PROTOTYPE — throwaway. Delete before this branch goes anywhere near main.
 *
 * Three variants of the Claim Link screen on one route, switchable via ?variant=.
 * Question (issue #2): what does the claim screen look and feel like, and does
 * share-based claiming survive contact with a real receipt?
 *
 *   A  Receipt   — the bill top to bottom, a stepper per row
 *   B  Deck      — one Line Item at a time, three big verbs, review at the end
 *   C  Table     — a Participant rail plus a grid of tiles; the phone gets passed around
 *
 * Claims are held in memory (see ./claim/state.ts) and survive variant switches,
 * so the same table state can be compared across all three. Nothing persists.
 */
import { Head, usePage } from '@inertiajs/vue3';
import { computed } from 'vue';
import PrototypeSwitcher from '@/components/PrototypeSwitcher.vue';
import VariantA from './claim/VariantA.vue';
import VariantB from './claim/VariantB.vue';
import VariantC from './claim/VariantC.vue';

const variants = [
    { key: 'A', name: 'Receipt' },
    { key: 'B', name: 'Deck' },
    { key: 'C', name: 'Table' },
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
    <Head title="PROTOTYPE — Claim screen">
        <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1"
        />
    </Head>

    <div class="mx-auto max-w-md">
        <VariantA v-if="current === 'A'" />
        <VariantB v-else-if="current === 'B'" />
        <VariantC v-else />
    </div>

    <PrototypeSwitcher :variants="variants" :current="current" />
</template>
