"""Hình mốc 17: 16 cây trồng + 4 cây ăn trái mới, 5 máy + thành phẩm, phân tốt, phân hữu cơ, con sâu.

Chạy:  python3 tools/draw_m17.py && python3 tools/draw_crop_stages.py && python3 tools/pack_icons.py
"""
from draw_proposals import Pix, ellipse, rect, line, thick, round_fruit, long_veg, leafy, cluster, flower, OUT


def crops():
    leafy('che', '#4a8a3a', '#7ab04a')
    cluster('ca_phe', '#c0302a')
    cluster('ho_tieu', '#3a5a2a', n=((6, 6), (9, 6), (7, 8), (10, 8), (6, 10), (9, 10), (7, 12), (10, 12)))
    long_veg('mia', '#7a4a8a', top='#a4c263', width=1, stripes=[(6, 10), (8, 8), (10, 6)])
    cluster('nep_nuong', '#f0e0a0', n=((7, 4), (9, 5), (7, 7), (9, 8), (7, 10), (9, 11), (8, 13)))
    long_veg('mang_tay', '#78a158', top='#a8c878', width=1)
    p = Pix()  # nấm rơm
    for (x, y) in ((5, 9), (10, 10), (8, 7)):
        p.blob(ellipse(x, y, 3, 2), '#8a7a6a')
        p.blob(rect(x - 1, y + 1, x, y + 4), '#e8e0d0')
    p.outline().save('nam_rom')
    long_veg('muop_dang', '#5a9a3a', stripes=[(5, 11), (7, 9), (9, 7), (6, 10), (8, 8)])
    long_veg('muop', '#8ab04a', width=2)
    long_veg('dau_dua', '#6aa848', width=0)
    cluster('dau_phong', '#d0a870', n=((6, 7), (9, 7), (7, 10), (10, 10), (8, 13)))
    round_fruit('khoai_mon', '#9a8aa0', leaf=True, r=5)
    flower('sen', '#f2a6c0', '#f0d060', petals=6)
    round_fruit('ot_chuong', '#e0402a', leaf=True, r=5)
    long_veg('bi_dao', '#5a8a4a', width=3, stripes=[(6, 10), (9, 7)])
    leafy('rau_den', '#a83a5a', '#d05a7a')


