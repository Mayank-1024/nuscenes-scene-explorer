<script setup lang="ts">
import type { SceneSummary } from '../types'

defineProps<{ scenes: SceneSummary[]; active?: string }>()
const emit = defineEmits<{ select: [token: string] }>()
</script>

<template>
  <nav class="scenes" aria-label="Scenes">
    <h2>Scenes</h2>
    <button
      v-for="s in scenes"
      :key="s.token"
      :class="{ active: s.token === active }"
      @click="emit('select', s.token)"
    >
      <span class="name">{{ s.name }}</span>
      <span class="desc">{{ s.description }}</span>
      <span class="meta">{{ s.samples.length }} keyframes</span>
    </button>
  </nav>
</template>
