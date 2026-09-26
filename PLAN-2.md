# Nhà Thằng Phong — Kế hoạch giai đoạn 2 (mốc 11 → 20)

Giai đoạn 1 (mốc 1–10, xem `PLAN.md`) đã có một game nông trại đầy đủ: trồng trọt 4 mùa, vật nuôi, hang đá, máy móc, làng 8 dân làng, câu cá, nấu ăn, lễ hội, bạn bè qua server.

**Bản thiết kế 12 màn (Claude Design):** https://claude.ai/artifact/BjpUevejNATJe1p7xvFGFh — hình vẽ bằng `tools/draw_phase2.py` → `assets/Custom/phase2/`.

Giai đoạn 2 biến nó thành một **game có "sảnh ngoài"** giống game online. Vào game là thấy sảnh: nhân vật của mình, sự kiện đang chạy, nhiệm vụ, chọn bản đồ, bạn bè, bộ sưu tập nhân vật. Bên trong thì lối chơi sâu hơn: kỹ năng, trang phục, cây trồng mới, nhiều vùng đất, khách mời nổi tiếng.

---

## 1. Tham khảo từ các game khác

| Game | Học gì | Đưa vào mốc |
|---|---|---|
| **Khu Vườn Trên Mây** (VNG) | Vườn nhiều tầng trên mây; sang vườn bạn "hái trộm" có giới hạn; nhiệm vụ đơn hàng máy bay; bảng xếp hạng người Việt rất quen | 13, 16, 19 |
| **Hay Day** (Supercell) | Tàu thủy/xe tải chở đơn hàng lớn, báo "Tin nông trại" bán hàng giữa người chơi, cấp nông trại mở dần đồ mới | 12, 16 |
| **Animal Crossing** | Nhân vật khách ghé thăm mỗi tuần (thương nhân, nghệ sĩ); thiết kế trang phục; bảo tàng sưu tập cá, côn trùng, hóa thạch | 14, 15, 17 |
| **Stardew Valley** | Kỹ năng 1–10, mỗi mốc chọn 1 nghề (nhánh); hang nhiều tầng có quái nhẹ; cây khổng lồ; cá huyền thoại | 12, 13, 18 |
| **Coral Island / Sun Haven** | Lặn biển nhặt rác, hồi sinh rạn san hô; nhiều vùng đất khác hẳn nhau (đảo, núi, thành phố) | 13 |
| **Story of Seasons** | Lai giống cây (hạt lai ra màu mới); thi nông sản đẹp nhất trong hội | 18 |
| **Genshin / game mobile nói chung** | Sảnh có banner sự kiện, **điểm danh 7 ngày**, nhiệm vụ ngày/tuần, hòm thư, thẻ nhân vật, "pass mùa" miễn phí | 11, 15, 16 |
| **Fortnite / các game có sự kiện hợp tác** | **Khách mời nổi tiếng theo mùa**: nhân vật đặc biệt, trang phục, nhiệm vụ riêng, chỉ có trong thời gian sự kiện | 17 |
| **Palia / Fae Farm** | Làm cùng lúc với bạn (co-op), trang trí nhà tự do, nghề phụ (nấu, may) | 19, 20 |

Nguyên tắc chung: lấy phần **vui** (sưu tập, sự kiện, khách mời, trang trí), **bỏ phần moi tiền** (nạp thẻ, gacha ép quay, năng lượng chờ hồi). Mọi thứ đều kiếm được bằng cách chơi.

---

## 2. Luồng vào game mới

```
Trang bìa (cảnh động theo mùa thật)
  → bấm "Vào game"
Sảnh ngoài ─┬─ [Chơi]            → chọn ô lưu / chọn bản đồ nông trại → vào game
            ├─ [Bản đồ thế giới]  → xem các vùng đã mở, bay nhanh tới vùng
            ├─ [Sự kiện]          → banner sự kiện đang chạy + lịch sắp tới
            ├─ [Nhiệm vụ]         → ngày / tuần / cốt truyện / thành tích
            ├─ [Nhân vật]         → ngoại hình, trang phục, kỹ năng, danh hiệu
            ├─ [Bộ sưu tập]       → thẻ nhân vật khách mời, cá, cây, món ăn
            ├─ [Bạn bè]           → danh sách, ghé thăm, bảng xếp hạng
            ├─ [Hòm thư]          → quà hệ thống, quà bạn bè, thưởng sự kiện
            ├─ [Cửa hàng]         → trang phục, trang trí (bằng xu/tem trong game)
            └─ [Cài đặt]
```

Trong game có thể mở lại sảnh bất cứ lúc nào (phím **Tab**). Sảnh chỉ tạm dừng game, không thoát.

---

## 3. Trang bìa

**Mục tiêu:** 5 giây đầu đã thấy game đẹp và "sống".

- **Cảnh động nhiều lớp (parallax):** trời, núi xa, cánh đồng, ngôi nhà, nhân vật của mình đang tưới cây. Chuột di chuyển thì các lớp lệch nhẹ.
- **Theo mùa và giờ thật:**
  - Tháng 1–3 hoa đào, mai; tháng 4–6 nắng hè; tháng 7–9 lúa chín vàng; tháng 10–12 trời lạnh.
  - Buổi tối thì đèn nhà sáng, có đom đóm.
- **Logo** chữ pixel lớn "NHÀ THẰNG PHONG", có con gà nhảy qua chữ.
- **Vào ngày lễ thật**, trang bìa có trang trí riêng (Tết, Trung Thu, Noel).
- Nút: **Vào game**, **Cài đặt**, **Ghi công**. Góc dưới ghi phiên bản.
- Nhạc chủ đề riêng cho trang bìa.

Hình cần vẽ: 5 lớp nền × 4 mùa (script PIL), logo chữ, đom đóm, cánh hoa bay.

---

## 4. Sảnh ngoài

### Bố cục (màn ngang 16:9)