def trees():
    p = Pix()  # sầu riêng: gai
    p.blob(ellipse(8, 9, 5.5, 5.5), '#8aa040')
    for (x, y) in ((4, 6), (8, 4), (12, 7), (5, 12), (11, 12), (8, 9), (6, 9), (10, 10)):
        p.px([(x, y)], '#5a7020')
    p.px(line(8, 2, 8, 4), '#67835c')
    p.outline().save('sau_rieng')
    round_fruit('dua', '#8a5a36', leaf=False, r=6, spot=([(6, 7), (9, 7), (7, 9)], '#3b2a2e'))
    p = Pix()  # mít: to, sần
    p.blob(ellipse(8, 9, 5, 6.5), '#9ab040')
    for y in range(4, 15, 2):
        for x in range(4 + (y % 4) // 2, 13, 2):
            p.px([(x, y)], '#7a9030')
    p.outline().save('mit')
    round_fruit('man', '#8a3a7a', leaf=True, r=4.5)


def machines():
    p = Pix()  # máy sàng chè: nong tre + khung
    p.blob(ellipse(8, 9, 6.5, 3), '#c8a060')
    p.px(line(2, 12, 2, 15) | line(13, 12, 13, 15), '#8a5a36')
    for (x, y) in ((6, 9), (9, 8), (10, 10), (7, 10)):
        p.px([(x, y)], '#4a8a3a')
    p.outline().save('tea_sifter')
    p = Pix()  # lò rang cà phê: trống rang
    p.blob(ellipse(8, 8, 5, 4.5), '#6e6a6a')
    p.blob(rect(3, 12, 12, 14), '#8a5a3a')
    p.px([(6, 13), (8, 13), (10, 13)], '#f08a30')
    p.px(line(13, 8, 15, 8), '#3b2a2e')
    p.outline().save('roaster')
    p = Pix()  # máy ép mía: hai trục + tay quay
    p.blob(rect(3, 5, 12, 12), '#a8b0b6')
    p.blob(ellipse(6, 8.5, 1.8, 2.5), '#6e6a6a')
    p.blob(ellipse(10, 8.5, 1.8, 2.5), '#6e6a6a')
    p.px(line(12, 4, 15, 2), '#8a5a36')
    p.blob(rect(4, 13, 11, 15), '#8a5a36')
    p.outline().save('cane_press')
    p = Pix()  # nhà nấm: chòi rơm nhỏ
    p.blob({(x, y) for x in range(16) for y in range(1, 8) if y >= 1 + abs(x - 7.5) * 0.85}, '#d8b060')
    p.blob(rect(3, 8, 12, 14), '#8a6a4a')
    p.blob(ellipse(8, 12, 1.8, 1.2), '#e8e0d0')
    p.outline().save('mushroom_house')
    p = Pix()  # ruộng muối
    p.blob(rect(1, 6, 14, 13), '#bfe3ec', light='#e6f6fa', dark='#8cc0cc')
    p.px(line(1, 9, 14, 9) | line(7, 6, 7, 13), '#8a6a4a')
    p.blob(ellipse(4, 11, 1.5, 1), '#f6f6f2')
    p.blob(ellipse(11, 7.5, 1.5, 1), '#f6f6f2')
    p.outline().save('salt_pan')


def products():
    p = Pix()  # trà khô: gói giấy
    p.blob(rect(4, 4, 11, 14), '#7a9a5a')
    p.px(line(4, 7, 11, 7), '#3b5a2a')
    p.blob(ellipse(8, 11, 2, 1.5), '#3b5a2a')
    p.outline().save('tra_kho')
    p = Pix()  # cà phê rang: bao hạt
    p.blob(rect(4, 5, 11, 14), '#c8a070')
    for (x, y) in ((6, 9), (8, 10), (10, 9), (7, 12), (9, 12)):
        p.blob(ellipse(x, y, 1, 0.8), '#4a2a1a')
    p.outline().save('ca_phe_rang')
    p = Pix()  # nước mía: ly
    p.blob(rect(5, 4, 10, 14), '#f0f4f6', light='#ffffff', dark='#c8d0d6')
    p.blob(rect(6, 6, 9, 13), '#c8d060')
    p.px(line(9, 1, 9, 6), '#c7474f')
    p.outline().save('nuoc_mia')
    p = Pix()  # muối: đống trắng
    p.blob({(x, y) for x in range(16) for y in range(5, 14) if y >= 5 + abs(x - 7.5) * 0.9}, '#f6f6f2', light='#ffffff', dark='#c8ccd0')
    p.outline('#9aa4ac').save('muoi')
    p = Pix()  # phân tốt: bao vàng
    p.blob(rect(4, 4, 11, 14), '#e0b040')
    p.px(line(4, 6, 11, 6), '#8a6a2a')
    p.blob(ellipse(8, 10, 2, 2), '#7ab04a')
    p.outline().save('fertilizer_2')
    p = Pix()  # phân hữu cơ: đống nâu
    p.blob({(x, y) for x in range(16) for y in range(6, 14) if y >= 6 + abs(x - 7.5) * 0.8}, '#6e4a2a')
    p.px([(6, 9), (9, 10), (8, 8)], '#a4c263')
    p.outline().save('compost')
    p = Pix()  # con sâu
    for i, x in enumerate(range(3, 13, 2)):
        p.blob(ellipse(x, 9 + (i % 2), 1.6, 1.6), '#8ac040')
    p.px([(12, 8)], '#3b2a2e')
    p.outline().save('pest')


if __name__ == '__main__':
    crops()
    trees()
    machines()
    products()
    print('xong →', OUT)
