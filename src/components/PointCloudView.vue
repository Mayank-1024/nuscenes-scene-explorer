<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Box } from '../types'
import { SceneRenderer } from '../viewer/SceneRenderer'

const props = defineProps<{ points?: Float32Array; boxes?: Box[] }>()
const host = ref<HTMLDivElement>()
let view: SceneRenderer | undefined

onMounted(() => {
  view = new SceneRenderer(host.value!)
  if (props.points) view.setPoints(props.points)
  if (props.boxes) view.setBoxes(props.boxes)
})
watch(() => props.points, (p) => p && view?.setPoints(p))
watch(() => props.boxes, (b) => b && view?.setBoxes(b))
onBeforeUnmount(() => view?.dispose())
</script>

<template>
  <div ref="host" class="viewer" aria-label="LiDAR point cloud with 3D boxes" />
</template>
