# Nhà Thằng Phong (game nông trại) — Kế hoạch

Nhập vai nông trại kiểu Stardew Valley, pixel art, chơi một mình trên web/laptop, có ghé thăm và tặng quà bạn bè.

> **Giai đoạn 2 (mốc 11–20):** sảnh ngoài, nhân vật, nhiệm vụ, sự kiện, khách mời, bản đồ mới — xem [`PLAN-2.md`](PLAN-2.md).

## Vòng lặp chơi

```
Thức dậy 6:00 → cuốc đất, gieo hạt, tưới cây → thu hoạch → bỏ vào thùng giao hàng
   → mua hạt / nâng cấp dụng cụ → đi ngủ (cây lớn, nhận tiền) → ngày mới
```

- **Thời gian:** 1 ngày trong game ≈ 12 phút thật (6:00 → 2:00 sáng). Quá 2:00 là ngất, mất ít tiền.
- **Thể lực:** mỗi lần dùng dụng cụ tốn sức; ngủ để hồi.
- **Mùa:** 4 mùa × 14 ngày (ngắn hơn Stardew để đổi cảnh nhanh). Mỗi mùa có cây riêng, cây trái mùa thì chết.
- **Tiến triển:** tiền → hạt tốt hơn, bình tưới/cuốc nâng cấp, chuồng gà, mở rộng đất.

## Bạn bè (bất đồng bộ — không cần cùng online)

- Mỗi người có **mã bạn bè**. Nông trại được lưu lên server.
- **Ghé thăm:** xem nông trại của bạn, **tưới giúp** cây (mỗi ngày 1 lần), **để quà** vào hòm thư.
- Bạn vào game sẽ thấy "Minh đã tưới 12 cây và gửi 3 quả dâu".
- Chơi chung cùng lúc (co-op thời gian thực) để sau, vì phức tạp hơn nhiều.

## Công nghệ

| Phần | Chọn | Lý do |
|---|---|---|
| Engine | **Phaser 3 + TypeScript + Vite** | Mạnh về pixel art 2D: bản đồ ô vuông, sprite, camera, va chạm; chạy web và đóng gói Tauri được |
| Bản đồ | **Tiled** (phần mềm vẽ map miễn phí) → xuất JSON | Vẽ map bằng chuột thay vì code |
| Lưu game | IndexedDB trên máy | Chơi không cần mạng |
| Server bạn bè | Node + SQLite | Nhỏ gọn, chạy trên laptop + Cloudflare Tunnel như trước |

## Đồ họa

Dùng một bộ pixel art có sẵn, thống nhất phong cách:
- **Sprout Lands** (Cup Nooble, itch.io) — giống Stardew nhất: nhân vật, đất cuốc, cây theo giai đoạn, gà bò, nhà. Bản miễn phí dùng cho dự án phi thương mại, ghi công tác giả.
- Hoặc **Kenney** (CC0, tự do hoàn toàn) — ít đồ nông trại hơn.

## Lộ trình

- [x] **Mốc 1 — Đi lại trên nông trại**: map sinh bằng code (đảo cỏ, ao, nhà, ruộng rào, cây, đá, hoa), nhân vật 4 hướng có hoạt ảnh, camera theo, va chạm, gà đi dạo, nước động
- [x] **Mốc 2 — Trồng trọt**: cuốc (có hoạt ảnh), gieo, tưới (đất sẫm màu), thu hoạch; cây lớn 4 giai đoạn theo ngày được tưới; thanh 9 ô; đi ngủ ở cửa nhà; tự lưu khi ngủ
- [x] **Mốc 3 — Kinh tế & thời gian**: thùng giao hàng (bán qua đêm), tiền, **quầy hạt giống** (bấm vào quầy), thể lực, **ăn nông sản hồi sức (phím F)**, **bình tưới 20 lần, đổ đầy ở giếng hoặc ao**, đồng hồ 6:00→2:00, trời tối dần
  - 6 loại cây: lúa mì, củ dền (gốc) + cà rốt, cà chua, bí ngô, dâu tây (vẽ thêm)
- [ ] Mốc 3.5 → 10: xem **Kế hoạch chi tiết** bên dưới

Thiết kế chi tiết các mốc 4–9 (số liệu, icon, hộp thoại mẫu): https://claude.ai/artifact/JqTaFqQeXjdp741hdYjyXn — icon nằm ở `assets/Custom/proposals/`, vẽ bằng `tools/draw_proposals.py`.