```
┌────────────────────────────────────────────────────────────────┐
│ [Ảnh đại diện] Tên · Cấp 12 ▓▓▓░░   💰 12.400  🎟 35 tem   ✉ 3 │
├──────────────┬───────────────────────────────┬─────────────────┤
│ 📅 Điểm danh │                               │ ⭐ SỰ KIỆN      │
│ ngày 4/7     │    [ NHÂN VẬT CỦA MÌNH ]      │ ┌─────────────┐ │
│              │     đứng giữa sân nhà,        │ │ Hội chợ Tết │ │
│ 📜 Nhiệm vụ  │     vẫy tay, thú cưng bên     │ │ còn 3 ngày  │ │
│ • Tưới 20 ô  │     cạnh, nền đổi theo map    │ └─────────────┘ │
│ • Câu 3 cá   │                               │ Khách mời tuần: │
│ • Bán 500 xu │                               │ [thẻ nhân vật]  │
├──────────────┴───────────────────────────────┴─────────────────┤
│ [Nhân vật] [Bộ sưu tập] [Bạn bè] [Cửa hàng] [Bản đồ]  [ CHƠI ▶ ]│
└────────────────────────────────────────────────────────────────┘
```

### Các ô trong sảnh

| Ô | Nội dung | Ghi chú |
|---|---|---|
| **Thanh trên** | Ảnh đại diện, tên, **cấp nông trại** (điểm kinh nghiệm từ mọi việc), tiền xu, **tem sự kiện**, hòm thư | Cấp nông trại mở dần: bản đồ, cây, máy, trang phục |
| **Điểm danh 7 ngày** | Mỗi ngày thật vào game nhận quà. Ngày 7 là quà to (trang phục, cây giống hiếm). Lỡ ngày không mất chuỗi, chỉ không nhận ngày đó | Theo ngày thật; không có mạng thì dùng giờ máy |
| **Nhiệm vụ** | 3 nhiệm vụ ngày + 5 nhiệm vụ tuần + cốt truyện chính; xong nhiệm vụ thì bấm nhận quà ngay ở sảnh | Xem mục 7 |
| **Nhân vật giữa sảnh** | Nhân vật mình mặc đồ đang chọn, thú cưng đi theo; bấm vào thì mở trang Nhân vật; nền là nông trại hiện tại | Dùng lại Phaser, cảnh nhỏ riêng |
| **Sự kiện** | Banner trượt, đếm ngược, bấm vào xem chi tiết: nhiệm vụ sự kiện, cửa hàng đổi tem, bảng xếp hạng sự kiện | Cấu hình bằng file JSON, không cần sửa code |
| **Khách mời tuần** | Thẻ nhân vật khách đang ghé làng (xem mục 8) | Đổi mỗi tuần thật |
| **Nút CHƠI** | Chọn ô lưu → nếu ô mới thì chọn bản đồ nông trại → vào game | |

---

## 5. Trang nhân vật

### 5.1 Tạo và sửa ngoại hình
Nhân vật ghép từ **nhiều lớp** hình, mỗi lớp đủ 4 hướng × các hoạt ảnh:

- Thân (màu lông/da, 8 màu)
- Mắt (6 kiểu)
- Tóc hoặc tai (8 kiểu)
- Áo, quần, giày
- Nón (nón lá, mũ rơm, mũ len, băng đô…)
- Phụ kiện (kính, khăn, cánh, đuôi)

Làm bằng script PIL, như `tools/draw_npcs.py` đang làm: tách lớp từ nhân vật gốc Sprout Lands rồi tô màu và vẽ đè phụ kiện theo khung bao của từng khung hình. Trang có bảng xem trước xoay 4 hướng và nút ngẫu nhiên.

### 5.2 Trang phục (bộ đồ)
- Mỗi món chỉ để trang trí. Riêng **bộ đủ 4 món** có hiệu ứng nhỏ:
  - Bộ nông dân: tưới tốn ít sức hơn 10%.
  - Bộ ngư dân: vùng câu to hơn 5%.
- Nguồn trang phục: điểm danh, nhiệm vụ, cửa hàng (xu), sự kiện (tem), may ở **tiệm may** mới trong làng.

### 5.3 Kỹ năng (học Stardew)
5 kỹ năng, mỗi kỹ năng từ cấp 1 đến 10. Cấp tăng dần theo việc làm:

| Kỹ năng | Tăng khi | Cấp 5 chọn 1 nghề | Cấp 10 chọn 1 nghề |
|---|---|---|---|
| Trồng trọt | Thu hoạch | Nông dân giỏi (+10% giá rau) / Người làm vườn (cây lớn nhanh 10%) | Nghệ nhân (+25% hàng chế biến) / Nhà lai giống (lai hạt dễ ra màu hiếm) |
| Chăn nuôi | Chăm và lấy sản phẩm | Chủ trại (+20% giá sản phẩm) / Người thương thú (tim tăng nhanh gấp đôi) | … |
| Câu cá | Kéo được cá | Ngư dân (+25% giá cá) / Người đi biển (được thêm vùng câu) | … |
| Khai khoáng | Đập đá | Thợ mỏ (+1 quặng mỗi lần) / Thợ đá quý (có đá quý) | … |
| Nấu ăn | Nấu món | Đầu bếp (món hồi sức +30%) / Chủ quán (bán món +30%) | … |

### 5.4 Hồ sơ
- **Danh hiệu** hiện dưới tên, ví dụ "Vua câu cá", "Bạn thân của cả làng".
- **Thành tích** (50 cái, có huy hiệu).
- Thống kê: số ngày chơi, tổng tiền kiếm được, số loại cá đã câu.
- **Thú cưng** đi theo: chó, mèo, vịt; có tên, tim, tự nhặt đồ rơi.

---

## 6. Chọn bản đồ và thế giới

### 6.1 Bản đồ nông trại (chọn lúc tạo ô lưu mới)

