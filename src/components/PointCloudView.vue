<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Box } from '../types'
import { objectKey } from '../types'
import { SceneRenderer } from '../viewer/SceneRenderer'

const props = defineProps<{ points?: Float32Array; boxes?: Box[]; selected?: string }>()
const emit = defineEmits<{ pick: [key: string | undefined] }>()
const host = ref<HTMLDivElement>()
let view: SceneRenderer | undefined
let down: { x: number; y: number } | undefined

onMounted(() => {
  view = new SceneRenderer(host.value!)
  if (props.points) view.setPoints(props.points)
  if (props.boxes) view.setBoxes(props.boxes, props.selected)
})
watch(() => props.points, (p) => p && view?.setPoints(p))
watch(() => [props.boxes, props.selected] as const, ([b, sel]) => b && view?.setBoxes(b, sel))
onBeforeUnmount(() => view?.dispose())

// A click selects; a drag (orbiting the camera) does not.
function onDown(e: PointerEvent) { down = { x: e.clientX, y: e.clientY } }
function onUp(e: PointerEvent) {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) return
  const box = view?.pick(e.clientX, e.clientY)
  emit('pick', box ? objectKey(box) : undefined)
}
</script>

<template>
  <div ref="host" class="viewer" aria-label="LiDAR point cloud with 3D boxes" @pointerdown="onDown" @pointerup="onUp" />
</template>
