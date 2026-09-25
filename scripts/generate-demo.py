"""Generate a small illustrated sprite for testing without a webcam."""

from pathlib import Path
import json

from PIL import Image, ImageDraw, ImageFont


GRID = 7
FRAME = 240
SCALE = 2
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "demo"
OUTPUT.mkdir(parents=True, exist_ok=True)

sheet = Image.new("RGB", (GRID * FRAME * SCALE, GRID * FRAME * SCALE), "#e8eddf")
font = ImageFont.load_default(size=16 * SCALE)

for row in range(GRID):
    for column in range(GRID):
        image = Image.new("RGB", (FRAME * SCALE, FRAME * SCALE), "#e8eddf")
        draw = ImageDraw.Draw(image)
        x_direction = (column - 3) / 3
        y_direction = (row - 3) / 3
        dx = int(x_direction * 7 * SCALE)
        dy = int(y_direction * 5 * SCALE)

        def box(left, top, right, bottom):
            return tuple(value * SCALE for value in (left, top, right, bottom))

        draw.ellipse(box(36, 36, 204, 204), fill="#dce6ca")
        draw.ellipse(box(34, 168, 206, 284), fill="#567c72")
        draw.ellipse((64 * SCALE + dx, 43 * SCALE + dy, 176 * SCALE + dx, 187 * SCALE + dy),
                     fill="#e7b797", outline="#344332", width=3 * SCALE)
        draw.ellipse((65 * SCALE + dx, 91 * SCALE + dy, 81 * SCALE + dx, 119 * SCALE + dy), fill="#e7b797")
        draw.ellipse((159 * SCALE + dx, 91 * SCALE + dy, 175 * SCALE + dx, 119 * SCALE + dy), fill="#e7b797")

        draw.ellipse((73 * SCALE + dx, 126 * SCALE + dy, 91 * SCALE + dx, 139 * SCALE + dy), fill="#dc9d91")
        draw.ellipse((149 * SCALE + dx, 126 * SCALE + dy, 167 * SCALE + dx, 139 * SCALE + dy), fill="#dc9d91")

        for eye_x in (91, 149):
            eye_y = 109
            draw.arc(((eye_x - 10) * SCALE + dx, 84 * SCALE + dy,
                      (eye_x + 10) * SCALE + dx, 99 * SCALE + dy), 185, 350,
                     fill="#75594c", width=2 * SCALE)
            pupil_x = eye_x + int(x_direction * 7)
            pupil_y = eye_y + int(y_direction * 5)
            draw.ellipse(((pupil_x - 4) * SCALE + dx, (pupil_y - 4) * SCALE + dy,
                          (pupil_x + 4) * SCALE + dx, (pupil_y + 4) * SCALE + dy), fill="#344332")

        draw.arc((101 * SCALE + dx, 132 * SCALE + dy, 139 * SCALE + dx, 157 * SCALE + dy), 12, 168,
                 fill="#a75b5a", width=3 * SCALE)
        draw.text((13 * SCALE, 12 * SCALE), f"{row + 1}.{column + 1}", fill="#5a6f50", font=font)
        sheet.paste(image, (column * FRAME * SCALE, row * FRAME * SCALE))

sheet = sheet.resize((GRID * FRAME, GRID * FRAME), Image.Resampling.LANCZOS)
sheet.save(OUTPUT / "portrait-sprite.webp", "WEBP", quality=90)
(OUTPUT / "portrait-manifest.json").write_text(json.dumps({
    "version": 1,
    "rows": GRID,
    "columns": GRID,
    "frameWidth": FRAME,
    "frameHeight": FRAME,
    "spriteWidth": GRID * FRAME,
    "spriteHeight": GRID * FRAME,
    "image": "portrait-sprite.webp",
}, indent=2) + "\n")
