"""Hình giai đoạn 3 (mốc 23): rương chứa đồ.

Chạy:  python3 tools/draw_m23.py && python3 tools/pack_icons.py
Icon 16×16 → assets/Custom/proposals/storage.png
"""
from draw_proposals import Pix, rect, line, OUT


def storage():
    p = Pix()
    p.blob(rect(2, 6, 13, 14), '#a8703e', light='#c8904e', dark='#7a4a26')  # thân rương
    p.blob(rect(2, 3, 13, 6), '#c08048', light='#d8a060', dark='#8a5a30')  # nắp
    p.px(line(2, 7, 13, 7), '#5e3a20')  # khe nắp
    for x in (4, 11):
        p.px(line(x, 3, x, 14), '#6e6a60')  # đai sắt
    p.px([(7, 7), (8, 7), (7, 8), (8, 8), (7, 9), (8, 9)], '#e8c040')  # khóa đồng
    p.px([(7, 9), (8, 9)], '#a07820')
    p.outline().save('storage')


if __name__ == '__main__':
    storage()
    print('xong →', OUT)
