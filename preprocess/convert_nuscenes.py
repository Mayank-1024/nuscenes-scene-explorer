"""Convert a nuScenes split into the small per-keyframe files the browser app loads.

Usage:
    pip install -r preprocess/requirements.txt
    python preprocess/convert_nuscenes.py --dataroot /path/to/nuscenes --version v1.0-mini --out public/data

Output (all in the LIDAR_TOP sensor frame: x right, y forward, z up, metres):
    index.json                 scenes and their keyframe (sample) tokens in time order
    samples/<token>.json       timestamp, point-cloud file, and the 3D boxes for that keyframe
    lidar/<token>.bin          float32 x, y, z, intensity per point

nuScenes is licensed CC BY-NC-SA 4.0 (non-commercial). Keep the output local; never commit it.
"""
import argparse
import json
import os
import time

import numpy as np
from nuscenes.nuscenes import NuScenes
from nuscenes.utils.data_classes import LidarPointCloud


def convert(dataroot: str, version: str, out: str) -> None:
    nusc = NuScenes(version=version, dataroot=dataroot, verbose=False)
    os.makedirs(os.path.join(out, "samples"), exist_ok=True)
    os.makedirs(os.path.join(out, "lidar"), exist_ok=True)
    visibility = {v["token"]: v["level"] for v in nusc.visibility}
    scenes, n_points, n_boxes, started = [], 0, 0, time.time()

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
                    "category": ann["category_name"],
                    "center": [round(float(v), 3) for v in box.center],
                    "size": [round(float(v), 3) for v in box.wlh],
                    "yaw": round(float(box.orientation.yaw_pitch_roll[0]), 4),
                    "numLidarPts": int(ann["num_lidar_pts"]),
                    "visibility": visibility.get(ann["visibility_token"], "unknown"),
                })

            with open(os.path.join(out, "samples", f"{token}.json"), "w") as f:
                json.dump({"token": token, "timestamp": sample["timestamp"],
                           "lidar": {"file": f"lidar/{token}.bin", "count": int(len(pts))},
                           "boxes": out_boxes}, f)
            tokens.append(token)
            n_points += len(pts)
            n_boxes += len(out_boxes)
            token = sample["next"]

        scenes.append({"token": scene["token"], "name": scene["name"],
                       "description": scene["description"], "samples": tokens})

    with open(os.path.join(out, "index.json"), "w") as f:
        json.dump({"dataset": version, "synthetic": False, "scenes": scenes}, f)
    keyframes = sum(len(s["samples"]) for s in scenes)
    print(f"{len(scenes)} scenes, {keyframes} keyframes, {n_points:,} points, {n_boxes:,} boxes "
          f"in {time.time() - started:.1f} s -> {out}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--dataroot", required=True, help="folder containing v1.0-mini/, samples/, sweeps/")
    ap.add_argument("--version", default="v1.0-mini")
    ap.add_argument("--out", default="public/data")
    a = ap.parse_args()
    convert(a.dataroot, a.version, a.out)