| Bản đồ | Đặc điểm | Lợi / hại |
|---|---|---|
| **Đồng bằng** (bản hiện tại) | Ruộng rộng, ao, biển quanh đảo | Cân bằng, hợp người mới |
| **Ven biển miền Trung** | Bãi cát, biển lớn | Câu cá biển, muối, dừa; đất cát trồng được ít loại |
| **Đồi chè Tây Bắc** | Ruộng bậc thang, sương mù | Chè, lúa nếp nương, mận; mùa đông tuyết, đi lên dốc chậm |
| **Cao nguyên** | Đất đỏ badan, cà phê | Cà phê, hồ tiêu, sầu riêng (giá cao nhưng lâu ra trái); mùa khô cần tưới nhiều |
| **Miệt vườn sông nước** | Kênh rạch, xuồng | Trái cây quanh năm, lúa nước, cá đồng; ít đất khô |

Mỗi bản đồ là một file Tiled riêng (đã có cách làm từ bản đồ làng), có cây và cá riêng.

### 6.2 Bản đồ thế giới (mở dần theo cấp nông trại)
- **Làng** (đã có).
- **Chợ huyện** (cấp 5): bán sỉ giá tốt hơn, tiệm may, tiệm đồ trang trí, rạp hát có khách mời diễn.
- **Rừng** (cấp 8): hái nấm, măng, mật ong rừng; có gỗ quý.
- **Hang sâu** (cấp 10): 30 tầng có quái nhẹ (dơi, slime đất), rương báu, đá quý.
- **Biển và đảo** (cấp 15): lặn nhặt rác, hồi sinh san hô, cá hiếm, đảo có khách mời.
- **Vườn trên mây** (cấp 20): học Khu Vườn Trên Mây, trồng cây "trên trời" (dâu mây, bắp cầu vồng).

Bấm vào một vùng trên bản đồ thế giới là **đi xe bò** tới (mất giờ trong game) hoặc đi bộ theo lối.

---

## 7. Nhiệm vụ và sự kiện

### 7.1 Các loại nhiệm vụ

| Loại | Số lượng | Làm mới | Ví dụ | Thưởng |
|---|---|---|---|---|
| Ngày | 3 | 0h mỗi ngày thật | Tưới 20 ô, câu 3 cá, bán 500 xu | Xu, điểm cấp, 5 tem |
| Tuần | 5 | Thứ Hai | Thu hoạch 100 nông sản, tặng quà 5 dân làng | Hạt hiếm, 30 tem |
| Cốt truyện | ~40 bước | Theo tiến độ | "Hồi sinh làng": sửa đình → mở chợ huyện → tìm hiểu hang sâu → … | Mở vùng mới, cảnh truyện |
| Dân làng | Mỗi người 3 | Theo tim | Chị Lan cần công thức mới, bác Năm cần quặng lạ | Tim, công thức, đồ độc quyền |
| Thành tích | 50 | 1 lần | Câu đủ 20 loại cá, trồng đủ 25 loại cây | Danh hiệu, huy hiệu |

Nhiệm vụ ngày được chọn ngẫu nhiên có seed (giống bảng tin làng đang làm) và hợp với việc người chơi đã mở khóa. Không bao giờ ra nhiệm vụ "câu cá" khi chưa có cần câu.

### 7.2 Sự kiện theo mùa thật
- **Lịch sự kiện** lưu trong một file JSON (tên, ngày bắt đầu và kết thúc, nhiệm vụ, cửa hàng, trang trí). Muốn thêm sự kiện chỉ cần thêm 1 mục.
- Mỗi sự kiện có **tem riêng** để đổi đồ trong cửa hàng sự kiện. Đồ sự kiện là trang phục, trang trí, cây giống đặc biệt.
- **Sổ mùa miễn phí:** 30 bậc, làm nhiệm vụ là lên bậc, không có bản trả tiền.
- Ví dụ trong năm:
  - Tháng 1–2: Hội chợ Tết (gói bánh chưng thi đấu, lì xì, pháo hoa).
  - Tháng 3: Hội hoa.
  - Tháng 6: Mùa hè biển.
  - Tháng 9: Trung Thu (làm lồng đèn, rước đèn cùng bạn).
  - Tháng 10: Halloween.
  - Tháng 12: Noel tuyết.
- **Thi đấu trong sự kiện:** nông sản đẹp nhất (chấm theo chất lượng), câu cá to nhất. Có **bảng xếp hạng giữa bạn bè** qua server.

---

## 8. Nhân vật hoạt hình và người nổi tiếng

Đây là phần mày muốn nhất, nhưng cũng là phần **có rủi ro pháp lý thật**. Mình đưa 3 hướng, mày chọn.

### Vấn đề
- **Nhân vật hoạt hình có bản quyền** (Doraemon, Pikachu, Conan, Shin, nhân vật Disney…): vẽ lại để chơi riêng thì thường không ai để ý. Nhưng đưa lên web cho người khác vào chơi là **phát tán tác phẩm phái sinh** không xin phép. Chủ bản quyền có thể yêu cầu gỡ; các hãng như Nintendo, Disney rất hay làm việc này.
- **Người nổi tiếng thật** (ca sĩ, cầu thủ, streamer): dùng tên và hình ảnh là **quyền hình ảnh cá nhân** (Bộ luật Dân sự Việt Nam, Điều 32). Thêm lời thoại hoặc hành động cho họ còn dễ gây phản cảm, hiểu lầm là họ quảng cáo cho game.

### Ba hướng

