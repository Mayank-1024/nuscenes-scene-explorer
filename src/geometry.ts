import type { Box } from './types'

export type Vec3 = [number, number, number]

/**
 * The 8 corners of a nuScenes box, in the same order as the devkit's Box.corners():
 * first the 4 front corners (top-left, top-right, bottom-right, bottom-left), then the 4 rear ones.
 * Length runs along the box's local x axis (its heading), width along y, height along z.
 */
export function boxCorners(box: Pick<Box, 'center' | 'size' | 'yaw'>): Vec3[] {
  const [w, l, h] = box.size
  const xs = [1, 1, 1, 1, -1, -1, -1, -1].map((s) => (s * l) / 2)
  const ys = [1, -1, -1, 1, 1, -1, -1, 1].map((s) => (s * w) / 2)
  const zs = [1, 1, -1, -1, 1, 1, -1, -1].map((s) => (s * h) / 2)
  const c = Math.cos(box.yaw)
  const s = Math.sin(box.yaw)
  return xs.map((x, i) => [
    box.center[0] + c * x - s * ys[i],
    box.center[1] + s * x + c * ys[i],
    box.center[2] + zs[i],
  ])
}

/** Corner index pairs for the 12 edges of a box drawn as line segments. */
export const BOX_EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0], // front face
  [4, 5], [5, 6], [6, 7], [7, 4], // rear face
  [0, 4], [1, 5], [2, 6], [3, 7], // sides
]

/** Line from the box centre to the middle of its front face, so heading is visible. */
export function headingSegment(box: Pick<Box, 'center' | 'size' | 'yaw'>): [Vec3, Vec3] {
  const l = box.size[1]
  const front: Vec3 = [
    box.center[0] + Math.cos(box.yaw) * (l / 2),
    box.center[1] + Math.sin(box.yaw) * (l / 2),
    box.center[2],
  ]
  return [box.center, front]
}

/** Maps a height in metres to a 0-1 position on the colour ramp (ground ≈ 0, ~3 m above ≈ 1). */
export function heightToUnit(z: number, min = -2, max = 1.5): number {
  return Math.min(1, Math.max(0, (z - min) / (max - min)))
}

/**
 * Distance along a ray (origin + t * dir) to where it first enters a box, or null if it misses.
 * Slab test in the box's own frame: x along its length (heading), y across its width, z up.
 * If the origin is inside the box, returns the exit distance.
 */
export function rayBoxDistance(origin: Vec3, dir: Vec3, box: Pick<Box, 'center' | 'size' | 'yaw'>): number | null {
  const c = Math.cos(-box.yaw)
  const s = Math.sin(-box.yaw)
  const rot = (v: Vec3): Vec3 => [c * v[0] - s * v[1], s * v[0] + c * v[1], v[2]]
  const o = rot([origin[0] - box.center[0], origin[1] - box.center[1], origin[2] - box.center[2]])
  const d = rot(dir)
  const half = [box.size[1] / 2, box.size[0] / 2, box.size[2] / 2]
  let near = -Infinity
  let far = Infinity
  for (let k = 0; k < 3; k++) {
    if (Math.abs(d[k]) < 1e-12) {
      if (Math.abs(o[k]) > half[k]) return null
      continue
    }
    const t1 = (-half[k] - o[k]) / d[k]
    const t2 = (half[k] - o[k]) / d[k]
    near = Math.max(near, Math.min(t1, t2))
    far = Math.min(far, Math.max(t1, t2))
  }
  if (far < Math.max(near, 0)) return null
  return near >= 0 ? near : far
}

export type Vec2 = [number, number]

/** Convex hull (monotone chain), counter-clockwise, of a projected box's corners. */
export function convexHull(points: Vec2[]): Vec2[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (p.length < 3) return p
  const cross = (o: Vec2, a: Vec2, b: Vec2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const half = (pts: Vec2[]) => {
    const h: Vec2[] = []
    for (const q of pts) {
      while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop()
      h.push(q)
    }
    h.pop()
    return h
  }
  return [...half(p), ...half([...p].reverse())]
}

/** True if q is inside (or on) a convex polygon given counter-clockwise. */
export function insideConvex(poly: Vec2[], q: Vec2): boolean {
  if (poly.length < 3) return false
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    if ((b[0] - a[0]) * (q[1] - a[1]) - (b[1] - a[1]) * (q[0] - a[0]) < 0) return false
  }
  return true
}

/** Area of a simple polygon (shoelace), used to prefer the smallest box under a click. */
export function polygonArea(poly: Vec2[]): number {
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    a += p[0] * q[1] - q[0] * p[1]
  }
  return Math.abs(a) / 2
}
