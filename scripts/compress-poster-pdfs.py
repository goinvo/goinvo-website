"""
Shrink the poster PDFs that are too big to actually download.

Three of the free poster downloads on /vision/health-visualizations shipped at
print-plate size: design-axiom-make-things is 304.8 MB, care-card-healthcare-is-
a-human-right 70.6 MB, care-card-sugar-kills-2 31.3 MB. On a phone that is not a
slow download, it is a failed one, and these are the studio's give-it-away
artifacts.

The bulk is duplicated raster data, not detail: make-things carries the SAME
8963x13200 artwork three times (a 52.9 MB JPEG, a 97.4 MB Flate copy, and a
154.4 MB stream). A lossless rewrite reclaims nothing because every byte is
referenced, so the fix is to flatten each page to a single JPEG at a sane
resolution and rebuild the page around it. Flattening (rather than dropping the
duplicate objects) is deliberate: it renders masks and overprint exactly as a
viewer shows them, so we cannot silently lose a transparency layer.

Fidelity is then PROVEN, not eyeballed: both versions are rasterised at a common
resolution and compared per pixel. A rebuild that drifts is rejected.

    python scripts/compress-poster-pdfs.py --src C:/tmp/posters --out public/pdf/vision/posters
"""
import argparse
import os
import sys

import pymupdf

# Long edge of the flattened raster. 6600 px keeps a 24x36 in reprint above
# 180 DPI, which is past the point a poster reads as soft, while cutting the
# largest file by ~20x. The studio sells the true print; this is the free copy.
MAX_LONG_EDGE = 6600
JPEG_QUALITY = 85

# Rasterise both versions to this long edge to compare them. Small enough to
# hold two pixmaps at once, large enough that a dropped layer or a shifted
# element is unmissable.
COMPARE_LONG_EDGE = 1400
# Mean per-channel difference, 0-255. Requantising to JPEG moves pixels a little;
# losing a mask or a layer moves them a lot.
MAX_MEAN_DIFF = 3.0


def render(page, long_edge):
    scale = long_edge / max(page.rect.width, page.rect.height)
    return page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), colorspace=pymupdf.csRGB, alpha=False)


def mean_difference(a, b):
    """Mean absolute per-channel difference between two same-size pixmaps."""
    if (a.width, a.height) != (b.width, b.height):
        return float("inf")
    sa, sb = a.samples, b.samples
    step = max(1, len(sa) // 3_000_000)  # sample large pages rather than stall
    total = count = 0
    for i in range(0, len(sa), step):
        total += abs(sa[i] - sb[i])
        count += 1
    return total / max(count, 1)


def compress(path, out_path):
    source = pymupdf.open(path)
    rebuilt = pymupdf.open()

    for page in source:
        raster = render(page, MAX_LONG_EDGE)
        new_page = rebuilt.new_page(width=page.rect.width, height=page.rect.height)
        new_page.insert_image(new_page.rect, stream=raster.tobytes("jpeg", jpg_quality=JPEG_QUALITY))

    rebuilt.save(out_path, garbage=4, deflate=True, clean=True)

    worst = 0.0
    check = pymupdf.open(out_path)
    for index, page in enumerate(source):
        worst = max(worst, mean_difference(render(page, COMPARE_LONG_EDGE), render(check[index], COMPARE_LONG_EDGE)))
    check.close()
    source.close()
    rebuilt.close()
    return worst


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--src", required=True, help="directory of downloaded originals")
    parser.add_argument("--out", required=True, help="directory to write compressed PDFs into")
    args = parser.parse_args()

    os.makedirs(args.out, exist_ok=True)
    failures = []

    for name in sorted(os.listdir(args.src)):
        if not name.endswith(".pdf") or name.endswith("-lossless.pdf"):
            continue
        source_path = os.path.join(args.src, name)
        out_path = os.path.join(args.out, name)
        before = os.path.getsize(source_path) / 1048576

        drift = compress(source_path, out_path)
        after = os.path.getsize(out_path) / 1048576
        verdict = "ok" if drift <= MAX_MEAN_DIFF else "DRIFTED"
        if drift > MAX_MEAN_DIFF:
            failures.append(f"{name}: mean pixel difference {drift:.2f} exceeds {MAX_MEAN_DIFF}")
        print(f"  {name}\n      {before:7.1f} MB -> {after:6.1f} MB  ({before / max(after, 0.01):.0f}x)   pixel drift {drift:.2f}  {verdict}")

    if failures:
        print("\nFAILED fidelity check:")
        for failure in failures:
            print(f"  {failure}")
        sys.exit(1)


if __name__ == "__main__":
    main()