| Hướng | Nội dung | Rủi ro | Hợp khi |
|---|---|---|---|
| **A. Nhân vật dân gian và của chung** | Thánh Gióng, Tấm, Cám, Chú Cuội + Chị Hằng, Thạch Sanh, Trạng Quỳnh, Thằng Bờm, Sơn Tinh – Thủy Tinh, Táo Quân, Ông Địa, Tôn Ngộ Không (theo truyện gốc, không theo phim); danh nhân lịch sử được khắc họa tôn trọng | Không có | Muốn đăng web thoải mái |
| **B. Nhân vật tự thiết kế "gợi nhớ"** | Khách mời theo kiểu người nổi tiếng nhưng là nhân vật hư cấu, tên riêng, ngoại hình riêng: "Mèo Máy Tí Hon" (mèo máy cam có ăng-ten, tự thiết kế — không giống Doraemon), "Siêu sao Sơn Ca" (ca sĩ nổi tiếng), "Thánh Sút" (cầu thủ), "Chef Tùng" (đầu bếp truyền hình), "Streamer Gấu" | Thấp, miễn không dùng tên, logo, hình giống hệt | Vui kiểu "à cái này nhại ông kia" mà vẫn an toàn |
| **C. Dùng thẳng nhân vật bản quyền và người thật** | Doraemon, Pikachu, ca sĩ thật… | Cao nếu đăng công khai | Chỉ chơi một mình hoặc vài người quen, không bao giờ đưa lên web công khai |

**Mình đề xuất:** làm chính **A + B**, đủ đông vui, trọn vẹn và đăng web được. Nếu mày vẫn muốn C thì làm tách riêng thành "gói cá nhân" (một file dữ liệu không đưa lên web). Mình vẫn **không dùng ảnh thật** của người nổi tiếng; vẽ pixel kiểu hoạt hình thôi.

### Cách đưa khách mời vào game (dùng cho cả 3 hướng)
- **Khách ghé làng mỗi tuần thật:** 1–2 nhân vật đến ở làng 7 ngày, có chỗ đứng, lịch sinh hoạt, lời thoại riêng (hệ thống dân làng đã làm được việc này).
- **Nhiệm vụ khách mời:** mỗi khách 3–5 nhiệm vụ.
  - Chú Cuội nhờ tìm cây đa quý.
  - Siêu sao Sơn Ca cần 10 hoa để làm sân khấu.
  - Thánh Sút rủ đá bóng trên đồng (trò chơi nhỏ).
- **Thẻ nhân vật:** làm xong nhiệm vụ nhận thẻ; mỗi thẻ có hình, tiểu sử vui và câu nói đặc trưng. Sưu tập đủ bộ (ví dụ bộ Truyện cổ tích 10 thẻ) thì nhận trang phục cosplay.
- **Biểu diễn ở rạp hát chợ huyện:** khách mời "diễn" một màn hoạt ảnh ngắn, người chơi ngồi xem.
- **Thú cưng đặc biệt:** Ngựa sắt Thánh Gióng, Thỏ Ngọc của Chị Hằng.

### Danh sách khởi đầu (24 khách: 12 dân gian + 12 tự thiết kế)
- **Dân gian:** Thánh Gióng, Tấm, Chú Cuội, Chị Hằng, Thạch Sanh, Trạng Quỳnh, Thằng Bờm, Sơn Tinh, Thủy Tinh, Táo Quân, Ông Địa, Tôn Ngộ Không.
- **Tự thiết kế:** Mèo Máy Tí Hon, Siêu sao Sơn Ca, Thánh Sút, Chef Tùng, Streamer Gấu, Ảo thuật gia Bí Ẩn, Nữ hiệp Áo Dài, Rapper Vịt, Bác Sĩ Mèo, Phi công Cò, Hoa hậu Sen, Thầy võ Rồng.

---

## 9. Trồng trọt và lối chơi sâu hơn

### Trồng trọt
- **Đất có loại:**
  - Đất thịt: bình thường.
  - Đất cát: hợp khoai, dưa.
  - Đất sét: giữ nước, 2 ngày mới khô.
  - Đất đỏ: hợp cà phê, tiêu.
  - Cải tạo đất bằng phân.
- **Sâu bệnh:** cây có thể bị sâu (hiện con sâu). Bắt tay, rải tro hoặc nuôi vịt ăn sâu. Không xử lý thì giảm chất lượng.
- **Cây giàn:** dưa leo, nho, bầu, mướp phải cắm cọc; không đi xuyên qua được, bù lại cho nhiều trái.
- **Cây khổng lồ:** 3×3 ô cùng loại chín cùng lúc thì có cơ hội thành 1 trái khổng lồ (bí, dưa hấu, bắp cải).
- **Lai giống:** 2 ô khác loại cạnh nhau có cơ hội ra hạt lai (cà chua vàng, dưa hấu không hạt, hoa hồng xanh). Có **sổ lai giống** ghi lại.
- **Chất lượng mới:** thêm hạng **Kim cương** (trên Vàng), cần phân tốt + kỹ năng cao.
- **Cây mới theo vùng:** chè, cà phê, tiêu, sầu riêng, dừa, mía, lúa nếp nương, măng tây, nấm rơm (khoảng 20 loại).
- **Máy mới:**
  - Máy sàng chè.
  - Lò rang cà phê.
  - Máy ép mía.
  - Nhà nấm.
  - Máy làm muối.
- **Trang trí nông trại:** đặt tự do rào, lối đi đá, đèn, ghế, tượng, hoa chậu. Có **chấm điểm nông trại đẹp** giữa bạn bè.

### Lối chơi khác
- **Cấp nông trại 1–50:** mở dần vùng đất, cây, máy, trang phục. Mỗi cấp có quà.
- **Hang sâu có quái nhẹ:** đánh bằng kiếm gỗ, không chết, hết máu thì ngất về nhà và rơi ít đồ.
- **Làm cùng lúc với bạn (co-op):** mời 1–3 bạn vào nông trại mình cùng làm, thời gian thực qua WebSocket. Làm sau cùng vì khó nhất.
- **Chợ giữa người chơi:** đăng bán nông sản cho bạn bè (học báo "Tin nông trại" của Hay Day), giá do người bán đặt.

---

## 10. Thay đổi kỹ thuật

