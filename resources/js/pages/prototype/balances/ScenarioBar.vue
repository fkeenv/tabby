<script setup lang="ts">
/**
 * PROTOTYPE chrome — throwaway. Not part of any design being evaluated.
 *
 * Drives the states that are hard to stumble into by hand: who is looking,
 * where the Unclaimed residual lands (issue #13), a late Claim after everyone
 * has paid (ADR-0001), and the zero state.
 */
import { ChevronDown, ChevronUp } from '@lucide/vue';
import { ref } from 'vue';
import {
    formatMoney,
    imbalanceMinor,
    isSettled,
    lateClaim,
    participants,
    payments,
    resetScenario,
    settleEverything,
    unclaimedPolicy,
    unclaimedTotal,
    viewerId,
} from './state';

const open = ref(true);

const policies = [
    { key: 'payer', label: 'payer carries' },
    { key: 'claimers', label: 'split among claimers' },
    { key: 'unresolved', label: 'nobody — books do not balance' },
] as const;
</script>

<template>
    <div
        class="fixed bottom-16 left-1/2 z-[99] w-[min(30rem,calc(100vw-1.5rem))] -translate-x-1/2 rounded-2xl border border-white/10 bg-neutral-900/95 text-white shadow-2xl shadow-black/40 backdrop-blur"
    >
        <button
            type="button"
            class="flex w-full items-center justify-between px-3 py-2 font-mono text-[11px] tracking-wide uppercase opacity-70"
            @click="open = !open"
        >
            <span>Prototype scenario</span>
            <ChevronDown v-if="open" class="size-3.5" />
            <ChevronUp v-else class="size-3.5" />
        </button>

        <div v-if="open" class="space-y-3 px-3 pb-3 text-xs">
            <div>
                <p class="mb-1 opacity-60">Viewing as</p>
                <div class="flex flex-wrap gap-1">
                    <button
                        v-for="p in participants"
                        :key="p.id"
                        type="button"
                        class="rounded-full px-2.5 py-1"
                        :class="
                            viewerId === p.id
                                ? 'bg-white text-neutral-900'
                                : 'bg-white/10 hover:bg-white/20'
                        "
                        @click="viewerId = p.id"
                    >
                        {{ p.name
                        }}<span v-if="p.isOrganizer" class="opacity-50">
                            ·org</span
                        >
                    </button>
                </div>
            </div>

            <div>
                <p class="mb-1 opacity-60">
                    Unclaimed {{ formatMoney(unclaimedTotal) }} is absorbed by
                </p>
                <div class="flex flex-wrap gap-1">
                    <button
                        v-for="option in policies"
                        :key="option.key"
                        type="button"
                        class="rounded-full px-2.5 py-1"
                        :class="
                            unclaimedPolicy === option.key
                                ? 'bg-white text-neutral-900'
                                : 'bg-white/10 hover:bg-white/20'
                        "
                        @click="unclaimedPolicy = option.key"
                    >
                        {{ option.label }}
                    </button>
                </div>
            </div>

            <div class="flex flex-wrap gap-1">
                <button
                    type="button"
                    class="rounded-full bg-white/10 px-2.5 py-1 hover:bg-white/20"
                    @click="settleEverything"
                >
                    Everyone pays up
                </button>
                <button
                    type="button"
                    class="rounded-full bg-white/10 px-2.5 py-1 hover:bg-white/20"
                    @click="lateClaim"
                >
                    Late Claim lands
                </button>
                <button
                    type="button"
                    class="rounded-full bg-white/10 px-2.5 py-1 hover:bg-white/20"
                    @click="resetScenario"
                >
                    Reset
                </button>
            </div>

            <p class="font-mono opacity-50">
                {{ payments.length }} payments ·
                {{ isSettled ? 'settled' : 'live' }}
                <span v-if="imbalanceMinor !== 0">
                    · unbalanced by {{ formatMoney(imbalanceMinor) }}
                </span>
            </p>
        </div>
    </div>
</template>