## Kế hoạch chi tiết (mốc 3.5 → 10)

Tổng cộng **khoảng 16 tuần** nếu làm đều. Thứ tự đã tính phụ thuộc: mùa → vật nuôi → dụng cụ/máy (cần gỗ, đá, quặng) → làng → lễ hội → bạn bè → hoàn thiện.

| Mốc | Tên | Thời gian | Cộng dồn |
|---|---|---|---|
| 3.5 | Nền móng | 3–4 ngày | tuần 1 |
| 4 | Mùa & cây mới | 2 tuần | tuần 3 |
| 5 | Vật nuôi | 2 tuần | tuần 5 |
| 6 | Tài nguyên, nâng cấp & máy | 2 tuần | tuần 7 |
| 7 | Làng & dân làng | 3 tuần | tuần 10 |
| 8 | Lễ hội & hoạt động | 3 tuần | tuần 13 |
| 9 | Bạn bè | 2 tuần | tuần 15 |
| 10 | Hoàn thiện & phát hành | 1–2 tuần | tuần 16 |

### Mốc 3.5 — Nền móng (3–4 ngày) ✅ xong 2026-09-24
- [x] Dữ liệu nội dung ở `src/data/items.ts` (thêm cây = thêm 1 dòng); test kiểm tra dữ liệu đủ hạt/khung hình
- [x] Bản lưu có phiên bản (`SAVE_VERSION` = 2) + chuỗi nâng cấp `MIGRATIONS` trong `save.ts`; lưu v1 cũ mở được
- [x] Nhiều bản đồ: `WorldScene` (phần chung: đồng hồ, HUD, ngủ, chuyển cảnh) + `PlayerController`; **nhà trong** (`HouseScene`): vào bằng cửa, ngủ ở giường, bước ra cửa về nông trại, thức dậy cạnh giường
- [x] Bảng debug F9 (chỉ bản dev): qua đêm, tua giờ, +tiền, đầy sức/nước, tưới hết, cây chín hết, +hạt, đổi bản đồ, xóa lưu
- [x] `tools/draw_crop_stages.py`: tự vẽ túi hạt + 4 giai đoạn cho 19 cây mới → `assets/Custom/crops_season.png` (+ `.json` thứ tự hàng) — sẽ gắn vào game ở mốc 4

### Mốc 4 — Mùa & cây mới ✅ xong 2026-09-25
- [x] Lịch: năm / mùa / ngày 1–14 trên HUD; bảng lịch phím **C** (thời tiết hôm nay + mai)
- [x] 25 cây gắn mùa (6 cũ + 19 mới vẽ bằng script); đổi mùa → cây trái mùa héo; quầy chỉ bán hạt đúng mùa
- [x] Cây mọc lại (dâu, cà chua, rau muống, bắp, ớt, dưa leo, cà tím, nho, hành lá)
- [x] Thời tiết nắng / mưa / giông (chớp, có thể sét đánh 1 cây) / gió mùa (lá bay) / tuyết (mùa đông); mưa & tuyết tự tưới
- [x] Chất lượng sao thường/bạc/vàng (bán ×1 / ×1,25 / ×1,5) + phân bón
- [x] Ruộng nước: cuốc sát mép ao (hoặc sát ruộng nước khác) → luôn ướt, trồng lúa & rau muống
- [x] 6 cây ăn trái: cây giống → cây nhỏ → cây to (28 ngày), ra trái đúng mùa, tối đa 3 quả, chặn đường đi
- [x] Cỏ & cây cối đổi màu theo mùa
- Làm gọn so với thiết kế: tuyết chưa phủ trắng mặt đất (chỉ đổi màu); cây ăn trái dùng chung hình tán cây + gắn quả