| Phần | Việc |
|---|---|
| **Tách "hồ sơ" và "ô lưu"** | Hồ sơ (trên mọi ô lưu): ngoại hình, trang phục đã có, thẻ nhân vật, thành tích, điểm danh, tem. Ô lưu: nông trại như hiện nay. Thêm `profile.ts` và bản lưu riêng `nongtrai.profile` |
| **Sảnh** | Giao diện HTML/CSS (như HUD hiện tại), chạy trước Phaser. Nhân vật giữa sảnh là một cảnh Phaser nhỏ riêng |
| **Nhân vật nhiều lớp** | `tools/draw_avatar.py` sinh từng lớp (thân/tóc/áo/nón…) ra spritesheet cùng khung. Phaser vẽ chồng nhiều sprite chạy cùng hoạt ảnh |
| **Dữ liệu sự kiện & khách mời** | `src/data/events.json` và `src/data/guests.ts`, thêm sự kiện không cần sửa code. Server trả về lịch sự kiện mới nếu có |
| **Nhiệm vụ** | `quests.ts` thuần logic, có test: điều kiện kiểu bộ đếm ("đã tưới N ô hôm nay"). Game phát sự kiện (`emit('water')`), nhiệm vụ nghe và cộng |
| **Server** | Thêm: bảng xếp hạng, điểm danh theo ngày thật (chống sửa giờ máy), lịch sự kiện, chợ giữa người chơi. Co-op thì thêm WebSocket |
| **Nhiều bản đồ nông trại** | Mỗi bản đồ một file Tiled + bảng cây và cá riêng; `buildWorld()` đổi thành đọc từ Tiled |
| **Bản lưu** | Tiếp tục đánh số (v9, v10…) với bước nâng cấp tự động như cũ; bản lưu hiện tại không mất |

---

## 11. Lộ trình (mốc 11 → 20)

Tổng khoảng **24 tuần** nếu làm đều. Mỗi mốc đều chơi được, có test và bot kiểm tra như giai đoạn 1.

| Mốc | Tên | Thời gian | Nội dung chính | Xong khi |
|---|---|---|---|---|
| **11** | Trang bìa & sảnh | 2 tuần | Trang bìa động theo mùa thật; sảnh đủ bố cục; hồ sơ tách khỏi ô lưu; điểm danh 7 ngày; hòm thư hệ thống; phím Tab mở sảnh | Mở game thấy trang bìa → sảnh → chơi, điểm danh nhận quà |
| **12** | Nhân vật & kỹ năng | 3 tuần | Tạo nhân vật nhiều lớp (8 lớp, ~60 món); trang nhân vật; 5 kỹ năng × 10 cấp + chọn nghề; cấp nông trại; thú cưng | Đổi đồ thấy ngay trong game; lên cấp kỹ năng có thông báo + chọn nghề |
| **13** | Nhiệm vụ | 2 tuần | Nhiệm vụ ngày/tuần/thành tích; cốt truyện "Hồi sinh làng" phần 1 (15 bước); nhận thưởng ở sảnh | Mỗi ngày có 3 nhiệm vụ hợp lý, nhận thưởng được, cốt truyện mở chợ huyện |
| **14** | Bản đồ thế giới & chợ huyện | 3 tuần | Bản đồ thế giới; chợ huyện (tiệm may, trang trí, rạp hát, bán sỉ); xe bò đi nhanh | Đi được làng ↔ chợ huyện, may được đồ |
| **15** | Sự kiện & sổ mùa | 2 tuần | Lịch sự kiện JSON theo ngày thật; tem, cửa hàng sự kiện; sổ mùa 30 bậc; 2 sự kiện mẫu (Tết, Hè biển) | Đổi ngày máy sang mùa sự kiện là thấy banner, nhiệm vụ, cửa hàng |
| **16** | Khách mời | 3 tuần | Hệ thống khách ghé tuần; 24 khách (A+B) có sprite, chân dung, lời thoại, nhiệm vụ; thẻ nhân vật & album; biểu diễn ở rạp | Mỗi tuần có khách mới, làm nhiệm vụ nhận thẻ, xem album |
| **17** | Trồng trọt sâu | 3 tuần | Loại đất, sâu bệnh, cây giàn, cây khổng lồ, lai giống, hạng kim cương, 20 cây mới, 5 máy mới, trang trí tự do | Lai được ít nhất 5 giống; cây khổng lồ xuất hiện |
| **18** | Nông trại mới & vùng xa | 3 tuần | 4 bản đồ nông trại mới; rừng; hang sâu 30 tầng có quái nhẹ; biển & lặn | Tạo ô lưu mới chọn được 5 bản đồ; xuống được tầng 30 |
| **19** | Xã hội | 2 tuần | Bảng xếp hạng bạn bè; thi đấu sự kiện; chấm điểm nông trại đẹp; chợ giữa người chơi | 2 người bán/mua nông sản cho nhau được |
| **20** | Chơi cùng lúc (co-op) | 3 tuần | WebSocket: 2–4 người cùng một nông trại, thấy nhau đi lại, cùng làm | 2 máy cùng tưới một ruộng, thấy nhau thời gian thực |

### Tiến độ

