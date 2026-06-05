#!/usr/bin/env python3
"""Sharpen the RPG sprite sheets with the Real-ESRGAN anime model, in PURE
PyTorch (no basicsr/realesrgan — those break on modern torchvision).

For each sheet: AI-upscale the RGB 4x (smooth, de-blocked edges), upscale the
alpha smoothly, then save at 2x the original size (keeps the AI cleanup but
keeps file size sane). Same grid layout → the board renders the HD sheets with
no code change.

Usage: python3 scripts/upscale-rpg.py
"""
import glob
import os

import numpy as np
import torch
from PIL import Image
from torch import nn
from torch.nn import functional as F

HERE = os.path.dirname(__file__)
ROOT = os.path.join(HERE, "..", "public", "rpg")
MODEL_PATH = os.path.join(HERE, "RealESRGAN_x4plus_anime_6B.pth")
OUT_SCALE = 2  # final saved scale (AI runs at 4x, then downscaled to 2x)
TILE = 512
PAD = 16


# ── RRDBNet (Real-ESRGAN architecture), pure torch ──────────────────────────
class ResidualDenseBlock(nn.Module):
    def __init__(self, nf=64, gc=32):
        super().__init__()
        self.conv1 = nn.Conv2d(nf, gc, 3, 1, 1)
        self.conv2 = nn.Conv2d(nf + gc, gc, 3, 1, 1)
        self.conv3 = nn.Conv2d(nf + 2 * gc, gc, 3, 1, 1)
        self.conv4 = nn.Conv2d(nf + 3 * gc, gc, 3, 1, 1)
        self.conv5 = nn.Conv2d(nf + 4 * gc, nf, 3, 1, 1)
        self.l = nn.LeakyReLU(0.2, inplace=True)

    def forward(self, x):
        x1 = self.l(self.conv1(x))
        x2 = self.l(self.conv2(torch.cat((x, x1), 1)))
        x3 = self.l(self.conv3(torch.cat((x, x1, x2), 1)))
        x4 = self.l(self.conv4(torch.cat((x, x1, x2, x3), 1)))
        x5 = self.conv5(torch.cat((x, x1, x2, x3, x4), 1))
        return x5 * 0.2 + x


class RRDB(nn.Module):
    def __init__(self, nf, gc=32):
        super().__init__()
        self.rdb1 = ResidualDenseBlock(nf, gc)
        self.rdb2 = ResidualDenseBlock(nf, gc)
        self.rdb3 = ResidualDenseBlock(nf, gc)

    def forward(self, x):
        return self.rdb3(self.rdb2(self.rdb1(x))) * 0.2 + x


class RRDBNet(nn.Module):
    def __init__(self, in_ch=3, out_ch=3, nf=64, nb=6, gc=32):
        super().__init__()
        self.conv_first = nn.Conv2d(in_ch, nf, 3, 1, 1)
        self.body = nn.Sequential(*[RRDB(nf, gc) for _ in range(nb)])
        self.conv_body = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_up1 = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_up2 = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_hr = nn.Conv2d(nf, nf, 3, 1, 1)
        self.conv_last = nn.Conv2d(nf, out_ch, 3, 1, 1)
        self.l = nn.LeakyReLU(0.2, inplace=True)

    def forward(self, x):
        feat = self.conv_first(x)
        feat = feat + self.conv_body(self.body(feat))
        feat = self.l(self.conv_up1(F.interpolate(feat, scale_factor=2, mode="nearest")))
        feat = self.l(self.conv_up2(F.interpolate(feat, scale_factor=2, mode="nearest")))
        return self.conv_last(self.l(self.conv_hr(feat)))


def load_model():
    net = RRDBNet()
    ckpt = torch.load(MODEL_PATH, map_location="cpu")
    sd = ckpt.get("params_ema") or ckpt.get("params") or ckpt
    net.load_state_dict(sd, strict=True)
    net.eval()
    return net


@torch.no_grad()
def enhance_tiled(net, rgb):
    """rgb: float tensor (1,3,H,W) in [0,1] → 4x upscaled tensor. Every tile of
    every sheet is processed at full HD — bodies and costumes alike."""
    _, _, h, w = rgb.shape
    out = torch.zeros((1, 3, h * 4, w * 4))
    for y in range(0, h, TILE):
        for x in range(0, w, TILE):
            y0, x0 = max(0, y - PAD), max(0, x - PAD)
            y1, x1 = min(h, y + TILE + PAD), min(w, x + TILE + PAD)
            tile = rgb[:, :, y0:y1, x0:x1]
            up = net(tile).clamp(0, 1)
            # crop the padded margins from the upscaled tile
            cy0, cx0 = (y - y0) * 4, (x - x0) * 4
            ty1, tx1 = min(y + TILE, h), min(x + TILE, w)
            ch, cw = (ty1 - y) * 4, (tx1 - x) * 4
            out[:, :, y * 4 : y * 4 + ch, x * 4 : x * 4 + cw] = up[:, :, cy0 : cy0 + ch, cx0 : cx0 + cw]
    return out


def main():
    torch.set_num_threads(os.cpu_count() or 4)
    files = sorted(glob.glob(os.path.join(ROOT, "*.png"))) + sorted(glob.glob(os.path.join(ROOT, "kit", "*.png")))
    net = load_model()
    print(f"upscaling {len(files)} sheets (AI 4x → save {OUT_SCALE}x)…", flush=True)
    for i, f in enumerate(files, 1):
        im = Image.open(f).convert("RGBA")
        w, h = im.size
        arr = np.asarray(im).astype(np.float32) / 255.0
        rgb = torch.from_numpy(arr[:, :, :3]).permute(2, 0, 1).unsqueeze(0)
        up = enhance_tiled(net, rgb)[0].permute(1, 2, 0).numpy()  # (4h,4w,3)
        rgb_img = Image.fromarray((up * 255).round().astype(np.uint8), "RGB").resize((w * OUT_SCALE, h * OUT_SCALE), Image.LANCZOS)
        alpha = im.split()[3].resize((w * OUT_SCALE, h * OUT_SCALE), Image.LANCZOS)
        rgba = rgb_img.convert("RGBA")
        rgba.putalpha(alpha)
        rgba.save(f)
        print(f"  [{i}/{len(files)}] {os.path.basename(f)} -> {w*OUT_SCALE}x{h*OUT_SCALE}", flush=True)
    print("done.", flush=True)


if __name__ == "__main__":
    main()