### Mốc 5 — Vật nuôi ✅ xong 2026-09-25
- [x] 4 công trình trên lô đất có sẵn (phía tây nông trại): chuồng gà, chuồng bò, chuồng trâu, ao cá — mua ở quầy tab "Chuồng trại", xây 1 đêm
- [x] 8 loại thú: gà, vịt, thỏ (chuồng gà) · bò, dê, cừu, heo (chuồng bò) · trâu (chuồng trâu); tên ngẫu nhiên
- [x] Trong chuồng: máng cỏ khô, thú đi lại, bong bóng khi có sản phẩm, bấm để vuốt ve + lấy đồ
- [x] Tim 0–10: vuốt ve mỗi ngày tăng, bỏ đói giảm mạnh; tim cao → sản phẩm bạc/vàng
- [x] Mở cửa chuồng: ngày nắng (trừ mùa đông) thú ra bãi cỏ cạnh chuồng, không tốn cỏ khô; heo chỉ đào nấm khi ra đồng
- [x] Trâu (≥ 2 tim): mỗi nhát cuốc được cả 3×3 ô; tổ ong 4 ngày ra mật, gần hoa ra mật hoa; ao cá 2 ngày thêm 1 cá
- Làm gọn so với thiết kế: chưa có chuồng nâng cấp (8 con, máy ấp); thú dùng icon tĩnh nhún nhảy (trừ gà, bò có hoạt ảnh gốc); đặt công trình ở lô cố định thay vì tự chọn chỗ

### Mốc 6 — Tài nguyên, nâng cấp & máy ✅ xong 2026-09-26
- [x] Rìu chặt cây/bụi ngoài đồng → gỗ (hoạt ảnh rìu gốc); cây đã chặt mọc lại sau 7 ngày nếu chỗ còn trống
- [x] Cuốc chim đập đá → đá, quặng đồng/sắt/vàng; **hang đá** (cửa hang góc đông bắc nông trại), 34 tảng mỗi ngày, mai mọc lại
- [x] Dụng cụ 4 cấp (thường/đồng/sắt/vàng): **giữ Shift** + dùng → cuốc/tưới 3 ô / 5 ô / 3×3; bình 20/40/60/100 nước; rìu/cuốc chim cấp cao đánh mạnh hơn, gốc cây to · tảng đá lớn · quặng vàng cần cấp đồng
- [x] Thợ rèn (tab mới ở quầy): 2.000/5.000/10.000 xu + 5 quặng, 2 ngày, dụng cụ vắng mặt trong lúc rèn, sáng ngày hẹn tự về túi
- [x] Bảng chế tạo (K): 3 vòi tưới, bù nhìn, hũ muối, thùng ủ, nong phơi, cối xay, tổ ong
- [x] Máy đặt trên cỏ, icon thành phẩm mờ khi đang làm / nhún khi xong; cầm rìu/cuốc chim bấm máy trống để nhặt lên
- [x] Hũ muối: mứt (trái) / dưa muối (rau) = giá ×2 + 50 · Thùng ủ: nước ép (trái ×3, rau ×2,25) · Nong phơi: 5 trái → 1 trái sấy (×1,5) · Cối xay: lúa → gạo, lúa mì → bột mì, xay ngay
- [x] Quạ: ruộng ≥ 12 cây, mỗi đêm 40% ăn 1 cây ngoài tầm bù nhìn (8 ô)
- [x] Túi đồ 9 → 18 → 27 ô (2.000 / 10.000 xu ở thợ rèn), phím I mở túi, bấm 2 ô để đổi chỗ
- [x] Bản lưu v5: thêm rìu + cuốc chim vào túi (túi đầy thì nới thêm 9 ô)
- Làm gọn so với thiết kế: "giữ nút gom lực" thay bằng giữ Shift; máy tính giờ theo ngày (không theo phút); thành phẩm không giữ chất lượng bạc/vàng; hang chỉ 1 tầng; ngoài đồng ít cây/đá nên thợ rèn bán thêm gỗ (10 xu) và đá (20 xu); thợ rèn tạm ở quầy hạt, mốc 7 chuyển về lò rèn bác Năm

