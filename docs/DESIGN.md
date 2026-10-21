# Design notes

## Goals
1. Make one nuScenes keyframe legible in under a second: where the ego vehicle is, what is around it, and how much sensor evidence each label has.
2. Grow into an inspection tool for ML feedback loops: annotation QA (M3) and model-error review (M4).
3. Stay honest about data: synthetic fixtures are always labelled in the UI; no derived numbers are reported without a real nuScenes run.

## Decisions

| Decision | Why | Trade-off |
|---|---|---|
| Preprocess offline into per-keyframe JSON + float32 binaries | The browser should not parse nuScenes' relational tables or `.pcd.bin` layout; per-keyframe files allow lazy loading and caching | An extra step before running; output must stay local (license) |
| Keep everything in the LIDAR_TOP sensor frame | The devkit's `get_sample_data` already returns boxes in that frame; no pose maths in the browser for M1 | Cameras (M2) need their own calibrated transforms |
| Vue 3 + Pinia-free local state for M1 | One screen, a few pieces of state; a store adds ceremony before there is shared state | Move to Pinia when M2-M3 add cross-view selection and a review queue |
| One BufferGeometry for points, one LineSegments for all boxes | Two draw calls per frame regardless of object count; keyframe changes swap typed arrays | Per-box hover/selection needs a lookup (planned for M2) |
| Colour points by height | Separates ground from obstacles without intensity calibration | Intensity view is a toggle for later |
| Count boxes with ≤ 5 LiDAR points | Low-evidence labels are where annotation errors and invisible objects concentrate; seeds M3 | Threshold is a first guess, to be tuned on real data |
| Prefetch the next 3 keyframes | Smooth scrubbing and 2 Hz playback | A little extra bandwidth |

## Not yet measured
Load time, frame rate and memory on nuScenes-mini (≈ 34k points per keyframe). These go here and in the README once measured.
