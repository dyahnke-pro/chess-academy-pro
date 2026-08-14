"""Frame -> occupancy grid, for every sampled second of a video.

Emits JSON the tracker consumes. Reads OCCUPANCY + COLOUR only; piece type is
deliberately not attempted, because the tracker gets it from the rules for free
and a six-class image problem is where board OCR usually breaks.
"""
import json
import os
import subprocess
import sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from read_board import read_board


def frames(video, out_dir, fps=0.5):
    subprocess.run(
        ['ffmpeg', '-loglevel', 'error', '-i', video, '-vf', f'fps={fps}',
         f'{out_dir}/f_%05d.png', '-y'],
        check=True,
    )


if __name__ == '__main__':
    video, out_dir, x0, y0, sq, fps = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), float(sys.argv[6])
    import os, glob
    os.makedirs(out_dir, exist_ok=True)
    frames(video, out_dir, fps)
    rows = []
    for i, f in enumerate(sorted(glob.glob(f'{out_dir}/f_*.png'))):
        grid = read_board(f, x0, y0, sq)
        rows.append({'t': round(i / fps, 1), 'grid': grid})
    json.dump(rows, open(f'{out_dir}/grids.json', 'w'))
    print(f'scanned {len(rows)} frames -> {out_dir}/grids.json')
