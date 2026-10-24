<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import type { DatasetIndex, Sample } from './types'
import { objectKey } from './types'
import { loadIndex, loadPoints, loadSample, prefetch } from './data'
import SceneList from './components/SceneList.vue'
import PointCloudView from './components/PointCloudView.vue'
import Timeline from './components/Timeline.vue'
import InfoPanel from './components/InfoPanel.vue'
import CameraGrid from './components/CameraGrid.vue'

const index = shallowRef<DatasetIndex>()
const sceneToken = ref<string>()
const keyframe = ref(0)
const sample = shallowRef<Sample>()
const firstSample = shallowRef<Sample>()
const points = shallowRef<Float32Array>()
const loadMs = ref<number>()
const error = ref<string>()
const selected = ref<string>() // object key (instance): survives keyframe changes
const showLidar = ref(false)
let request = 0 // drops responses that arrive after the user has moved on

const scene = computed(() => index.value?.scenes.find((s) => s.token === sceneToken.value))
const selectedBox = computed(() => sample.value?.boxes.find((b) => objectKey(b) === selected.value))
const seenIn = computed(() => {
  const b = selectedBox.value
  return b ? (sample.value?.cameras ?? []).filter((c) => c.boxes.some((cb) => cb.token === b.token)).map((c) => c.channel) : []
})
function pick(key: string | undefined) { selected.value = key }
function onKey(e: KeyboardEvent) { if (e.key === 'Escape') selected.value = undefined }
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

async function show(i: number) {
  const s = scene.value
  if (!s) return
  const id = ++request
  keyframe.value = i
  const t0 = performance.now()
  try {
    const smp = await loadSample(s.samples[i])
    const pts = await loadPoints(smp.lidar.file)
    if (id !== request) return
    sample.value = smp
    points.value = pts
    requestAnimationFrame(() => { if (id === request) loadMs.value = performance.now() - t0 })
    prefetch(s.samples.slice(i + 1, i + 4))
  } catch (e) {
    error.value = (e as Error).message
  }
}

async function selectScene(token: string) {
  sceneToken.value = token
  selected.value = undefined
  const s = scene.value!
  firstSample.value = await loadSample(s.samples[0])
  await show(0)
}

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  try {
    index.value = await loadIndex()
    if (index.value.scenes.length) await selectScene(index.value.scenes[0].token)
  } catch (e) {
    error.value = (e as Error).message
  }
})
</script>

<template>
  <div class="app">
    <header>
      <h1>nuScenes Scene Explorer</h1>
      <span v-if="index" class="dataset">{{ index.dataset }}</span>
      <span v-if="index?.synthetic" class="synthetic">Synthetic demo data, not nuScenes</span>
    </header>
    <p v-if="error" class="error" role="alert">{{ error }}</p>
    <main v-else-if="index">
      <SceneList :scenes="index.scenes" :active="sceneToken" @select="selectScene" />
      <section class="stage">
        <PointCloudView :points="points" :boxes="sample?.boxes" :selected="selected" @pick="pick" />
        <CameraGrid
          v-if="sample?.cameras?.length"
          v-model:show-lidar="showLidar"
          :cameras="sample.cameras"
          :boxes="sample.boxes"
          :selected="selected"
          @pick="pick"
        />
        <Timeline
          v-if="scene"
          :count="scene.samples.length"
          :index="keyframe"
          :timestamp="sample?.timestamp"
          :start-timestamp="firstSample?.timestamp"
          @seek="show"
        />
      </section>
      <InfoPanel
        :boxes="sample?.boxes ?? []"
        :point-count="points ? points.length / 4 : 0"
        :load-ms="loadMs"
        :selected="selectedBox"
        :seen-in="seenIn"
        :selected-missing="selected !== undefined && !selectedBox"
      />
    </main>
    <p v-else class="loading">Loading dataset…</p>
    <footer>Data: <a href="https://www.nuscenes.org" target="_blank" rel="noopener">nuScenes</a> by Motional, CC BY-NC-SA 4.0 (non-commercial). This project is not affiliated with Motional.</footer>
  </div>
</template>
