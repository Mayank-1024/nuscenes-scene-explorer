import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Box } from '../types'
import { boxCorners, BOX_EDGES, headingSegment, heightToUnit } from '../geometry'
import { categoryStyle } from '../categories'

const RAMP = [new THREE.Color(0x2d3a8c), new THREE.Color(0x1fa2c7), new THREE.Color(0x9be15d), new THREE.Color(0xf9d423)]

function rampColor(t: number, out: THREE.Color): THREE.Color {
  const x = t * (RAMP.length - 1)
  const i = Math.min(RAMP.length - 2, Math.floor(x))
  return out.copy(RAMP[i]).lerp(RAMP[i + 1], x - i)
}

/**
 * Owns the Three.js scene. One BufferGeometry is reused for the point cloud and one for all box
 * edges, so changing keyframes rewrites typed arrays instead of allocating new scene objects.
 */
export class SceneRenderer {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private controls: OrbitControls
  private points: THREE.Points
  private boxes: THREE.LineSegments
  private resize: ResizeObserver
  private frame = 0

  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setClearColor(0x0e1116)
    host.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500)
    this.camera.up.set(0, 0, 1) // nuScenes sensor frames are z-up
    this.camera.position.set(-18, -28, 22)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.target.set(0, 4, 0)
    this.controls.enableDamping = true

    this.points = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ size: 0.08, vertexColors: true }))
    this.boxes = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ vertexColors: true }))
    this.scene.add(this.points, this.boxes, this.egoMarker(), new THREE.GridHelper(100, 20, 0x2a2f3a, 0x1b1f27).rotateX(Math.PI / 2))

    this.resize = new ResizeObserver(() => this.fit())
    this.resize.observe(host)
    this.fit()
    const loop = () => { this.frame = requestAnimationFrame(loop); this.controls.update(); this.renderer.render(this.scene, this.camera) }
    loop()
  }

  /** points: flat x, y, z, intensity. Colours by height so ground and obstacles separate at a glance. */
  setPoints(points: Float32Array): void {
    const n = Math.floor(points.length / 4)
    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)
    const c = new THREE.Color()
    for (let i = 0; i < n; i++) {
      pos[i * 3] = points[i * 4]; pos[i * 3 + 1] = points[i * 4 + 1]; pos[i * 3 + 2] = points[i * 4 + 2]
      rampColor(heightToUnit(points[i * 4 + 2]), c).toArray(col, i * 3)
    }
    this.replace(this.points.geometry, pos, col)
  }

  setBoxes(boxes: Box[], selected?: string): void {
    const segs = BOX_EDGES.length + 1 // edges + heading line
    const pos = new Float32Array(boxes.length * segs * 6)
    const col = new Float32Array(boxes.length * segs * 6)
    const c = new THREE.Color()
    let o = 0
    for (const b of boxes) {
      c.setHex(b.token === selected ? 0xffffff : categoryStyle(b.category).color)
      const k = boxCorners(b)
      const lines = [...BOX_EDGES.map(([a, z]) => [k[a], k[z]]), headingSegment(b)]
      for (const [p, q] of lines) {
        pos.set(p, o); pos.set(q, o + 3)
        c.toArray(col, o); c.toArray(col, o + 3)
        o += 6
      }
    }
    this.replace(this.boxes.geometry, pos, col)
  }

  dispose(): void {
    cancelAnimationFrame(this.frame)
    this.resize.disconnect()
    this.controls.dispose()
    this.points.geometry.dispose(); this.boxes.geometry.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  private replace(g: THREE.BufferGeometry, pos: Float32Array, col: Float32Array): void {
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    g.computeBoundingSphere()
  }

  private fit(): void {
    const { clientWidth: w, clientHeight: h } = this.host
    if (!w || !h) return
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  /** Small triangle at the sensor origin pointing forward (+y), so the ego heading is obvious. */
  private egoMarker(): THREE.Mesh {
    const shape = new THREE.Shape([new THREE.Vector2(0, 1.6), new THREE.Vector2(0.8, -0.8), new THREE.Vector2(-0.8, -0.8)])
    return new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshBasicMaterial({ color: 0xffffff }))
  }
}