- [x] **Mốc 11 — Trang bìa & sảnh** (xong 2026-09-27)
  - Trang bìa 5 lớp lệch theo chuột (`tools/draw_phase2.py` → `assets/Custom/phase2/cover/`), đổi theo mùa thật. Ban đêm cửa sổ sáng đèn, có đom đóm.
  - Ngày lễ thật có trang trí riêng: Tết (đèn lồng, hoa đào rơi), Trung Thu (đèn ông sao), Noel (tuyết).
  - Logo có con gà chạy qua; Enter hoặc Space để vào game.
  - Sảnh: thanh trên (cấp, tiền, tem, hòm thư), điểm danh 7 ngày theo ngày thật, "Nông trại hôm nay", lễ hội làng sắp tới, sinh nhật sắp tới, nhân vật đứng giữa (bấm vào để đổi tên và kiểu).
  - Ô lưu: chọn, xóa, tạo mới (đặt tên nông trại, chọn bản đồ); trong game bấm **Tab** mở lại sảnh, game tạm dừng.
  - Hồ sơ `src/game/profile.ts` dùng chung mọi ô lưu, lưu riêng ở `nongtrai.profile`.
  - Cấp nông trại 1–50: kinh nghiệm từ mọi việc qua `src/game/bus.ts`; lên cấp có thư thưởng.
  - Bản lưu v9 (tên nông trại, kiểu bản đồ).
  - Làm gọn: nhân vật ở sảnh là hình vẽ sẵn (chưa ghép lớp, mốc 12 làm); 4 bản đồ ngoài Đồng bằng hiện "mở ở bản sau" (mốc 18); Tết và Trung Thu trên trang bìa tính gần đúng theo tháng dương.

- [x] **Mốc 12 — Nhân vật & kỹ năng** (xong 2026-09-27)
  - Nhân vật ghép lúc chạy (`src/ui/avatar.ts`): nhuộm màu lông (8 màu), áo (10 màu, phần thân dưới khăn quàng), chồng lớp nón (9 kiểu) và đồ trên mặt (4 kiểu). Lớp vẽ bằng `tools/draw_player.py`, khớp cả hoạt ảnh cuốc, chặt, tưới.
  - Trang nhân vật (bấm nhân vật ở sảnh) có 5 tab: Ngoại hình, Bộ đồ, Thú cưng, Kỹ năng, Hồ sơ. Đổi ngoại hình trong lúc chơi thì hình trong game đổi theo ngay.
  - 6 bộ đồ, mặc đủ nón + áo mới có hiệu ứng: nông dân tưới tốn 1 sức, ngư dân câu dễ hơn, đầu bếp món ăn hồi thêm 10%, mùa đông sức tối đa 120, thể thao đi nhanh 10%, vua chúa chỉ để đẹp.
  - Đồ mới đến từ điểm danh và quà lên cấp (cấp 3, 5, 7, 10… có nón, kính, bộ đồ).
  - 5 kỹ năng cấp 0–10, cộng tự động khi làm việc. Cấp 5 chọn 1 trong 2 nghề, cấp 10 chọn nhánh con, tổng 30 nghề, nghề nào cũng có hiệu ứng thật (giá bán, câu cá, quặng, đá quý mới, rèn rẻ, món ăn…). Sáng dậy đủ cấp thì game hỏi chọn nghề.
  - Thú cưng (chó, mèo, vịt; cua ở cấp 35) đi theo ngoài trời, đặt tên được, vuốt ve mỗi ngày lên tim; đủ 5 tim thì thỉnh thoảng tha quà về hòm thư.
  - Hồ sơ v2, bản lưu v10.
  - Làm gọn: "áo" là phần thân nhỏ dưới khăn quàng của nhân vật gốc (không vẽ lại cả người); thú cưng chưa nhặt đồ rơi (game chưa có đồ rơi dưới đất), thay vào đó tha quà về hòm thư.

- [x] **Mốc 13 — Nhiệm vụ** (xong 2026-09-27)
  - Nhiệm vụ ngày (3) và tuần (5) theo ngày thật, lưu ở hồ sơ, nên làm ở ô lưu nào cũng tính. Chỉ ra việc đã mở khóa (cần câu, bếp, vật nuôi, làng, bạn bè). Xong có thông báo, nhận ở sảnh; đủ 3 nhiệm vụ ngày có thưởng thêm.
  - Cốt truyện "Hồi sinh làng": 15 bước theo ô lưu. Bước cuối mở đường lên chợ huyện (cờ `road_town`, dùng ở mốc 14).
  - 24 nhiệm vụ dân làng (mỗi người 3 việc, mở ở 1/3/5 tim): giao đồ nhận tiền, đồ và tình cảm.
  - 62 thành tích lưu ở hồ sơ, 11 cái có danh hiệu. Danh hiệu hiện cạnh tên ở sảnh.
  - Thống kê việc đã làm theo ô lưu (`stats`), bản lưu v11, hồ sơ v3.
  - Làm gọn: nhiệm vụ dân làng giao ở trang nhiệm vụ, chưa phải mang tới tận tay dân làng.

- [x] **Mốc 14 — Bản đồ thế giới & chợ huyện** (xong 2026-09-27)
  - Bản đồ thế giới (phím **M**, bấm vào xe bò ở nông trại/làng/chợ, hoặc nút ở sảnh): 7 vùng mở theo cấp nông trại. Đi xe bò 50 xu, mất 1 giờ; về nông trại miễn phí.
  - Chợ huyện: bản đồ Tiled `src/maps/town.json` (`tools/make_town.py`). Mở ở cấp 5 hoặc khi xong cốt truyện; đi bộ từ mép đông làng hoặc đi xe bò. Có người đi chợ và chủ tiệm đứng quầy.
  - Tiệm may bán 8 nón, 4 đồ trên mặt, 10 áo vào tủ đồ, có hình nhân vật mặc thử. Tiệm trang trí bán 6 món (`tools/draw_m14.py`), đặt trên cỏ nông trại, cầm rìu để nhặt lại.
  - Vựa thu mua bán ngay cả chồng đang cầm; 3 món mỗi tuần thật được giá ×1,5. Tiệm tạp hóa bán hàng thiết yếu.
  - Làm gọn: rừng, biển, vườn trên mây hiện trên bản đồ nhưng chưa tới được (mốc 18); rạp hát chờ khách mời (mốc 16); nhà dân ở chợ huyện chỉ có mặt ngoài.

