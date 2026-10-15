"""Generates Spotto's app icons and splash screens. Run from the repo root: python scripts/make_icons.py (needs Pillow)."""
import glob
import math
import os
from PIL import Image, ImageDraw

FELT, FELT_LIGHT = (18, 60, 58), (30, 90, 85)
CARD, SUN, CORAL, TEAL, SKY = (253, 253, 251), (246, 196, 69), (232, 80, 91), (0, 184, 169), (63, 167, 214)
SS = 4  # supersampling for smooth edges


def felt(size, w=None, h=None):
    w, h = w or size, h or size
    img = Image.new("RGB", (w, h), FELT)
    d = ImageDraw.Draw(img)
    r = int(math.hypot(w, h) / 2)
    for i in range(r, 0, -4):  # radial gradient, lighter in the middle
        t = i / r
        c = tuple(int(FELT_LIGHT[k] * (1 - t) + FELT[k] * t) for k in range(3))
        d.ellipse([w / 2 - i, h * 0.45 - i, w / 2 + i, h * 0.45 + i], fill=c)
    return img.convert("RGBA")


def star(cx, cy, r, points=5):
    pts = []
    for i in range(points * 2):
        rad = r if i % 2 == 0 else r * 0.45
        a = -math.pi / 2 + i * math.pi / points
        pts.append((cx + rad * math.cos(a), cy + rad * math.sin(a)))
    return pts


def card_layer(size, scale):
    """Transparent square with the card (radius = scale * size / 2) in the middle."""
    S = size * SS
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c, R = S / 2, scale * S / 2
    ring = R * 0.11
    d.ellipse([c - R - ring * 0.2, c - R + ring * 0.9, c + R + ring * 0.2, c + R + ring * 1.6], fill=(0, 0, 0, 70))  # shadow
    d.ellipse([c - R, c - R, c + R, c + R], fill=SUN)
    d.ellipse([c - R + ring, c - R + ring, c + R - ring, c + R - ring], fill=CARD)
    u = R / 10
    d.ellipse([c - 6.2 * u, c - 5.6 * u, c - 1.2 * u, c - 0.6 * u], fill=CORAL)                     # dot
    d.polygon(star(c + 3.0 * u, c - 2.4 * u, 3.7 * u), fill=SUN)                                    # star
    d.polygon([(c - 3.4 * u, c + 6.0 * u), (c + 0.4 * u, c + 0.4 * u), (c + 4.2 * u, c + 6.0 * u)], fill=TEAL)  # triangle
    d.polygon([(c + 5.6 * u, c + 1.6 * u), (c + 7.2 * u, c + 3.4 * u), (c + 5.6 * u, c + 5.2 * u), (c + 4.0 * u, c + 3.4 * u)], fill=SKY)  # diamond
    return img.resize((size, size), Image.LANCZOS)


def icon(size, scale=0.78, shape="square"):
    img = felt(size)
    img.alpha_composite(card_layer(size, scale))
    if shape == "round":
        mask = Image.new("L", (size * SS, size * SS), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, size * SS - 1, size * SS - 1], fill=255)
        img.putalpha(mask.resize((size, size), Image.LANCZOS))
    elif shape == "rounded":
        mask = Image.new("L", (size * SS, size * SS), 0)
        ImageDraw.Draw(mask).rounded_rectangle([0, 0, size * SS - 1, size * SS - 1], radius=size * SS * 0.22, fill=255)
        img.putalpha(mask.resize((size, size), Image.LANCZOS))
    return img


def splash(w, h):
    img = felt(0, w, h)
    s = int(min(w, h) * 0.42)
    layer = card_layer(s, 0.78)
    img.alpha_composite(layer, ((w - s) // 2, int(h * 0.45 - s / 2)))
    return img.convert("RGB")


os.makedirs("public/icons", exist_ok=True)
icon(192).convert("RGB").save("public/icons/icon-192.png", optimize=True)
icon(512).convert("RGB").save("public/icons/icon-512.png", optimize=True)
icon(512, scale=0.62).convert("RGB").save("public/icons/maskable-512.png", optimize=True)  # inside the 80% safe zone
icon(180).convert("RGB").save("public/icons/apple-touch-icon.png", optimize=True)
icon(64, shape="rounded").save("public/icons/favicon-64.png", optimize=True)

res = "android/app/src/main/res"
for f in glob.glob(f"{res}/mipmap-*/ic_launcher.png"):
    n = Image.open(f).size[0]; icon(n, shape="rounded").save(f, optimize=True)
for f in glob.glob(f"{res}/mipmap-*/ic_launcher_round.png"):
    n = Image.open(f).size[0]; icon(n, shape="round").save(f, optimize=True)
for f in glob.glob(f"{res}/mipmap-*/ic_launcher_foreground.png"):
    # Adaptive icons: 108dp canvas, launcher masks to the middle ~66dp, so keep the card small.
    n = Image.open(f).size[0]; card_layer(n, 0.56).save(f, optimize=True)
for f in glob.glob(f"{res}/drawable*/splash.png"):
    w, h = Image.open(f).size; splash(w, h).save(f, optimize=True)
print("done")