### Mốc 7 — Làng & dân làng ✅ xong 2026-09-26
- [x] Bản đồ làng **Tiled JSON** `src/maps/village.json` (sinh bằng `tools/make_village.py`, mở/sửa được bằng Tiled): đình, chợ, lò rèn, quán chị Lan, trường, bến sông, vườn thuốc, 4 nhà dân, cây đa, giếng, bảng tin
- [x] Nối với nông trại: đi ra mép đông nông trại → vào làng; mép tây làng → về
- [x] 8 dân làng (`tools/draw_npcs.py` đổi màu + nón lá/búi tóc/khăn/nơ từ nhân vật gốc), đi 4 hướng, tự tìm đường (BFS) theo lịch giờ / mưa / chủ nhật, tối về nhà
- [x] Hộp thoại có chân dung: chào lần đầu, câu theo mùa/thời tiết/tim, **nhớ** món quà mấy hôm trước
- [x] Tặng quà (1 lần/ngày, 2 lần/tuần, sinh nhật ×8 — có trên lịch), tim 0–10, bảng quan hệ (phím R)
- [x] 32 sự kiện tim (2/4/6/8 × 8 người), có lựa chọn; thưởng đồ + mở khóa: bà Tư giảm 10% hạt, anh Hai giảm 10% vật nuôi, bác Năm rèn 1 ngày, ông Bảy cho cần câu, chị Lan công thức canh chua (dùng ở mốc 8)
- [x] Tiệm chuyển về dân làng, chỉ mở khi chủ có mặt: bà Tư (sạp chợ, hạt), anh Hai (cửa nhà, vật nuôi), bác Năm (lò rèn); quầy cũ trên nông trại báo đã dời
- [x] Hòm thư cạnh nhà (quà khi túi đầy; mốc 9 dùng cho quà bạn bè); bản lưu v6
- Làm gọn so với thiết kế: nhà chỉ có mặt ngoài (không vào trong, gõ cửa thì chủ nhà ra nói chuyện); sự kiện tim là hộp thoại nhiều đoạn chứ không phải cắt cảnh nhân vật di chuyển; dân làng đi xuyên qua người chơi; chân dung 24×24 phóng to

### Mốc 8 — Lễ hội & hoạt động ✅ xong 2026-09-27
- [x] **Câu cá:** trò giữ vùng xanh theo cá (Space/giữ chuột), 20 loại cá theo mùa/giờ/chỗ (ao, biển quanh nông trại, sông làng — đứng cuối cầu tàu), 3 cần câu (tre/sợi/xịn, bán ở chòi ông Bảy khi ông ra bến), kéo hoàn hảo → cá bạc, sổ tay câu cá; cá chép vàng mở từ sự kiện 8 tim ông Bảy
- [x] **Nấu ăn:** nâng nhà có bếp ở lò rèn (8.000 xu + 100 gỗ), 9 món (cơm, trứng chiên, cá kho, rau muống xào, bánh bí, chè khoai, canh chua — công thức chị Lan, bánh chưng, bánh trung thu)
- [x] **Bảng tin:** 3 đơn mỗi sáng từ dân làng, thưởng tiền + tim
- [x] **Đình làng:** 4 bộ sưu tập → 4 vòi tưới vàng / máy ấp (chuồng chứa gấp đôi) / xe bò (bán thêm 10%) / **nhà kính** (trồng mọi mùa, tưới tự động)
- [x] **Lễ hội:** 8 lễ trên lịch; **Tết** (Xuân 3: đèn lồng, đào mai, cả làng ở sân đình, lì xì, bầu cua, sạp bánh chưng) và **Trung Thu** (Thu 8 tối: đèn ông sao, bé Tí rước đèn quanh gốc đa, bánh trung thu tặng ×3 tim) đầy đủ; 6 lễ còn lại bản gọn (tụ họp + cờ + quà)
- [x] Bản lưu v7
- Làm gọn so với thiết kế: đơn hàng hết hạn trong ngày; máy ấp chỉ nhân đôi sức chứa (không ấp trứng ra con); xe bò là +10% giá bán thay vì chợ huyện riêng; lễ gọn chưa có trò chơi riêng; không có tối đêm Trung Thu riêng (dùng màn đêm chung)

### Mốc 9 — Bạn bè ✅ xong 2026-09-27
- [x] Server `server/index.mjs` (Node + SQLite có sẵn trong Node 22, không cần cài gói): đăng ký lấy **mã bạn bè 6 ký tự** không cần tài khoản; ảnh chụp nông trại tự gửi lên mỗi lần ngủ
- [x] Bảng Bạn bè (phím **B**): đăng ký, kết bạn bằng mã (hai chiều), danh sách bạn, ghé thăm
- [x] Ghé thăm: thấy ruộng, cây, chuồng, máy của bạn; **tưới giúp** (1 lần/ngày thật, server chặn), **để quà** ở hòm thư; không hái trộm; ra cửa nhà để về (sức, giờ, nước mang về)
- [x] Mở game / ngủ dậy: nhận thư — "Trại An đã tưới giúp 4 ô và gửi 3 dâu tây (xem hòm thư)"
- [x] Chống spam/dữ liệu xấu: token đăng nhập, chỉ bạn bè mới xem/tưới/tặng, giới hạn ảnh chụp 300KB, mã món và số lượng quà được kiểm tra
- [x] Đã thử 2 người chơi thật qua server (bot 2 trình duyệt)
- Làm gọn so với thiết kế: nông trại bạn là ảnh chụp lúc ngủ (không thấy bạn đang làm gì theo thời gian thực); không có danh sách chặn / xóa bạn; lượt tưới giúp áp vào các ô còn khô lúc bạn nhận thư