- [x] **Mốc 15 — Sự kiện & sổ mùa** (xong 2026-09-27)
  - Lịch sự kiện theo ngày thật trong `src/data/events.json`, thêm sự kiện là thêm một mục, không sửa code. Có 6 sự kiện mỗi năm: Hội chợ Tết (20/1–20/2), Hội hoa xuân, Mùa hè biển, Trung Thu, Halloween, Noel.
  - Mỗi sự kiện có nhiệm vụ riêng (thưởng tem) và cửa hàng đổi tem: trang phục, cây giống, đồ trang trí, cua cưng, cần câu… mỗi món đổi một lần; năm sau làm lại từ đầu.
  - Sảnh có thẻ sự kiện đếm ngược ngày giờ; ngoài đợt thì báo sự kiện sắp tới.
  - Sổ mùa miễn phí 30 bậc, mỗi quý thật một sổ, 50 điểm một bậc. Điểm từ điểm danh (5), nhiệm vụ ngày (10), thưởng đủ 3 nhiệm vụ (15), nhiệm vụ tuần (30), nhiệm vụ sự kiện (20).
  - Hồ sơ v4.
  - Làm gọn: tem dùng chung cho mọi sự kiện (không tách tem riêng từng sự kiện); thi đấu và xếp hạng trong sự kiện để sang mốc 19 (cần server).

- [x] **Mốc 16 — Khách mời** (xong 2026-09-27)
  - 24 khách (`src/data/guests.ts`): 12 nhân vật dân gian và 12 nhân vật tự thiết kế gợi nhớ người nổi tiếng, không dùng người thật hay nhân vật có bản quyền. Mỗi khách có tiểu sử, câu nói đặc trưng, lời thoại, độ hiếm.
  - Mỗi tuần thật có 2 khách (1 dân gian + 1 tự thiết kế) đứng ở làng từ 8h tới 20h, có ngôi sao trên đầu. Xoay vòng 12 tuần là gặp đủ 24. Hình ghép từ nhân vật gốc theo ngoại hình riêng, chân dung dùng hình đã vẽ cho thiết kế.
  - Mỗi khách 3 việc (giao đồ hoặc đếm việc). Việc đã nhận vẫn tính khi khách đã rời làng. Mỗi bước được tem + xu; xong cả 3 được thẻ.
  - Bộ sưu tập: 2 bộ 12 thẻ, chưa gặp thì hiện bóng đen, đủ bộ thưởng 20.000 xu + đồ trang trí. Thêm tab sổ cá và món đã nấu.
  - Rạp hát chợ huyện tối thứ Bảy (18h–22h trong game): khách ngôi sao tuần đó biểu diễn, xem được 10 tem mỗi tuần.
  - Hồ sơ v5.
  - Làm gọn: khách đứng yên một chỗ, không đi lại theo lịch như dân làng; biểu diễn là màn chân dung nhún theo nhạc kèm lời chạy, chưa phải cảnh diễn trên sân khấu thật; chưa có thú cưng đặc biệt từ khách (ngựa sắt, thỏ ngọc).

- [x] **Mốc 17 — Trồng trọt sâu** (xong 2026-09-27)
  - 4 loại đất trên nông trại: đất thịt; đất cát quanh ao (khoai, dưa hấu, đậu phộng lớn nhanh); đất sét góc tây nam (giữ ẩm 50%, hợp khoai môn, lúa); đất đỏ góc đông bắc (bắt buộc cho cà phê, hồ tiêu). Cuốc lên có báo loại đất; phân hữu cơ cải tạo thành đất thịt.
  - Sâu bệnh: mỗi đêm 2,5% mỗi cây (nuôi vịt còn 0,8%); cây bị sâu không lớn, bấm vào để bắt.
  - 6 cây leo giàn chặn lối đi, thu thêm 1. Cây khổng lồ: 3×3 dưa hấu, bí ngô, bắp cải, bí đao chín cùng lúc có 15% thành một trái to, bổ bằng rìu được 15 trái bạc.
  - 12 giống lai (hai cây khác loại chín cạnh nhau: 6% ra hạt, nghề Nhà lai giống gấp đôi), có sổ lai giống trong Bộ sưu tập, màu riêng cho mỗi giống.
  - Hạng **kim cương** (×2 giá): cần phân tốt + Trồng trọt cấp 8. Phân tốt và phân hữu cơ chế tạo được.
  - 16 cây trồng mới (chè, cà phê, hồ tiêu, mía, nếp nương, măng tây, nấm rơm, mướp đắng, mướp, đậu đũa, đậu phộng, khoai môn, sen, ớt chuông, bí đao, rau dền) và 4 cây ăn trái (sầu riêng, dừa, mít, mận). Tất cả qua test cân bằng giá.
  - 5 máy: sàng chè, rang cà phê, ép mía, nhà nấm (tự mọc nấm), ruộng muối (tự làm muối ngày nắng). Hình vẽ bằng `tools/draw_m17.py`.
  - Điểm nông trại đẹp (trang trí, cây, hoa, vật nuôi, công trình, trái khổng lồ) hiện ở sảnh.
  - Bản lưu v12.
  - Làm gọn: giống lai dùng lại hình của cây gốc rồi đổi màu; trái khổng lồ là hình nông sản phóng to; bản đồ đất cố định cho nông trại Đồng bằng (mốc 18 mỗi bản đồ một kiểu).

