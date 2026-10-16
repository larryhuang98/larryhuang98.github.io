#!/usr/bin/env python3
"""Render the original zh. monogram as SVG, PNG, and a multi-size favicon.

Requires Pillow. All lettering is drawn from the same geometric paths;
no font files or external artwork are used.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
BLUE = '#28639c'
INK = '#f8fafb'
DOT = '#b7d7ee'
STROKE = 6.5


def bezier(a, b, c, d, count=80):
    return [tuple((1-t)**3*a[k] + 3*(1-t)**2*t*b[k] +
                  3*(1-t)*t*t*c[k] + t**3*d[k] for k in (0, 1))
            for t in (i/count for i in range(count+1))]


Z = [(10, 25), (27, 25), (10, 44), (27, 44)]
H = [(35, 15), (35, 44)]
ARCH = bezier((35, 34), (35, 23), (51, 23), (51, 34)) + [(51, 44)]


def render(size, rounded=True):
    factor = 8
    scale = size * factor / 64
    canvas = Image.new('RGBA', (size*factor, size*factor))
    draw = ImageDraw.Draw(canvas)
    box = (0, 0, size*factor, size*factor)
    if rounded:
        draw.rounded_rectangle(box, radius=14*scale, fill=BLUE)
    else:
        draw.rectangle(box, fill=BLUE)
    radius = STROKE*scale/2
    for points in (Z, H, ARCH):
        scaled = [(x*scale, y*scale) for x, y in points]
        draw.line(scaled, fill=INK, width=round(STROKE*scale), joint='curve')
        # Explicit round joins and caps agree with the SVG stroke rendering.
        for x, y in scaled:
            draw.ellipse((x-radius, y-radius, x+radius, y+radius), fill=INK)
    x, y, r = 58*scale, 44*scale, 3.2*scale
    draw.ellipse((x-r, y-r, x+r, y+r), fill=DOT)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def main():
    media = ROOT / 'assets/media'
    static = ROOT / 'static'
    media.mkdir(parents=True, exist_ok=True)
    static.mkdir(parents=True, exist_ok=True)
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-labelledby="title">
  <title id="title">Zhen Huang monogram</title>
  <rect width="64" height="64" rx="14" fill="{BLUE}"/>
  <g fill="none" stroke="{INK}" stroke-width="{STROKE}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 25H27L10 44H27"/>
    <path d="M35 15V44M35 34C35 23 51 23 51 34V44"/>
  </g>
  <circle cx="58" cy="44" r="3.2" fill="{DOT}"/>
</svg>
'''
    (media / 'icon.svg').write_text(svg)
    # An opaque square lets operating systems apply their own launcher mask.
    render(512, rounded=False).save(media / 'icon.png')
    sizes = [16, 32, 48, 64]
    icons = [render(size) for size in sizes]
    icons[-1].save(static / 'favicon.ico', format='ICO',
                   append_images=icons[:-1], sizes=[(s, s) for s in sizes])
    for size in (16, 32, 48):
        render(size).save(static / f'favicon-{size}.png')
    print('Generated SVG, 512px PNG, and 16/32/48/64px ICO.')


if __name__ == '__main__':
    main()
