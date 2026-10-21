<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ count: number; index: number; timestamp?: number; startTimestamp?: number }>()
const emit = defineEmits<{ seek: [index: number] }>()
const playing = ref(false)
let timer: number | undefined

function step(d: number) {
  emit('seek', Math.min(props.count - 1, Math.max(0, props.index + d)))
}
function toggle() {
  playing.value = !playing.value
}
// Keyframes are 2 Hz, so playback advances every 500 ms (real time).
watch(playing, (on) => {
  clearInterval(timer)
  if (on) timer = window.setInterval(() => {
    if (props.index >= props.count - 1) playing.value = false
    else step(1)
  }, 500)
})
function onKey(e: KeyboardEvent) {
  if ((e.target as HTMLElement).tagName === 'INPUT' && (e.target as HTMLInputElement).type === 'text') return
  if (e.key === 'ArrowRight') step(1)
  else if (e.key === 'ArrowLeft') step(-1)
  else if (e.key === ' ') { e.preventDefault(); toggle() }
}
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); clearInterval(timer) })

const seconds = () =>
  props.timestamp && props.startTimestamp ? ((props.timestamp - props.startTimestamp) / 1e6).toFixed(1) : '0.0'
</script>

<template>
  <div class="timeline">
    <button class="play" :aria-label="playing ? 'Pause' : 'Play'" @click="toggle">{{ playing ? 'Pause' : 'Play' }}</button>
    <input
      id="timeline-scrubber"
      type="range"
      min="0"
      :max="Math.max(0, count - 1)"
      :value="index"
      aria-label="Keyframe"
      @input="emit('seek', Number(($event.target as HTMLInputElement).value))"
    />
    <span class="readout">Keyframe {{ index + 1 }} / {{ count }} · {{ seconds() }} s</span>
    <span class="hint">← → step · space play</span>
  </div>
</template>