- [x] **Mốc 18 — Vùng mới & bản đồ** (xong 2026-09-27)
  - 5 bản đồ nông trại chọn lúc tạo ô lưu: Đồng bằng (giữ nguyên bố cục cũ), Ven biển (đất cát, bờ biển phía nam), Đồi chè (đất đỏ phía đông bắc, đất sét tây nam, ao nhỏ), Cao nguyên (gần như toàn đất đỏ, ao nhỏ), Miệt vườn (đất sét, kênh rạch). Mỗi bản đồ một màu cỏ. *(Sửa 2026-09-27: bản đầu gần như giống hệt Đồng bằng; giờ mỗi bản đồ có màu cỏ riêng và địa hình riêng — Ven biển: bãi cát + hàng dừa + biển đông nam; Đồi chè: 3 đồi chè bậc thang trên đất đỏ + rừng thông; Cao nguyên: đất đỏ bazan, đá tảng, thông, vườn cà phê; Miệt vườn: kênh dọc có bờ đê, vườn cây trái, dừa nước ven kênh.)*
  - **Rừng** (cấp 8): nấm, măng, mật ong rừng, nấm cục mọc mỗi sáng; 16 cây gỗ quý chặt bằng rìu (hôm sau mọc lại); hồ câu cá sông.
  - **Biển & đảo** (cấp 15): bãi cát nhặt vỏ sò, rác, san hô; lặn ở chỗ bong bóng cạnh cầu tàu (10 sức/lần: rác, vỏ sò, nhím biển, san hô, ngọc trai); trạm cứu hộ nhận 30 rác thì rạn san hô hồi sinh, mở 3 cá rạn (mú, hồng, đuối).
  - **Vườn trên mây** (cấp 20): luống 12×6 trồng mọi cây quanh năm, sáng nào cũng tự tưới; Tiên Mây bán 3 hạt chỉ mọc trên mây (dâu mây, bí mây, lúa trời).
  - **Hang sâu** (cấp 10, lối xuống ở góc hang đá): 30 tầng. Lối xuống giấu dưới một tảng đá mỗi tầng; càng sâu càng nhiều sắt, vàng, từ tầng 15 có đá quý. Quái từ tầng 2 (dơi bay xuyên đá, slime, người đá từ tầng 20), đánh bằng **kiếm gỗ** (thợ rèn bán 800 xu, cấp cuốc chim tăng sát thương). Máu 100, lên lại hang trên là hồi đầy; hết máu thì ngất, mất 10% tiền (tối đa 1.000 xu), tỉnh dậy ở nhà. Thang máy mỗi 5 tầng, rương báu ở tầng 10/20/30.
  - Xe bò tới được cả 7 vùng. 7 thành tích mới (hái lượm, thợ lặn, dũng sĩ hang, đáy hang). Bản lưu v13.
  - Làm gọn: 3 vùng mới dựng bằng code từ tileset sẵn có (cát, mây là cỏ đổi màu), chưa có dân riêng ở mỗi vùng; quái đi thẳng về phía người chơi, chưa có kiểu tấn công riêng; kiếm dùng lại hoạt ảnh bổ rìu; mật ong rừng, gỗ quý chưa có công thức riêng (bán hoặc tặng).

- [x] **Mốc 19 — Xã hội** (xong 2026-09-27)
  - Bảng Bạn bè (phím B) có 4 tab: Bạn bè, Xếp hạng, Thi đấu, Chợ. Chỉ trong nhóm mình + bạn bè.
  - **Xếp hạng:** cấp nông trại, điểm đẹp, tim, tổng tiền bán, tầng hang sâu, số loại cá; bấm để đổi tiêu chí. Số liệu gửi kèm ảnh chụp nông trại mỗi lần ngủ dậy.
  - **Thả tim:** mỗi ngày một tim cho mỗi nông trại bạn; bạn nhận thư báo.
  - **Thi đấu:** theo sự kiện ngày thật đang diễn ra (ngoài sự kiện là thi tuần). Nộp 1 nông sản/cá đang cầm, điểm = giá bán × chất lượng, giữ điểm cao nhất; món nộp mất.
  - **Chợ:** rao món đang cầm (giá gợi ý theo giá bán), tối đa 10 món/người; bạn mua xong đồ vào túi (đầy thì vào hòm thư), tiền về người bán qua thư lúc ngủ dậy; gỡ hàng trả đồ lại.
  - Server thêm 3 bảng (likes, contest, market) và 8 đường dẫn; có test.
  - Làm gọn: tiền và điểm do máy người chơi tự báo, server không chống gian (chơi với bạn bè nên chấp nhận); chợ không hết hạn; chưa có thưởng cuối cuộc thi (chỉ bảng xếp hạng); thi "cá to nhất" gộp chung vào chấm theo giá.

**Hình cần vẽ nhiều nhất:** nhân vật nhiều lớp (mốc 12), 24 khách mời (mốc 16), 4 bản đồ nông trại (mốc 18). Vẫn vẽ bằng script theo phong cách Sprout Lands. Hình lớn thì xem trước trên Claude Design rồi mới chốt.

**Rủi ro phình phạm vi:** co-op (mốc 20) và hang có quái (mốc 18) là hai phần tốn công nhất. Nếu cần cắt thì cắt 2 phần này trước; phần còn lại vẫn là một game trọn vẹn.

---

## 12. Đã chốt (2026-09-27)

1. **Tên game:** **Nhà Thằng Phong** (khóa lưu game vẫn là `nongtrai.*` để không mất bản lưu cũ)
2. **Khách mời:** hướng **A + B**, gồm 12 nhân vật dân gian và 12 nhân vật tự thiết kế gợi nhớ người nổi tiếng. Không dùng nhân vật có bản quyền hay người thật.
3. **Thời gian:** sự kiện ở sảnh, điểm danh, nhiệm vụ ngày/tuần theo **ngày thật**.
4. **Lễ hội làng** (Tết Xuân 3, Trung Thu Thu 8…): **giữ theo lịch trong game** như hiện tại, chạy song song với sự kiện ngày thật.
5. **Hang sâu:** **có quái, đánh nhẹ** (không chết, hết máu thì ngất về nhà, rơi ít đồ).
6. **Co-op thời gian thực:** **để sau cùng** (mốc 20), tới lúc đó quyết tiếp.
7. **Nhân vật chính:** mặc định là **Phong** với ngoại hình có sẵn; người chơi đổi được tên và ngoại hình.
8. **Thứ tự:** sảnh trước, theo đúng bảng mục 11. **Làm liền một mạch** các mốc, báo rõ phần làm gọn.