**Chơi với bạn qua Internet:**
```bash
npm run server                                   # máy chủ bạn bè, cổng 8787 (dữ liệu: server/friends.db)
cloudflared tunnel --url http://localhost:8787   # in ra địa chỉ https://…trycloudflare.com
```
Trong game: phím B → ô "Máy chủ" dán địa chỉ https đó → Đăng ký. Bạn bè dùng cùng địa chỉ. (Địa chỉ trycloudflare đổi mỗi lần chạy lại; muốn cố định thì tạo named tunnel.)

### Mốc 10 — Hoàn thiện & phát hành ✅ xong 2026-09-27 (trừ bản Tauri — xem dưới)
- [x] **Âm thanh** tự tổng hợp bằng WebAudio (`src/audio/sound.ts`, không file ngoài → không vướng bản quyền): cuốc, tưới, rìu, cuốc chim, nhặt đồ, tiền, ăn, thả câu, kéo được/sổng cá, gà, bò, cửa, xây, tặng quà, đi ngủ, bấm nút
- [x] **Nhạc nền** mỗi mùa một điệu (thang ngũ cung, nhịp và âm sắc khác nhau), tối nhỏ lại
- [x] **Cài đặt** (phím Esc, hoặc ở màn hình chính): âm lượng nhạc / tiếng động, cỡ chữ 4 mức, xem lại hướng dẫn, về màn hình chính
- [x] **3 ô lưu game** ở màn hình chính (ô 1 giữ bản lưu cũ), mỗi ô một mã bạn bè riêng
- [x] **Hướng dẫn ngày 1–3**: 9 bước (cuốc → gieo → tưới → ngủ → sang làng → chào bà Tư → chặt cây/đập đá → bán hàng → phím tắt), tự qua bước, bỏ qua được
- [x] **Cân bằng**: bảng lời/ô/ngày của 25 cây → giảm dâu tây, tăng su hào & tỏi cho mùa đông đỡ nghèo; test giữ mọi cây trong khoảng 4–25 xu/ô/ngày và món nấu luôn lời hơn nguyên liệu
- [x] Bảng phím (H), dòng gợi ý gọn lại; **trang ghi công** (Cup Nooble, VT323, Phaser, âm thanh tự làm)
- [x] Bản lưu v8
- [ ] **Đóng gói Tauri (bản laptop): CHƯA làm** — máy chưa cài Rust. Khi muốn: cài Rust (`curl https://sh.rustup.rs -sSf | sh`), rồi `npm i -D @tauri-apps/cli && npx tauri init` (dist dir `../dist`, dev url `http://localhost:5173`), `npx tauri build`
- Làm gọn so với thiết kế: **chưa có đổi phím**; âm thanh/nhạc là tiếng tổng hợp đơn giản (kiểu 8-bit) chứ không phải nhạc thu sẵn; cân bằng dựa trên số liệu tính toán, chưa có dữ liệu người chơi thật

**Bản web riêng tư** (chơi trên máy khác qua Internet):
```bash
npm run build && npm run preview                  # http://localhost:4173
cloudflared tunnel --url http://localhost:4173    # gửi địa chỉ https cho bạn bè
```
Bản build có chứa hình Sprout Lands (được phép dùng trong game), chỉ không được đăng lại bộ hình gốc riêng lẻ.

### Cách làm mỗi mốc
1. Viết luật trong `farm.ts`/module riêng + test trước
2. Vẽ hình tối thiểu bằng script trong `tools/`, xem trước trên Claude Design nếu là hình lớn
3. Gắn vào cảnh + HUD, chơi thử bằng bot trình duyệt
4. Mày chơi thử → góp ý → sửa → đánh dấu xong trong file này

