import { describe, expect, it } from 'vitest'
import { boxCorners, BOX_EDGES, headingSegment, heightToUnit } from './geometry'

const box = { center: [10, 5, 1] as [number, number, number], size: [2, 4, 1.5] as [number, number, number], yaw: 0 }

describe('boxCorners', () => {
  it('returns 8 corners centred on the box', () => {
    const c = boxCorners(box)
    expect(c).toHaveLength(8)
    const mean = [0, 1, 2].map((k) => c.reduce((s, p) => s + p[k], 0) / 8)
    mean.forEach((v, k) => expect(v).toBeCloseTo(box.center[k]))
  })

  it('puts length along the heading and width across it at yaw 0', () => {
    const c = boxCorners(box)
    expect(c[0][0]).toBeCloseTo(12) // front: centre x + l/2
    expect(c[4][0]).toBeCloseTo(8) // rear: centre x - l/2
    expect(Math.abs(c[0][1] - c[1][1])).toBeCloseTo(2) // width
    expect(c[0][2] - c[3][2]).toBeCloseTo(1.5) // height
  })

  it('rotates with yaw (90 degrees turns length onto the y axis)', () => {
    const c = boxCorners({ ...box, yaw: Math.PI / 2 })
    const front = (c[0][1] + c[1][1]) / 2
    expect(front).toBeCloseTo(box.center[1] + 2)
  })
})

describe('edges and heading', () => {
  it('has 12 unique edges over valid corner indices', () => {
    expect(BOX_EDGES).toHaveLength(12)
    expect(new Set(BOX_EDGES.map((e) => e.join('-'))).size).toBe(12)
    BOX_EDGES.flat().forEach((i) => expect(i).toBeGreaterThanOrEqual(0))
  })
  it('heading points to the front face', () => {
    const [, front] = headingSegment({ ...box, yaw: 0 })
    expect(front[0]).toBeCloseTo(12)
  })
})

describe('heightToUnit', () => {
  it('clamps to 0-1', () => {
    expect(heightToUnit(-10)).toBe(0)
    expect(heightToUnit(10)).toBe(1)
    expect(heightToUnit(-0.25)).toBeCloseTo(0.5)
  })
})
