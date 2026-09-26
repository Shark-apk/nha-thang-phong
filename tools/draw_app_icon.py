"""Icon app (PWA): tự vẽ, không dùng hình Sprout Lands nên được để trong repo (pwa/).

Chạy:  python3 tools/draw_app_icon.py  → pwa/icon-192.png, pwa/icon-512.png, pwa/apple-touch-icon.png
Vẽ 32×32 điểm ảnh rồi phóng to không làm mờ.
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / 'pwa'
S = 32
im = Image.new('RGBA', (S, S), '#9bd4c3')
d = ImageDraw.Draw(im)
# đồi cỏ + luống đất
d.ellipse((-8, 17, 40, 44), fill='#7cb342')
d.ellipse((-8, 18, 40, 45), outline='#4f7a2e')
for i, y in enumerate((23, 26, 29)):
    d.rectangle((4 + i, y, 27 - i, y + 1), fill='#8a5a36')
# mái nhà
d.polygon([(6, 16), (16, 7), (26, 16)], fill='#c0563b')
d.line([(6, 16), (16, 7), (26, 16)], fill='#7e3322')
d.rectangle((9, 16, 23, 22), fill='#f4e7c8', outline='#8e5b3f')
d.rectangle((14, 18, 17, 22), fill='#8e5b3f')
d.rectangle((19, 17, 21, 19), fill='#ffd878')
# mầm cây
d.line([(27, 24), (27, 19)], fill='#3f7a2e')
d.ellipse((24, 16, 27, 19), fill='#8fd060')
d.ellipse((27, 15, 30, 18), fill='#8fd060')
for size, name in ((192, 'icon-192.png'), (512, 'icon-512.png'), (180, 'apple-touch-icon.png')):
    im.resize((size, size), Image.NEAREST).save(OUT / name)
print('xong →', OUT)
