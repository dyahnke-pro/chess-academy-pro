"""Offline validation for per-video calibration.

The README lists "validation across themes" as not done, and warns why it
matters: *"a confidently wrong geometry produces confidently wrong positions."*
That validation cannot wait on YouTube — and it does not have to. What
calibration must survive is a change of board SIZE, ORIGIN, THEME and
ORIENTATION, and all four can be rendered here exactly, with the answer known.

These are synthetic boards, so they prove the geometry maths, NOT that a real
chess.com stream reads cleanly. Those are different claims and this file only
makes the first. A real video still has to earn its keep before any corpus is
positioned from it.

The negative controls matter as much as the positive ones. A calibrator that
never refuses is not a calibrator, it is a random-geometry generator: it would
return a plausible board for a talking-head shot and every position downstream
would be invented. So two of the cases below assert that calibration REFUSES.

Run: python3 scripts/video-align/test_calibrate.py
"""
import os
import sys
import tempfile

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from calibrate import calibrate  # noqa: E402

# (light square, dark square) — three real-world board themes plus a
# low-contrast one, since a washed-out stream is the case most likely to break
# an edge-transition detector.
THEMES = {
    'green': ((238, 238, 210), (118, 150, 86)),
    'brown': ((240, 217, 181), (181, 136, 99)),
    'blue': ((222, 227, 230), (140, 162, 173)),
    'lowcontrast': ((200, 200, 200), (168, 168, 168)),
}

START_ROWS = [('b', 8), ('b', 8), None, None, None, None, ('w', 8), ('w', 8)]


def render(path, size=(1280, 720), x0=280.0, y0=-3.0, sq=45.2,
           theme='green', flip=False, pieces=True, board=True):
    """Draw a board at a known geometry, optionally clipped by the frame edge.

    Pieces follow the physical model `read_board` relies on: a white piece
    contains pixels BRIGHTER than any square and a black piece pixels DARKER
    than any, each with a contrasting outline. That is the property the reader
    keys on, so honouring it here is what makes the fixture representative
    rather than merely pretty.
    """
    light, dark = THEMES[theme]
    img = Image.new('RGB', size, (28, 28, 32))
    d = ImageDraw.Draw(img)
    if not board:
        # A talking-head frame: some flat panels, no periodic structure.
        d.rectangle([100, 80, 700, 500], fill=(70, 66, 60))
        d.ellipse([300, 150, 520, 380], fill=(150, 130, 110))
        img.save(path)
        return

    for r in range(8):
        for c in range(8):
            x1, y1 = x0 + c * sq, y0 + r * sq
            d.rectangle([x1, y1, x1 + sq, y1 + sq],
                        fill=light if (r + c) % 2 == 0 else dark)
    if pieces:
        rows = list(reversed(START_ROWS)) if flip else START_ROWS
        for r, spec in enumerate(rows):
            if not spec:
                continue
            colour, _ = spec
            fill = (252, 252, 250) if colour == 'w' else (22, 22, 24)
            outline = (18, 18, 20) if colour == 'w' else (245, 245, 245)
            for c in range(8):
                cx, cy = x0 + (c + 0.5) * sq, y0 + (r + 0.5) * sq
                rad = sq * 0.30
                d.ellipse([cx - rad, cy - rad, cx + rad, cy + rad],
                          fill=fill, outline=outline, width=max(1, int(sq * 0.06)))
    img.save(path)


def frames(tmp, n=6, **kw):
    out = []
    for i in range(n):
        p = os.path.join(tmp, f'{kw.get("tag", "f")}_{i}.png')
        render(p, **{k: v for k, v in kw.items() if k != 'tag'})
        out.append(p)
    return out


def main():
    tmp = tempfile.mkdtemp()
    failures = []

    def check(name, cond, detail=''):
        print(f'{"PASS" if cond else "FAIL"}  {name}{"" if cond else "  -- " + detail}')
        if not cond:
            failures.append(name)

    # 1. GEOMETRY RECOVERY across sizes and origins, including a board clipped by
    #    the top edge (the pilot's real shape, y0 negative) and one that runs off
    #    the bottom.
    for tag, (x0, y0, sq) in {
        'pilot_clipped': (280.0, -3.0, 45.2),
        'small': (60.0, 40.0, 28.0),
        'large': (420.0, 10.0, 78.0),
        'offbottom': (150.0, 300.0, 62.0),
    }.items():
        got = calibrate(frames(tmp, 4, tag=tag, x0=x0, y0=y0, sq=sq))
        ok = (got is not None
              and abs(got['square'] - sq) <= 0.8
              and abs(got['x0'] - x0) <= 2.5
              and abs(got['y0'] - y0) <= 2.5)
        check(f'geometry {tag}', ok, f'wanted x={x0} y={y0} sq={sq}, got {got}')

    # 2. THEMES — the same geometry must come back regardless of board colours.
    for theme in THEMES:
        got = calibrate(frames(tmp, 4, tag=f'th_{theme}', theme=theme,
                               x0=200.0, y0=20.0, sq=52.0))
        ok = got is not None and abs(got['square'] - 52.0) <= 0.8
        check(f'theme {theme}', ok, f'got {got}')

    # 3. ORIENTATION — the case the README lists as unhandled. A flipped start
    #    position must read 'black', not silently mirror into 'white'.
    got = calibrate(frames(tmp, 4, tag='flip', flip=True, x0=200.0, y0=20.0, sq=52.0))
    check('orientation black-at-bottom', got is not None and got['orientation'] == 'black',
          f'got {got}')
    got = calibrate(frames(tmp, 4, tag='noflip', x0=200.0, y0=20.0, sq=52.0))
    check('orientation white-at-bottom', got is not None and got['orientation'] == 'white',
          f'got {got}')

    # 4. ABSTAIN on orientation when no frame shows the start position. Guessing
    #    here would mirror every square of a Black-side lesson.
    got = calibrate(frames(tmp, 4, tag='empty', pieces=False, x0=200.0, y0=20.0, sq=52.0))
    check('orientation abstains without a start frame',
          got is not None and got['orientation'] is None, f'got {got}')

    # 5. NEGATIVE CONTROL — no board at all must REFUSE, not invent geometry.
    got = calibrate(frames(tmp, 4, tag='noboard', board=False))
    check('refuses a frame with no board', got is None, f'got {got}')

    # 6. NEGATIVE CONTROL — frames that disagree must refuse. This is the scene
    #    -cut case, and averaging it would produce a geometry matching neither.
    mixed = (frames(tmp, 3, tag='mixA', x0=100.0, y0=20.0, sq=40.0)
             + frames(tmp, 3, tag='mixB', x0=400.0, y0=60.0, sq=70.0))
    got = calibrate(mixed)
    check('refuses disagreeing frames', got is None, f'got {got}')

    print()
    if failures:
        print(f'{len(failures)} FAILED: {", ".join(failures)}')
        return 1
    print('all calibration checks passed')
    return 0


if __name__ == '__main__':
    sys.exit(main())
