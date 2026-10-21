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
