from pathlib import Path
import re
from io import BytesIO
from urllib.request import urlopen

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
PAGE = ROOT / "src/app/(main)/vision/health-visualizations/page.tsx"
OUTPUT = ROOT / ".audit/health-visualization-contact-sheets"
CLOUDFRONT = "https://dd17w042cevyt.cloudfront.net"
PATTERN = re.compile(
    r"\{ id: '([^']+)', title: '([^']+)', image: '([^']+)'"
)


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    name = "arialbd.ttf" if bold else "arial.ttf"
    return ImageFont.truetype(f"C:/Windows/Fonts/{name}", size)


entries = PATTERN.findall(PAGE.read_text(encoding="utf-8"))
if len(entries) != 31:
    raise RuntimeError(f"Expected 31 visualizations, found {len(entries)}")

OUTPUT.mkdir(parents=True, exist_ok=True)
cell_width, cell_height = 620, 440
columns, rows = 2, 4

for sheet_index in range((len(entries) + columns * rows - 1) // (columns * rows)):
    sheet = Image.new("RGB", (cell_width * columns, cell_height * rows), "white")
    draw = ImageDraw.Draw(sheet)
    start = sheet_index * columns * rows
    for local_index, (slug, title, image_path) in enumerate(
        entries[start : start + columns * rows]
    ):
        column = local_index % columns
        row = local_index // columns
        x, y = column * cell_width, row * cell_height
        draw.rectangle(
            (x, y, x + cell_width - 1, y + cell_height - 1),
            outline="#cfc9be",
            width=2,
        )
        draw.text(
            (x + 18, y + 14),
            f"{start + local_index + 1:02d}. {title}",
            fill="#1d1b1a",
            font=font(25, bold=True),
        )
        draw.text(
            (x + 18, y + 48),
            slug,
            fill="#6f6b6a",
            font=font(16),
        )
        source = ROOT / "public" / image_path.lstrip("/")
        image_source = (
            source
            if source.exists()
            else BytesIO(urlopen(f"{CLOUDFRONT}{image_path}", timeout=30).read())
        )
        with Image.open(image_source) as artwork:
            artwork = artwork.convert("RGB")
            artwork.thumbnail((cell_width - 36, cell_height - 98))
            image_x = x + (cell_width - artwork.width) // 2
            image_y = y + 82 + (cell_height - 92 - artwork.height) // 2
            sheet.paste(artwork, (image_x, image_y))

    sheet.save(OUTPUT / f"sheet-{sheet_index + 1}.jpg", quality=92)

print(f"Created {(len(entries) + columns * rows - 1) // (columns * rows)} contact sheets in {OUTPUT}")
