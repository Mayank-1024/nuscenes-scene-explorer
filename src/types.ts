// Browser-side data format written by preprocess/convert_nuscenes.py (and the synthetic generator).
// Everything is in the LIDAR_TOP sensor frame: x right, y forward, z up, metres.

export interface DatasetIndex {
  dataset: string // e.g. "v1.0-mini"
  synthetic: boolean // true only for the generated demo data
  scenes: SceneSummary[]
}

export interface SceneSummary {
  token: string
  name: string
  description: string
  samples: string[] // sample tokens in time order (2 Hz keyframes)
}

export interface Box {
  token: string // sample_annotation token (one per object per keyframe)
  instance?: string // instance token: the same physical object across keyframes
  category: string // full nuScenes category, e.g. "vehicle.car"
  center: [number, number, number]
  size: [number, number, number] // width, length, height (nuScenes wlh order)
  yaw: number // radians, rotation about z
  numLidarPts: number
  visibility: string // nuScenes visibility level, e.g. "v80-100"
}

/** One camera at this keyframe. Projections were computed offline with the devkit's calibration. */
export interface CameraView {
  channel: string // e.g. "CAM_FRONT"
  image: string // downscaled JPEG
  width: number // pixel size of that JPEG; all u, v below are in these pixels
  height: number
  points?: string // Uint16 u, v, depth (cm) per LiDAR point inside the image
  pointCount: number
  boxes: { token: string; corners: [number, number][] }[] // 8 projected corners, devkit order
}

export interface Sample {
  token: string
  timestamp: number // microseconds
  lidar: { file: string; count: number } // Float32 x,y,z,intensity per point
  boxes: Box[]
  cameras?: CameraView[] // absent in LiDAR-only exports and the synthetic fixture
}

/** The key that follows one object through the scene: instance when known, else the per-keyframe token. */
export const objectKey = (b: Pick<Box, 'token' | 'instance'>) => b.instance ?? b.token
