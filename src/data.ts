import type { DatasetIndex, Sample } from './types'

// Files live under public/data/ (generated locally, never committed).
const BASE = `${import.meta.env.BASE_URL}data/`
const samples = new Map<string, Promise<Sample>>()
const clouds = new Map<string, Promise<Float32Array>>()
const projections = new Map<string, Promise<Uint16Array>>()

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path)
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status}). Run the converter or "npm run demo-data" first.`)
  return res.json() as Promise<T>
}

export const loadIndex = () => getJson<DatasetIndex>('index.json')

export function loadSample(token: string): Promise<Sample> {
  if (!samples.has(token)) samples.set(token, getJson<Sample>(`samples/${token}.json`))
  return samples.get(token)!
}

/** Point cloud as a flat Float32Array: x, y, z, intensity per point. Cached per file. */
export function loadPoints(file: string): Promise<Float32Array> {
  if (!clouds.has(file)) {
    clouds.set(file, fetch(BASE + file).then(async (res) => {
      if (!res.ok) throw new Error(`Could not load ${file} (${res.status}).`)
      return new Float32Array(await res.arrayBuffer())
    }))
  }
  return clouds.get(file)!
}

/** LiDAR points projected into one camera image: Uint16 u, v, depth (cm) per point. Cached per file. */
export function loadProjection(file: string): Promise<Uint16Array> {
  if (!projections.has(file)) {
    projections.set(file, fetch(BASE + file).then(async (res) => {
      if (!res.ok) throw new Error(`Could not load ${file} (${res.status}).`)
      return new Uint16Array(await res.arrayBuffer())
    }))
  }
  return projections.get(file)!
}

export const imageUrl = (file: string) => BASE + file

/** Warms the cache for the next few keyframes so scrubbing and playback stay smooth. */
export function prefetch(tokens: string[]): void {
  for (const t of tokens) {
    loadSample(t).then((s) => {
      loadPoints(s.lidar.file)
      for (const c of s.cameras ?? []) new Image().src = imageUrl(c.image)
    }).catch(() => undefined)
  }
}
