"""Write a small SYNTHETIC dataset in the app's format, so the viewer runs before nuScenes is downloaded.

Standard library only. The index is marked "synthetic": true and the app shows a banner saying so.
It is a development fixture, not nuScenes data, and must never be presented as real results.

Usage: python3 preprocess/make_synthetic_sample.py public/data
"""
import json
import math
import os
import random
import struct
import sys

random.seed(7)
OUT = sys.argv[1] if len(sys.argv) > 1 else "public/data"
CLASSES = [("vehicle.car", (1.9, 4.6, 1.7)), ("vehicle.truck", (2.5, 7.5, 3.0)), ("human.pedestrian.adult", (0.7, 0.7, 1.8)),
           ("movable_object.trafficcone", (0.4, 0.4, 0.8)), ("vehicle.bicycle", (0.6, 1.8, 1.3))]


def box_points(cx, cy, cz, w, l, h, yaw, n):
    """Random points on the box surface facing the sensor-ish, rotated by yaw."""
    out = []
    for _ in range(n):
        x, y, z = random.uniform(-l / 2, l / 2), random.uniform(-w / 2, w / 2), random.uniform(-h / 2, h / 2)
        side = random.choice([0, 1, 2])
        if side == 0: x = math.copysign(l / 2, x)
        elif side == 1: y = math.copysign(w / 2, y)
        else: z = h / 2
        out.append((cx + math.cos(yaw) * x - math.sin(yaw) * y, cy + math.sin(yaw) * x + math.cos(yaw) * y, cz + z, random.random()))
    return out


def ground(n):
    pts = []
    for _ in range(n):
        r, a = random.uniform(2, 45), random.uniform(0, 2 * math.pi)
        pts.append((r * math.cos(a), r * math.sin(a), -1.8 + random.gauss(0, 0.03), random.random() * 0.3))
    return pts


def main():
    os.makedirs(f"{OUT}/samples", exist_ok=True)
    os.makedirs(f"{OUT}/lidar", exist_ok=True)
    scenes = []
    for s in range(2):
        objects = []
        for i in range(14):
            cat, (w, l, h) = random.choice(CLASSES)
            objects.append({"cat": cat, "w": w, "l": l, "h": h, "x": random.uniform(-20, 20), "y": random.uniform(-10, 40),
                            "yaw": random.choice([0, math.pi / 2, math.pi]) + random.gauss(0, 0.1), "v": random.uniform(0, 1.2), "id": f"s{s}o{i}"})
        tokens = []
        for k in range(20):
            tok = f"synthetic-s{s}-k{k:02d}"
            pts, boxes = ground(9000), []
            for o in objects:
                cx, cy = o["x"] + math.cos(o["yaw"]) * o["v"] * k * 0.5, o["y"] + math.sin(o["yaw"]) * o["v"] * k * 0.5
                cz = -1.8 + o["h"] / 2
                dist = math.hypot(cx, cy)
                n = max(0, int(900 / max(dist, 3)) - (12 if o["cat"].startswith("movable") else 0))
                pts += box_points(cx, cy, cz, o["w"], o["l"], o["h"], o["yaw"], n)
                boxes.append({"token": f"{o['id']}-k{k}", "instance": o["id"], "category": o["cat"], "center": [round(cx, 3), round(cy, 3), round(cz, 3)],
                              "size": [o["w"], o["l"], o["h"]], "yaw": round(o["yaw"], 4), "numLidarPts": n, "visibility": "v80-100"})
            with open(f"{OUT}/lidar/{tok}.bin", "wb") as f:
                f.write(b"".join(struct.pack("<4f", *p) for p in pts))
            with open(f"{OUT}/samples/{tok}.json", "w") as f:
                json.dump({"token": tok, "timestamp": 1_700_000_000_000_000 + s * 10**9 + k * 500_000,
                           "lidar": {"file": f"lidar/{tok}.bin", "count": len(pts)}, "boxes": boxes}, f)
            tokens.append(tok)
        scenes.append({"token": f"synthetic-scene-{s}", "name": f"synthetic-{s:04d}",
                       "description": "Synthetic fixture: moving boxes over a flat ground ring", "samples": tokens})
    with open(f"{OUT}/index.json", "w") as f:
        json.dump({"dataset": "synthetic fixture", "synthetic": True, "scenes": scenes}, f)
    print(f"wrote {sum(len(s['samples']) for s in scenes)} synthetic keyframes to {OUT}")


if __name__ == "__main__":
    main()
