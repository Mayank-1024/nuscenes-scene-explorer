"""Convert a nuScenes split into the small per-keyframe files the browser app loads.

Usage:
    pip install -r preprocess/requirements.txt
    python preprocess/convert_nuscenes.py --dataroot /path/to/nuscenes --version v1.0-mini --out public/data

Output (3D data in the LIDAR_TOP sensor frame: x right, y forward, z up, metres):
    index.json                 scenes and their keyframe (sample) tokens in time order
    samples/<token>.json       timestamp, point-cloud file, the 3D boxes, and the six camera views
    lidar/<token>.bin          float32 x, y, z, intensity per point
    cams/<token>.jpg           each camera image, downscaled to --cam-width
    proj/<token>.bin           uint16 u, v, depth (cm) per LiDAR point that lands in that camera image

Camera projections (box corners and LiDAR points into each image) are computed with the devkit's own
calibration chain, so the browser never does pose maths. Use --no-cameras for a LiDAR-only export.

nuScenes is licensed CC BY-NC-SA 4.0 (non-commercial). Keep the output local; never commit it.
"""
import argparse
import json
import os
import time

import numpy as np
from PIL import Image
from nuscenes.nuscenes import NuScenes
from nuscenes.utils.data_classes import LidarPointCloud
from nuscenes.utils.geometry_utils import BoxVisibility, view_points

CAMERAS = ["CAM_FRONT_LEFT", "CAM_FRONT", "CAM_FRONT_RIGHT", "CAM_BACK_LEFT", "CAM_BACK", "CAM_BACK_RIGHT"]
MIN_DEPTH = 0.1  # a box with any corner closer than this to the image plane is dropped, not clipped


def camera_view(nusc: NuScenes, dataroot: str, lidar_sd: str, cam_sd: str, out: str, width: int) -> dict:
    sd = nusc.get("sample_data", cam_sd)
    scale = width / sd["width"]
    height = round(sd["height"] * scale)

    Image.open(os.path.join(dataroot, sd["filename"])).resize((width, height), Image.BILINEAR) \
        .save(os.path.join(out, "cams", f"{cam_sd}.jpg"), quality=80)

    # Boxes already transformed into this camera's frame; project all 8 corners with the intrinsics.
    _, boxes, K = nusc.get_sample_data(cam_sd, box_vis_level=BoxVisibility.ANY)
    out_boxes = []
    for box in boxes:
        corners = box.corners()
        if corners[2].min() < MIN_DEPTH:
            continue
        uv = view_points(corners, np.array(K), normalize=True)[:2] * scale
        out_boxes.append({"token": box.token,
                          "corners": [[round(float(u), 1), round(float(v), 1)] for u, v in uv.T]})

    # LiDAR points that land in the image, with their depth: the evidence a camera detection can be checked against.
    pts, depth, _ = nusc.explorer.map_pointcloud_to_image(lidar_sd, cam_sd, min_dist=1.0)
    uvd = np.stack([pts[0] * scale, pts[1] * scale, np.minimum(depth * 100, 65535)]).T
    uvd.round().astype(np.uint16).tofile(os.path.join(out, "proj", f"{cam_sd}.bin"))

    return {"channel": sd["channel"], "image": f"cams/{cam_sd}.jpg", "width": width, "height": height,
            "points": f"proj/{cam_sd}.bin", "pointCount": int(uvd.shape[0]), "boxes": out_boxes}


def convert(dataroot: str, version: str, out: str, cameras: bool, cam_width: int) -> None:
    nusc = NuScenes(version=version, dataroot=dataroot, verbose=False)
    for sub in ("samples", "lidar") + (("cams", "proj") if cameras else ()):
        os.makedirs(os.path.join(out, sub), exist_ok=True)
    visibility = {v["token"]: v["level"] for v in nusc.visibility}
    scenes, n_points, n_boxes, n_images, started = [], 0, 0, 0, time.time()

    for scene in nusc.scene:
        tokens, token = [], scene["first_sample_token"]
        while token:
            sample = nusc.get("sample", token)
            lidar_sd = sample["data"]["LIDAR_TOP"]
            sd = nusc.get("sample_data", lidar_sd)

            # Points stay in the sensor frame; keep x, y, z, intensity (drop the ring index).
            pc = LidarPointCloud.from_file(os.path.join(dataroot, sd["filename"]))
            pts = pc.points[:4].T.astype(np.float32)
            pts.tofile(os.path.join(out, "lidar", f"{token}.bin"))

            # get_sample_data returns the annotations already transformed into this sensor's frame.
            _, boxes, _ = nusc.get_sample_data(lidar_sd)
            out_boxes = []
            for box in boxes:
                ann = nusc.get("sample_annotation", box.token)
                out_boxes.append({
                    "token": box.token,
                    "instance": ann["instance_token"],
                    "category": ann["category_name"],
                    "center": [round(float(v), 3) for v in box.center],
                    "size": [round(float(v), 3) for v in box.wlh],
                    "yaw": round(float(box.orientation.yaw_pitch_roll[0]), 4),
                    "numLidarPts": int(ann["num_lidar_pts"]),
                    "visibility": visibility.get(ann["visibility_token"], "unknown"),
                })

            record = {"token": token, "timestamp": sample["timestamp"],
                      "lidar": {"file": f"lidar/{token}.bin", "count": int(len(pts))},
                      "boxes": out_boxes}
            if cameras:
                record["cameras"] = [camera_view(nusc, dataroot, lidar_sd, sample["data"][c], out, cam_width)
                                     for c in CAMERAS]
                n_images += len(CAMERAS)
            with open(os.path.join(out, "samples", f"{token}.json"), "w") as f:
                json.dump(record, f)
            tokens.append(token)
            n_points += len(pts)
            n_boxes += len(out_boxes)
            token = sample["next"]

        scenes.append({"token": scene["token"], "name": scene["name"],
                       "description": scene["description"], "samples": tokens})

    with open(os.path.join(out, "index.json"), "w") as f:
        json.dump({"dataset": version, "synthetic": False, "scenes": scenes}, f)
    keyframes = sum(len(s["samples"]) for s in scenes)
    print(f"{len(scenes)} scenes, {keyframes} keyframes, {n_points:,} points, {n_boxes:,} boxes, "
          f"{n_images:,} camera images in {time.time() - started:.1f} s -> {out}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--dataroot", required=True, help="folder containing v1.0-mini/, samples/, sweeps/")
    ap.add_argument("--version", default="v1.0-mini")
    ap.add_argument("--out", default="public/data")
    ap.add_argument("--no-cameras", action="store_true", help="LiDAR and boxes only (M1 output)")
    ap.add_argument("--cam-width", type=int, default=640, help="width of the exported camera images, px")
    a = ap.parse_args()
    convert(a.dataroot, a.version, a.out, not a.no_cameras, a.cam_width)
