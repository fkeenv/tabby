<script setup lang="ts">
/**
 * PROTOTYPE — throwaway. Delete before this branch goes anywhere near main.
 *
 * Three variants of the Organizer expense-entry screen on one route,
 * switchable via ?variant=. Question (issue #16): how does the Organizer
 * enter an Expense — and correct one — on a phone?
 *
 *   A  Receipt composer — one nested form; qty × unit price; adjustments in-breath
 *   B  Total-first      — one amount first; breaking into lines is optional
 *   C  Shell + drill-in — Expense shell first; lines/adjustments are separate taps
 *
 * They disagree about create payload shape, typing burden, and whether
 * correction or creation is the happy path. State lives in ./expense-entry/state.ts
 * and survives variant switches. Nothing persists.
 */
import { Head, usePage } from '@inertiajs/vue3';
import { computed } from 'vue';
import PrototypeSwitcher from '@/components/PrototypeSwitcher.vue';
import ModeBar from './expense-entry/ModeBar.vue';
import ReceiptComposer from './expense-entry/ReceiptComposer.vue';
import ShellDrillIn from './expense-entry/ShellDrillIn.vue';
import TotalFirst from './expense-entry/TotalFirst.vue';

const variants = [
    { key: 'A', name: 'Receipt composer' },
    { key: 'B', name: 'Total-first' },
    { key: 'C', name: 'Shell + drill-in' },
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
    <Head title="PROTOTYPE — Expense entry">
        <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1"
        />
    </Head>

    <ModeBar />

    <ReceiptComposer v-if="current === 'A'" />
    <TotalFirst v-else-if="current === 'B'" />
    <ShellDrillIn v-else />

    <PrototypeSwitcher :variants="variants" :current="current" />
</template>
