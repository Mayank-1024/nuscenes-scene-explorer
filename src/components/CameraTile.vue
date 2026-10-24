<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { CameraView } from '../types'
import { BOX_EDGES, convexHull, insideConvex, polygonArea } from '../geometry'
import type { Vec2 } from '../geometry'
import { hex } from '../categories'
import { imageUrl, loadProjection } from '../data'

const props = defineProps<{
  cam: CameraView
  keyOf: Map<string, string> // annotation token -> object key (instance)
  colorOf: Map<string, number> // annotation token -> category colour
  distanceOf: Map<string, number> // annotation token -> distance from the car, m
  selected?: string
  showLidar: boolean
}>()
const emit = defineEmits<{ pick: [key: string | undefined] }>()

const canvas = ref<HTMLCanvasElement>()
const image = shallowRef<HTMLImageElement>()
const projected = shallowRef<Uint16Array>()
let resize: ResizeObserver | undefined

// Hulls of the projected corners, for click hit-testing in image pixels.
const hulls = computed(() => props.cam.boxes.map((b) => ({ token: b.token, hull: convexHull(b.corners as Vec2[]) })))

function load() {
  const src = imageUrl(props.cam.image)
  const img = new Image()
  img.onload = () => { if (img.src.endsWith(props.cam.image)) { image.value = img; draw() } }
  img.src = src
  projected.value = undefined
  if (props.cam.points && props.showLidar) loadProjection(props.cam.points).then((p) => { projected.value = p; draw() })
}

/** Depth colour: near points warm, far points cool, so occlusion and distance read at a glance. */
function depthColor(m: number): string {
  return `hsl(${50 + (Math.min(m, 50) / 50) * 230}, 95%, 58%)`
}

function draw() {
  const c = canvas.value
  if (!c) return
  const ctx = c.getContext('2d')!
  const sx = c.width / props.cam.width
  const sy = c.height / props.cam.height
  ctx.clearRect(0, 0, c.width, c.height)
  if (image.value) ctx.drawImage(image.value, 0, 0, c.width, c.height)

  if (props.showLidar && projected.value) {
    const p = projected.value
    const r = Math.max(1.2, c.width / 420)
    for (let i = 0; i < p.length; i += 3) {
      ctx.fillStyle = depthColor(p[i + 2] / 100)
      ctx.fillRect(p[i] * sx - r / 2, p[i + 1] * sy - r / 2, r, r)
    }
  }

  const dpr = c.width / c.clientWidth || 1
  for (const b of props.cam.boxes) {
    const isSel = props.selected !== undefined && props.keyOf.get(b.token) === props.selected
    ctx.globalAlpha = props.selected === undefined || isSel ? 1 : 0.35
    ctx.strokeStyle = isSel ? '#ffffff' : hex(props.colorOf.get(b.token) ?? 0xbdbdbd)
    ctx.lineWidth = (isSel ? 3 : 1.5) * dpr
    ctx.beginPath()
    for (const [a, z] of BOX_EDGES) {
      ctx.moveTo(b.corners[a][0] * sx, b.corners[a][1] * sy)
      ctx.lineTo(b.corners[z][0] * sx, b.corners[z][1] * sy)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

function fit() {
  const c = canvas.value
  if (!c) return
  const dpr = Math.min(window.devicePixelRatio, 2)
  c.width = Math.round(c.clientWidth * dpr)
  c.height = Math.round(c.clientWidth * (props.cam.height / props.cam.width) * dpr)
  draw()
}

function onClick(e: MouseEvent) {
  const c = canvas.value!
  const rect = c.getBoundingClientRect()
  const q: Vec2 = [((e.clientX - rect.left) / rect.width) * props.cam.width, ((e.clientY - rect.top) / rect.height) * props.cam.height]
  // Nearest object wins (what you see in front); among equally near ones, the smaller box.
  const far = (t: string) => props.distanceOf.get(t) ?? Infinity
  const hits = hulls.value.filter((h) => insideConvex(h.hull, q))
    .sort((a, b) => far(a.token) - far(b.token) || polygonArea(a.hull) - polygonArea(b.hull))
  emit('pick', hits.length ? props.keyOf.get(hits[0].token) : undefined)
}

onMounted(() => {
  resize = new ResizeObserver(fit)
  resize.observe(canvas.value!)
  load()
})
onBeforeUnmount(() => resize?.disconnect())
watch(() => props.cam, load)
watch(() => [props.selected, props.showLidar] as const, ([, lidar]) => {
  if (lidar && props.cam.points && !projected.value) load()
  else draw()
})
</script>

<template>
  <figure class="cam">
    <canvas ref="canvas" :aria-label="`${cam.channel} camera with projected boxes`" @click="onClick" />
    <figcaption>{{ cam.channel.replace('CAM_', '').replace('_', ' ') }}</figcaption>
  </figure>
</template>
