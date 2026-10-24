<script setup lang="ts">
import { computed } from 'vue'
import type { Box, CameraView } from '../types'
import { objectKey } from '../types'
import { categoryStyle } from '../categories'
import { boxCorners } from '../geometry'
import CameraTile from './CameraTile.vue'

const props = defineProps<{ cameras: CameraView[]; boxes: Box[]; selected?: string; showLidar: boolean }>()
const emit = defineEmits<{ pick: [key: string | undefined]; 'update:showLidar': [on: boolean] }>()

// Camera boxes carry only the per-keyframe annotation token; map it to the object key and colour.
const keyOf = computed(() => new Map(props.boxes.map((b) => [b.token, objectKey(b)])))
const colorOf = computed(() => new Map(props.boxes.map((b) => [b.token, categoryStyle(b.category).color])))
// Distance to a box's nearest corner, not its centre: a long truck's centre sits behind its visible front.
const distanceOf = computed(() => new Map(props.boxes.map((b) => [b.token, Math.min(...boxCorners(b).map((c) => Math.hypot(...c)))])))
</script>

<template>
  <section class="cams" aria-label="Camera views">
    <div class="cams-bar">
      <h2>Cameras</h2>
      <label><input type="checkbox" :checked="showLidar" @change="emit('update:showLidar', ($event.target as HTMLInputElement).checked)" /> LiDAR on images</label>
      <span class="hint">click a box in any view to select it everywhere · esc clears</span>
    </div>
    <div class="cams-grid">
      <CameraTile
        v-for="cam in cameras"
        :key="cam.channel"
        :cam="cam"
        :key-of="keyOf"
        :color-of="colorOf"
        :distance-of="distanceOf"
        :selected="selected"
        :show-lidar="showLidar"
        @pick="emit('pick', $event)"
      />
    </div>
  </section>
</template>
