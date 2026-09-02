<script setup lang="ts">
/** PROTOTYPE — create vs edit scenario toggle for issue #16. */
import { mode, setMode } from './state';
</script>

<template>
    <div
        class="sticky top-0 z-40 border-b border-neutral-200 bg-white/95 px-3 py-2 backdrop-blur"
    >
        <div class="mx-auto flex max-w-md items-center gap-2">
            <span class="text-[10px] font-medium tracking-wide text-neutral-400 uppercase">
                Scenario
            </span>
            <div class="flex flex-1 rounded-lg bg-neutral-100 p-0.5">
                <button
                    type="button"
                    class="flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition"
                    :class="
                        mode === 'create'
                            ? 'bg-white text-neutral-900 shadow-sm'
                            : 'text-neutral-500'
                    "
                    @click="setMode('create')"
                >
                    Create blank
                </button>
                <button
                    type="button"
                    class="flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition"
                    :class="
                        mode === 'edit'
                            ? 'bg-white text-neutral-900 shadow-sm'
                            : 'text-neutral-500'
                    "
                    @click="setMode('edit')"
                >
                    Edit dinner
                </button>
            </div>
        </div>
    </div>
</template>
