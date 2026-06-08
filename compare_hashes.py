import hashlib
import os
import json

def compute_hash(filepath, algorithm="sha256"):
    h = hashlib.new(algorithm)
    try:
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                h.update(chunk)
        return h.hexdigest()
    except Exception as e:
        return "ERROR: " + str(e)

duplicates = [
    "01.mp4", "02.mp4", "1.jpg", "1.mp4", "1.mp4_thumbs_[2025.11.03_17.08.31].jpg",
    "1.png", "10.mp4", "10.mp4_thumbs_[2025.11.03_17.11.36].jpg", "11.mp4",
    "11.mp4_thumbs_[2025.11.03_17.11.55].jpg", "12.mp4", "12.mp4_thumbs_[2025.11.03_17.12.11].jpg",
    "13.mp4", "13.mp4_thumbs_[2025.11.03_17.12.30].jpg", "14.mp4",
    "14.mp4_thumbs_[2025.11.03_17.12.47].jpg", "15.mp4", "15.mp4_thumbs_[2025.11.03_17.13.04].jpg",
    "2.jpg", "2.mp4", "2.mp4_thumbs_[2025.11.03_17.08.55].jpg", "3.mp4",
    "3.mp4_thumbs_[2025.11.03_17.09.14].jpg"
]

results = {"D": {}, "E": {}}

for drive, root in [("D", "D:/Series"), ("E", "E:/Downloads")]:
    for fname in duplicates:
        filepath = os.path.join(root, fname)
        if os.path.exists(filepath):
            h = compute_hash(filepath)
            size = os.path.getsize(filepath)
            results[drive][fname] = {"hash": h, "size": size, "path": filepath}
        else:
            results[drive][fname] = {"hash": "NOT_FOUND", "size": 0, "path": filepath}

print(json.dumps(results, ensure_ascii=False, indent=2))