### Đã chốt (2026-09-24)
- **Bản đồ:** giữ sinh bằng code tới mốc 6, **chuyển sang Tiled từ mốc 7** (làng vẽ tay)
- **Độ dài mùa:** **14 ngày** (1 năm ≈ 11 giờ chơi)
- **Hình vẽ:** **tự vẽ bằng script** trong `tools/`, không mua Premium
- **Dân làng:** **chỉ tình bạn** (tim, quà, sự kiện), không hẹn hò/kết hôn

Rủi ro lớn nhất là **phình phạm vi** (Stardew mất 4 năm làm một mình) → mỗi mốc phải chơi được rồi mới thêm; phần hình vẽ (thú, dân làng đi 4 hướng) là chỗ tốn công nhất.

## Ghi chú kỹ thuật

- Bộ hình miễn phí chỉ có 2 loại cây; phần vẽ thêm nằm ở `assets/Custom/` do `tools/draw_sprites.py` sinh ra (sửa ASCII trong file rồi chạy `python3 tools/draw_sprites.py`). Bản xem trước: https://claude.ai/artifact/HRWWf3M6YfPbi4T8VNzceS
- Đất cuốc dùng `Tilled_Dirt_Wide.png` (cùng bố cục tự nối viền với `Grass.png`); `Tilled_Dirt.png` bị lệch nửa ô, đừng dùng.
- Khi chạy `npm run dev`, `window.__game` mở cho script test điều khiển cảnh (bản build không có).

## Cấu trúc code

| File | Nội dung |
|---|---|
| `src/game/farm.ts` | Luật nông trại thuần (đất, cây, túi đồ, bán/mua, ngày, ngủ) + test `farm.test.ts` |
| `src/data/items.ts` | Danh sách đồ vật, cây trồng, giá |
| `src/game/world.ts` | Sinh bản đồ, bảng tự nối viền, ô cuốc được |
| `src/game/WorldScene.ts` | Lớp chung cho mọi bản đồ: đồng hồ, HUD, phím tắt, ăn, mua, ngủ, chuyển bản đồ |
| `src/game/player.ts` | Nhân vật: di chuyển, va chạm, hướng nhìn, khung vàng, hoạt ảnh dụng cụ |
| `src/game/FarmScene.ts` / `HouseScene.ts` / `BootScene.ts` | Nông trại / trong nhà / tải hình |
| `src/game/save.ts` | Lưu, tải, nâng cấp bản lưu theo phiên bản |
| `src/data/resources.ts` / `src/game/resources.ts` | Dữ liệu & luật tài nguyên, dụng cụ, chế tạo, máy, vòi tưới, quạ + test |
| `src/game/MineScene.ts` | Hang đá |
| `src/game/VillageScene.ts`, `src/maps/village.json` | Làng (bản đồ Tiled), dân làng đi lại |
| `src/data/npcs.ts` / `src/game/villagers.ts` | Dân làng: lịch, quà, lời thoại, sự kiện tim + test |
| `src/data/activities.ts` / `src/game/activities.ts` | Cá, món ăn, đơn hàng, đình làng, nhà kính, lễ hội + test |
| `src/game/GreenhouseScene.ts` | Nhà kính |
| `server/index.mjs`, `server/db.mjs` | Máy chủ bạn bè (HTTP + SQLite) + test |
| `src/net/friends.ts` | Gọi máy chủ bạn bè, ảnh chụp nông trại, áp thư tưới giúp/quà |
| `src/audio/sound.ts` | Tiếng động & nhạc nền tổng hợp (WebAudio) |
| `src/ui/settings.ts`, `src/game/tutorial.ts` | Cài đặt người chơi; hướng dẫn ngày 1–3 |
| `src/ui/debug.ts` | Bảng debug F9 (chỉ bản dev) |
| `src/ui/hud.ts` | HUD HTML: đồng hồ, tiền, sức, thanh đồ (có mức nước), quầy hạt, hộp thoại |
| `tools/draw_sprites.py` | Vẽ sprite mới (cây, quầy hàng, giếng) theo phong cách Sprout Lands |
| `tools/draw_proposals.py`, `tools/draw_crop_stages.py` | Icon đề xuất; giai đoạn lớn của cây mới |

## Lệnh

```bash
npm install     # lần đầu
npm run dev     # chơi thử: http://localhost:5173
npm test        # test luật nông trại
npm run build   # kiểm tra lỗi + build ra dist/
npm run server  # máy chủ bạn bè (cổng 8787)
npm run preview # chạy bản build ở cổng 4173
```
