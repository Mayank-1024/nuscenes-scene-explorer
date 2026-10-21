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
  token: string // sample_annotation token
  category: string // full nuScenes category, e.g. "vehicle.car"
  center: [number, number, number]
  size: [number, number, number] // width, length, height (nuScenes wlh order)
  yaw: number // radians, rotation about z
  numLidarPts: number
  visibility: string // nuScenes visibility level, e.g. "v80-100"
}

export interface Sample {
  token: string
  timestamp: number // microseconds
  lidar: { file: string; count: number } // Float32 x,y,z,intensity per point
  boxes: Box[]
}
