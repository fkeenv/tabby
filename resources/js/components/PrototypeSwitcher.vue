<script setup lang="ts">
/** PROTOTYPE — throwaway variant switcher. Never ships: hidden in production builds. */
import { router } from '@inertiajs/vue3';
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import { computed, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
    variants: { key: string; name: string }[];
    current: string;
}>();

const hidden = computed(() => import.meta.env.PROD);

const index = computed(() => {
    const found = props.variants.findIndex((v) => v.key === props.current);

    return found === -1 ? 0 : found;
});

const currentVariant = computed(() => props.variants[index.value]);

function go(delta: number): void {
    const next =
        props.variants[
            (index.value + delta + props.variants.length) %
                props.variants.length
        ];
    router.visit(window.location.pathname + '?variant=' + next.key, {
        replace: true,
        preserveScroll: true,
    });
}

function onKey(event: KeyboardEvent): void {
    const target = event.target as HTMLElement | null;

    if (
        target &&
        (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable)
    ) {
        return;
    }

    if (event.key === 'ArrowLeft') {
        go(-1);
    }

    if (event.key === 'ArrowRight') {
        go(1);
    }
}

onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<template>
    <div
        v-if="!hidden"
        class="fixed bottom-3 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-neutral-900 px-1.5 py-1.5 text-white shadow-2xl shadow-black/40"
    >
        <button
            type="button"
            class="grid size-8 place-items-center rounded-full hover:bg-white/15"
            aria-label="Previous variant"
            @click="go(-1)"
        >
            <ChevronLeft class="size-4" />
        </button>
        <span class="px-2 font-mono text-xs whitespace-nowrap tabular-nums">
            {{ currentVariant.key }} · {{ currentVariant.name }}
        </span>
        <button
            type="button"
            class="grid size-8 place-items-center rounded-full hover:bg-white/15"
            aria-label="Next variant"
            @click="go(1)"
        >
            <ChevronRight class="size-4" />
        </button>
    </div>
</template>
