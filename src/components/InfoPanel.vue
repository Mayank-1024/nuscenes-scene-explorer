<script setup lang="ts">
import { computed } from 'vue'
import type { Box } from '../types'
import { categoryStyle, hex, legendEntries } from '../categories'

const props = defineProps<{ boxes: Box[]; pointCount: number; loadMs?: number; selected?: Box; seenIn?: string[]; selectedMissing?: boolean }>()

const distance = (b: Box) => Math.hypot(b.center[0], b.center[1])

const counts = computed(() => {
  const m = new Map<string, number>()
  for (const b of props.boxes) m.set(categoryStyle(b.category).key, (m.get(categoryStyle(b.category).key) ?? 0) + 1)
  return legendEntries().map((e) => ({ ...e, n: m.get(e.key) ?? 0 })).filter((e) => e.n > 0)
})
// Boxes with almost no LiDAR support are where labels are most often wrong or invisible to the sensor.
const lowEvidence = computed(() => props.boxes.filter((b) => b.numLidarPts <= 5).length)
</script>

<template>
  <aside class="info" aria-label="Keyframe details">
    <h2>This keyframe</h2>
    <dl class="stats">
      <dt>LiDAR points</dt><dd>{{ pointCount.toLocaleString() }}</dd>
      <dt>Annotated objects</dt><dd>{{ boxes.length }}</dd>
      <dt>≤ 5 LiDAR points</dt><dd>{{ lowEvidence }}</dd>
      <dt v-if="loadMs !== undefined">Load + draw</dt><dd v-if="loadMs !== undefined">{{ loadMs.toFixed(0) }} ms</dd>
    </dl>
    <template v-if="selected">
      <h2>Selected object</h2>
      <dl class="stats selected">
        <dt>Class</dt><dd>{{ selected.category }}</dd>
        <dt>Distance</dt><dd>{{ distance(selected).toFixed(1) }} m</dd>
        <dt>Size (w × l × h)</dt><dd>{{ selected.size.map((v) => v.toFixed(1)).join(' × ') }} m</dd>
        <dt>LiDAR points</dt><dd :class="{ warn: selected.numLidarPts <= 5 }">{{ selected.numLidarPts }}</dd>
        <dt>Visibility</dt><dd>{{ selected.visibility }}</dd>
        <dt>Seen in</dt><dd>{{ seenIn?.length ? seenIn.map((c) => c.replace('CAM_', '').replace('_', ' ')).join(', ') : 'no camera' }}</dd>
      </dl>
    </template>
    <p v-else-if="selectedMissing" class="hint">The selected object is not annotated in this keyframe.</p>
    <h2>Objects by class</h2>
    <ul class="legend">
      <li v-for="e in counts" :key="e.key">
        <span class="swatch" :style="{ background: hex(e.color) }" />{{ e.label }}<span class="n">{{ e.n }}</span>
      </li>
    </ul>
  </aside>
</template>
