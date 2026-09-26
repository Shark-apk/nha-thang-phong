# Nhà Thằng Phong

Game nông trại pixel art kiểu Stardew Valley, bối cảnh làng quê Việt Nam. Chạy trên trình duyệt (Phaser 3 + TypeScript + Vite).

- Trồng trọt 4 mùa, nuôi gà bò, câu cá, nấu ăn, chế tạo, hang đá 30 tầng có quái
- Làng với 8 dân làng, lễ Tết và Trung Thu; chợ huyện, rừng, biển, vườn trên mây
- Sảnh ngoài: điểm danh, nhiệm vụ ngày/tuần, sự kiện theo ngày thật, trang nhân vật, 24 khách mời
- Bạn bè (không cần online cùng lúc): ghé thăm, tưới giúp, tặng quà, xếp hạng, thi đấu, chợ

Kế hoạch và tiến độ: [PLAN.md](PLAN.md) (mốc 1–10), [PLAN-2.md](PLAN-2.md) (mốc 11–20).

## Cần bộ hình Sprout Lands

Game dùng bộ hình **Sprout Lands** của Cup Nooble. Giấy phép không cho phát tán lại, nên thư mục `assets/` **không có trong repo**.

1. Tải bộ Sprout Lands (bản Basic) ở https://cupnooble.itch.io/sprout-lands-asset-pack
2. Giải nén vào `assets/` sao cho có `assets/Characters`, `assets/Tilesets`, `assets/Objects`
3. Vẽ phần hình tự làm (`assets/Custom/`) bằng các script Python (cần Pillow: `pip install pillow`):

```sh
python3 tools/draw_sprites.py
python3 tools/draw_proposals.py
python3 tools/draw_m8.py && python3 tools/draw_m14.py && python3 tools/draw_m17.py && python3 tools/draw_m18.py
python3 tools/draw_crop_stages.py
python3 tools/draw_npcs.py && python3 tools/draw_player.py && python3 tools/draw_phase2.py
python3 tools/pack_icons.py
```

## Chạy

```sh
npm install
npm run dev      # mở http://localhost:5173
npm test         # test luật game + server
npm run server   # server bạn bè, cổng 8787 (SQLite có sẵn trong Node ≥ 22)
```

Chơi với bạn ở máy khác: mở server ra Internet (vd. `cloudflared tunnel --url http://localhost:8787`) rồi dán địa chỉ vào game (phím B → Máy chủ).

## Ghi công

Hình gốc: [Sprout Lands](https://cupnooble.itch.io/sprout-lands-asset-pack) — Cup Nooble. Font: VT323.
