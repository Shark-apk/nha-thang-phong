// 24 khách mời ghé làng theo tuần thật: 12 nhân vật dân gian + 12 nhân vật tự thiết kế (gợi nhớ, không phải người thật).
import type { ItemId } from './items';
import type { Look } from './look';

export type GuestQuest =
  | { kind: 'deliver'; item: ItemId; qty: number; text: string }
  | { kind: 'event'; event: string; n: number; text: string };

export interface Guest {
  id: string;
  name: string;
  set: 'folk' | 'star';
  /** Ô trong assets/Custom/phase2/guests.png (12 cột × 2 hàng, 32×32). */
  portrait: number;
  look: Look;
  /** Chỗ đứng trong làng (điểm trên bản đồ). */
  spot: string;
  bio: string;
  quote: string;
  lines: string[];
  quests: [GuestQuest, GuestQuest, GuestQuest];
  rarity: 1 | 2 | 3;
}

const L = (body: number, shirt: number, hat: string | null, face: string | null = null): Look => ({ body, shirt, hat, face, pet: null });
const d = (item: ItemId, qty: number, text: string): GuestQuest => ({ kind: 'deliver', item, qty, text });
const e = (event: string, n: number, text: string): GuestQuest => ({ kind: 'event', event, n, text });

export const GUESTS: Guest[] = [
  { id: 'thanh_giong', name: 'Thánh Gióng', set: 'folk', portrait: 0, look: L(2, 6, 'band'), spot: 'banyan', rarity: 3,
    bio: 'Cậu bé làng Phù Đổng ba năm không nói, nghe giặc tới thì vươn vai thành tráng sĩ.', quote: 'Ăn một nong cơm, uống một nong cà!',
    lines: ['Làng này yên bình quá, ta muốn ở lại vài hôm.', 'Muốn khỏe thì phải ăn cho no!', 'Tre ngà làng ngươi xanh tốt thật.'],
    quests: [d('rice_bag', 3, 'Mang 3 bao gạo cho ta ăn lấy sức'), d('ore_iron', 5, 'Tìm 5 quặng sắt rèn roi'), e('chop', 10, 'Chặt 10 cây tre, bụi rậm dọn đường')] },
  { id: 'tam', name: 'Tấm', set: 'folk', portrait: 1, look: L(1, 4, 'crown'), spot: 'market', rarity: 2,
    bio: 'Cô gái hiền lành, hóa thân qua chim vàng anh, cây xoan đào, quả thị rồi trở lại làm hoàng hậu.', quote: 'Bống bống bang bang, lên ăn cơm vàng cơm bạc nhà ta!',
    lines: ['Chợ làng mình vui quá!', 'Ngày xưa ta hay ra giếng thả cá bống.', 'Ăn ở hiền lành thì gặp điều lành.'],
    quests: [d('ca_bong', 1, 'Câu giúp ta một con cá bống'), d('orange', 3, 'Mang 3 quả cam (ta nhớ mùi quả thị)'), e('gift', 3, 'Tặng quà 3 dân làng cho vui')] },
  { id: 'chu_cuoi', name: 'Chú Cuội', set: 'folk', portrait: 2, look: L(3, 1, 'non_la'), spot: 'banyan', rarity: 3,
    bio: 'Ngồi gốc cây đa trên cung trăng, nổi tiếng nói dối không chớp mắt.', quote: 'Trâu ăn lúa? Không, trâu đang… tập thể dục!',
    lines: ['Ta vừa từ cung trăng xuống, thật đấy!', 'Cây đa làng này còn to hơn cây đa của ta… à không, nhỏ hơn.', 'Tin ta đi, lần này ta nói thật.'],
    quests: [e('water', 30, 'Tưới 30 ô cho cây cỏ quanh gốc đa'), e('collect', 3, 'Tìm giúp trâu bò: lấy 3 sản phẩm vật nuôi'), d('banh_trung_thu', 1, 'Làm 1 bánh trung thu gửi chị Hằng')] },
  { id: 'chi_hang', name: 'Chị Hằng', set: 'folk', portrait: 3, look: L(5, 5, 'bow'), spot: 'plaza', rarity: 3,
    bio: 'Tiên nữ ở cung trăng, mỗi rằm tháng Tám lại xuống chơi với trẻ con.', quote: 'Đèn ông sao sáng nhất là đèn của em nào?',
    lines: ['Trăng dưới làng cũng đẹp như trên trời.', 'Thỏ Ngọc nhà ta đang giã thuốc.', 'Em bé nào ngoan chị cho bánh nhé.'],
    quests: [d('star_lantern', 1, 'Mang 1 đèn ông sao cho trẻ trong làng'), e('cook', 2, 'Nấu 2 món cho bữa phá cỗ'), d('chrysanthemum', 1, 'Tặng chị một bông hoa cúc')] },
  { id: 'thach_sanh', name: 'Thạch Sanh', set: 'folk', portrait: 4, look: L(3, 7, null), spot: 'garden_gate', rarity: 2,
    bio: 'Chàng tiều phu gốc đa diệt chằn tinh, bắn đại bàng, có cây đàn thần.', quote: 'Niêu cơm này ăn hết lại đầy.',
    lines: ['Ta quen sống trong rừng, làng các ngươi ấm áp quá.', 'Có cần ta chặt củi giúp không?', 'Tiếng đàn ta khiến giặc phải lui.'],
    quests: [e('chop', 15, 'Chặt 15 cây lấy củi'), e('mine', 30, 'Đập 30 tảng đá dọn hang chằn tinh'), d('gem', 1, 'Tìm 1 viên đá quý làm dây đàn')] },
  { id: 'trang_quynh', name: 'Trạng Quỳnh', set: 'folk', portrait: 5, look: L(2, 9, null, 'glasses'), spot: 'dinh', rarity: 2,
    bio: 'Ông trạng thông minh, hóm hỉnh, hay trêu cả vua chúa bằng những câu đố oái oăm.', quote: 'Mầm đá ăn vào thì… no lâu!',
    lines: ['Ngươi đoán xem: con gì đầu dê mình ốc?', 'Muốn giàu thì phải chăm, muốn giỏi thì phải học.', 'Hôm nay ta chỉ đố, không lừa ai đâu.'],
    quests: [d('chili', 5, 'Mang 5 quả ớt, ta làm món "mầm đá"'), e('talk', 8, 'Đi hỏi chuyện 8 dân làng'), e('sell', 3000, 'Bán hàng được 3.000 xu (làm ăn giỏi)')] },
  { id: 'thang_bom', name: 'Thằng Bờm', set: 'folk', portrait: 6, look: L(1, 7, 'straw'), spot: 'dock', rarity: 1,
    bio: 'Có cái quạt mo, phú ông xin đổi ba bò chín trâu, Bờm chẳng đổi. Đưa nắm xôi, Bờm cười ngay.', quote: 'Bờm rằng Bờm chẳng lấy trâu!',
    lines: ['Quạt mo của tui không đổi đâu nha.', 'Có nắm xôi thì tui đổi liền!', 'Câu cá ở bến sông mát ghê.'],
    quests: [d('ca_me', 3, 'Câu 3 con cá mè cho Bờm'), d('wood', 20, 'Mang 20 gỗ làm cán quạt'), e('harvest', 20, 'Thu hoạch 20 nông sản')] },
  { id: 'son_tinh', name: 'Sơn Tinh', set: 'folk', portrait: 7, look: L(3, 1, 'crown'), spot: 'banyan', rarity: 2,
    bio: 'Thần núi Tản Viên, dời non dựng núi chống lũ, cưới được Mỵ Nương.', quote: 'Nước dâng bao nhiêu, núi cao bấy nhiêu!',
    lines: ['Ta mang lễ vật tới sớm nhất.', 'Đắp đê giữ ruộng là việc lớn.', 'Núi quê ta toàn đá tốt.'],
    quests: [d('rice_bag', 2, 'Mang 2 bao gạo nếp làm lễ vật'), d('stone', 50, 'Góp 50 đá đắp đê'), e('plant', 30, 'Gieo 30 hạt giữ đất')] },
  { id: 'thuy_tinh', name: 'Thủy Tinh', set: 'folk', portrait: 8, look: L(6, 9, 'crown'), spot: 'dock', rarity: 2,
    bio: 'Thần nước, hô mưa gọi gió, năm nào cũng dâng nước đòi cưới Mỵ Nương.', quote: 'Năm nay ta sẽ tới sớm hơn!',
    lines: ['Sông làng các ngươi hiền quá.', 'Ta thích cá tươi nhất.', 'Đừng lo, ta chỉ đến chơi thôi.'],
    quests: [e('fish', 10, 'Câu 10 con cá'), d('ca_loc', 2, 'Mang 2 con cá lóc'), e('water', 50, 'Tưới 50 ô (ta thích nước!)')] },
  { id: 'tao_quan', name: 'Táo Quân', set: 'folk', portrait: 9, look: L(2, 3, null, 'mustache'), spot: 'quan_in', rarity: 3,
    bio: 'Vua bếp, cưỡi cá chép về trời ngày 23 tháng Chạp báo chuyện nhà.', quote: 'Năm nay nhà ngươi làm ăn khấm khá chứ?',
    lines: ['Bếp nhà ai ấm, ta biết hết.', 'Cá chép là ngựa của ta đó.', 'Ghi chép cả năm mệt ghê!'],
    quests: [d('ca_chep', 1, 'Tìm 1 con cá chép để ta cưỡi'), e('cook', 3, 'Nấu 3 món cho bếp ấm'), e('sell', 5000, 'Bán hàng được 5.000 xu (ta ghi vào sổ)')] },
  { id: 'ong_dia', name: 'Ông Địa', set: 'folk', portrait: 10, look: L(1, 4, null, 'blush'), spot: 'market', rarity: 1,
    bio: 'Ông thần đất bụng to, cười hiền, phù hộ buôn may bán đắt.', quote: 'Hà hà, buôn may bán đắt nha!',
    lines: ['Đất làng này tốt lắm.', 'Có chuối không? Ta thích chuối.', 'Cười nhiều cho bụng to.'],
    quests: [d('banana', 3, 'Mang 3 quả chuối'), e('harvest', 30, 'Thu hoạch 30 nông sản'), e('gift', 5, 'Tặng quà 5 lần cho dân làng')] },
  { id: 'ngo_khong', name: 'Tôn Ngộ Không', set: 'folk', portrait: 11, look: L(4, 3, 'band'), spot: 'garden_gate', rarity: 3,
    bio: 'Mỹ Hầu Vương từ đá sinh ra, bảy mươi hai phép biến hóa (theo truyện cổ Tây Du Ký).', quote: 'Lão Tôn đến đây!',
    lines: ['Vườn đào của Ngọc Hoàng còn thua vườn ngươi.', 'Gậy của ta nặng mười ba nghìn cân.', 'Ta nhảy một cái là tới chợ huyện.'],
    quests: [d('mango', 3, 'Hái 3 quả xoài (thay đào tiên)'), e('mine', 40, 'Đập 40 tảng đá'), e('chop', 10, 'Chặt 10 cây')] },
  // ---------------------------------------------------------------- nhân vật tự thiết kế
  { id: 'meo_may', name: 'Mèo Máy Tí Hon', set: 'star', portrait: 12, look: L(3, 4, 'cap', 'glasses'), spot: 'plaza', rarity: 3,
    bio: 'Chú mèo máy màu cam từ tương lai, bụng có ngăn kéo đựng đồ nghề sửa chữa.', quote: 'Bíp bíp! Để tui sửa cho!',
    lines: ['Tui đến từ năm 3026, bíp!', 'Vòi tưới làng mình còn thô sơ quá.', 'Có ốc vít nào không?'],
    quests: [e('craft', 3, 'Chế tạo 3 món'), d('ore_copper', 10, 'Mang 10 quặng đồng làm linh kiện'), d('sprinkler', 1, 'Tặng tui 1 vòi tưới để nghiên cứu')] },
  { id: 'son_ca', name: 'Siêu sao Sơn Ca', set: 'star', portrait: 13, look: L(1, 8, 'flower'), spot: 'quan_in', rarity: 3,
    bio: 'Ca sĩ nổi tiếng khắp huyện, giọng hót như chim sơn ca. Tối thứ Bảy diễn ở rạp hát.', quote: 'Cả làng cùng hát nào!',
    lines: ['Tối thứ Bảy ghé rạp hát chợ huyện nha!', 'Mật ong giúp giữ giọng đó.', 'Làng mình là nơi đẹp nhất để hát.'],
    quests: [d('honey', 2, 'Mang 2 hũ mật ong giữ giọng'), d('sunflower', 3, 'Mang 3 bông hướng dương trang trí sân khấu'), e('talk', 6, 'Mời 6 dân làng tới xem diễn')] },
  { id: 'thanh_sut', name: 'Thánh Sút', set: 'star', portrait: 14, look: L(3, 3, 'band'), spot: 'field', rarity: 2,
    bio: 'Cầu thủ quê ra phố, sút đâu trúng đó, về làng tập luyện mùa nghỉ.', quote: 'Vàooooo!',
    lines: ['Sân làng hơi gồ ghề, phải cuốc cho phẳng.', 'Dưa hấu là món giải khát số một!', 'Chạy ba vòng làng mỗi sáng.'],
    quests: [e('till', 30, 'Cuốc 30 ô cho phẳng sân'), d('watermelon', 2, 'Mang 2 quả dưa hấu giải khát'), d('egg', 5, 'Mang 5 quả trứng bồi bổ')] },
  { id: 'chef_tung', name: 'Chef Tùng', set: 'star', portrait: 15, look: L(1, 5, 'chef', 'mustache'), spot: 'quan_in', rarity: 2,
    bio: 'Đầu bếp truyền hình, đi khắp nơi tìm món quê ngon nhất.', quote: 'Nêm nếm vừa ăn là thành công một nửa!',
    lines: ['Quán chị Lan nấu ngon ghê.', 'Tui đang tìm nguyên liệu lạ.', 'Nấu ăn bằng cả trái tim nha.'],
    quests: [e('cook', 5, 'Nấu 5 món'), d('tomato', 5, 'Mang 5 quả cà chua tươi'), d('truffle', 1, 'Tìm 1 nấm truffle quý')] },
  { id: 'streamer_gau', name: 'Streamer Gấu', set: 'star', portrait: 16, look: L(4, 6, 'beanie'), spot: 'plaza', rarity: 1,
    bio: 'Gấu nhỏ quay phim cuộc sống làng quê cho cả nước xem.', quote: 'Nhớ bấm theo dõi nha mọi người!',
    lines: ['Hôm nay livestream câu cá!', 'Mật ong là món khoái khẩu của gấu.', 'Nông trại của bạn lên hình đẹp lắm.'],
    quests: [d('honey', 3, 'Mang 3 hũ mật ong'), e('fish', 5, 'Câu 5 con cá cho buổi quay'), e('gift', 3, 'Tặng 3 món quà để quay clip')] },
  { id: 'ao_thuat_gia', name: 'Ảo thuật gia Bí Ẩn', set: 'star', portrait: 17, look: L(5, 6, null, 'sunglasses'), spot: 'dinh', rarity: 2,
    bio: 'Không ai biết mặt thật; biến đá thành hoa, biến hoa thành bồ câu.', quote: 'Nhìn kỹ nhé… biến!',
    lines: ['Ta cần một viên đá lấp lánh cho màn diễn.', 'Bí mật nghề nghiệp, không nói được.', 'Bạn có tin vào phép màu không?'],
    quests: [d('gem', 1, 'Tìm 1 viên đá quý'), e('mine', 25, 'Đập 25 tảng đá tìm đá phép'), d('star_lantern', 1, 'Mang 1 đèn ông sao làm đạo cụ')] },
  { id: 'nu_hiep', name: 'Nữ hiệp Áo Dài', set: 'star', portrait: 18, look: L(1, 3, 'bow'), spot: 'garden_gate', rarity: 2,
    bio: 'Võ sĩ áo dài đi khắp nơi giúp người yếu, bảo vệ làng quê.', quote: 'Việc nghĩa không từ nan!',
    lines: ['Làng có ai bắt nạt ai không?', 'Luyện võ phải luyện cả tâm.', 'Áo dài là niềm tự hào.'],
    quests: [e('chop', 10, 'Chặt 10 cây dọn đường núi'), d('ore_gold', 2, 'Tìm 2 quặng vàng đúc kiếm'), e('talk', 5, 'Hỏi thăm 5 dân làng')] },
  { id: 'rapper_vit', name: 'Rapper Vịt', set: 'star', portrait: 19, look: L(5, 6, 'cap', 'sunglasses'), spot: 'plaza', rarity: 1,
    bio: 'Vịt chạy bộ thành rapper, bài hit "Cạp cạp quê nhà" triệu lượt nghe.', quote: 'Yo! Cạp cạp!',
    lines: ['Beat này tên là "Ruộng lúa", yo!', 'Trứng vịt là nguồn cảm hứng.', 'Rap về làng mình nè!'],
    quests: [d('duck_egg', 3, 'Mang 3 quả trứng vịt'), e('talk', 8, 'Lấy cảm hứng: trò chuyện 8 dân làng'), e('sell', 2000, 'Bán hàng được 2.000 xu mua loa')] },
  { id: 'bac_si_meo', name: 'Bác Sĩ Mèo', set: 'star', portrait: 20, look: L(5, 5, null, 'glasses'), spot: 'garden_gate', rarity: 2,
    bio: 'Bác sĩ thú y về làng khám miễn phí cho gà, bò, trâu.', quote: 'Thú cưng khỏe thì chủ vui!',
    lines: ['Vật nuôi nhà bạn có khỏe không?', 'Tỏi tốt cho sức khỏe lắm.', 'Thầy Lang với tui hay bàn thuốc.'],
    quests: [d('tonic', 2, 'Mang 2 thuốc bổ'), e('collect', 5, 'Lấy 5 sản phẩm vật nuôi (khám tại chỗ)'), d('garlic', 3, 'Mang 3 củ tỏi')] },
  { id: 'phi_cong_co', name: 'Phi công Cò', set: 'star', portrait: 21, look: L(5, 9, 'beanie', 'glasses'), spot: 'dock', rarity: 2,
    bio: 'Con cò bay khắp đồng, làm phi công chở thư cho làng.', quote: 'Chuẩn bị cất cánh!',
    lines: ['Từ trên cao, ruộng làng đẹp như bức tranh.', 'Cò thích cá đồng nhất.', 'Thư của bạn tui chở hết!'],
    quests: [e('fish', 8, 'Câu 8 con cá'), d('rice', 10, 'Mang 10 bó lúa nước'), e('water', 40, 'Tưới 40 ô đồng')] },
  { id: 'hoa_hau_sen', name: 'Hoa hậu Sen', set: 'star', portrait: 22, look: L(7, 8, 'crown'), spot: 'market', rarity: 3,
    bio: 'Hoa hậu áo dài, đi khắp nơi quảng bá làng nghề và nông sản quê.', quote: 'Nông sản quê mình là số một!',
    lines: ['Hoa làng mình đẹp quá.', 'Mứt dâu là quà tặng tuyệt vời.', 'Cùng quảng bá nông sản nhé!'],
    quests: [d('chrysanthemum', 2, 'Mang 2 bông cúc'), d('pres_strawberry', 1, 'Mang 1 hũ mứt dâu'), e('gift', 4, 'Tặng 4 món quà cho dân làng')] },
  { id: 'thay_vo_rong', name: 'Thầy võ Rồng', set: 'star', portrait: 23, look: L(3, 4, 'band', 'mustache'), spot: 'banyan', rarity: 2,
    bio: 'Võ sư già dạy võ cổ truyền cho trẻ con trong làng.', quote: 'Tấn phải vững như gốc đa!',
    lines: ['Đập đá cũng là luyện quyền.', 'Trẻ con làng này lanh lợi lắm.', 'Học võ để giữ mình, không để đánh người.'],
    quests: [e('mine', 30, 'Đập 30 tảng đá luyện quyền'), e('chop', 15, 'Chặt 15 cây luyện chưởng'), e('harvest', 40, 'Thu hoạch 40 nông sản luyện sức')] },
];

export const GUEST = Object.fromEntries(GUESTS.map((g) => [g.id, g])) as Record<string, Guest>;
export const FOLK = GUESTS.filter((g) => g.set === 'folk');
export const STARS = GUESTS.filter((g) => g.set === 'star');
export const SET_NAME = { folk: 'Truyện cổ tích', star: 'Ngôi sao làng' } as const;
/** Thưởng đủ bộ 12 thẻ. */
export const SET_REWARD = {
  folk: { money: 20000, items: [['deco_statue', 2]] as [ItemId, number][], text: '20.000 xu + 2 tượng nghê đá' },
  star: { money: 20000, items: [['deco_windmill', 2]] as [ItemId, number][], text: '20.000 xu + 2 cối xay gió nhỏ' },
};
