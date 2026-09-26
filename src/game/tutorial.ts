// Hướng dẫn ngày 1–3: mỗi bước một việc, tự qua bước khi người chơi làm xong.
import { countItem, type FarmState } from './farm';

export interface Step { text: string; done: (s: FarmState) => boolean }

export const STEPS: Step[] = [
  { text: 'Cầm <b>cuốc</b> (phím 1), đứng trước ô cỏ trong ruộng có rào rồi bấm <kbd>Space</kbd> để cuốc đất.', done: (s) => Object.keys(s.tilled).length > 0 },
  { text: 'Chọn <b>hạt cà rốt</b> (phím 3), bấm vào ô vừa cuốc để gieo.', done: (s) => Object.keys(s.crops).length > 0 },
  { text: 'Cầm <b>bình tưới</b> (phím 2) tưới ô vừa gieo. Hết nước thì ra giếng hoặc ao lấy thêm.', done: (s) => Object.entries(s.crops).some(([k]) => s.tilled[k]?.watered) },
  { text: 'Làm xong thì vào nhà, bấm vào <b>giường</b> để ngủ. Cây đã tưới sẽ lớn qua đêm, game tự lưu.', done: (s) => s.day >= 2 },
  { text: 'Sáng nào cũng nhớ tưới cây. Cà rốt chín sau 4 lần tưới. Trong lúc chờ, đi ra <b>mép đông</b> nông trại để sang làng.', done: (s) => s.location === 'village' },
  { text: 'Chào <b>bà Tư</b> ở chợ (bấm vào bà). Bà bán hạt giống ở sạp chợ từ 8h tới 17h.', done: (s) => (s.npcs.ba_tu?.talkedDay ?? 0) > 0 },
  { text: 'Cầm <b>rìu</b> (phím 4) chặt cây lấy gỗ, hoặc <b>cuốc chim</b> (phím 5) đập đá trong hang ở góc đông bắc nông trại.', done: (s) => countItem(s, 'wood') + countItem(s, 'stone') > 0 },
  { text: 'Thu hoạch cà rốt chín, bỏ vào <b>rương</b> cạnh nhà để bán — tiền về sáng hôm sau.', done: (s) => s.shipping.length > 0 || s.lastIncome > 0 },
  { text: 'Xong phần hướng dẫn! <kbd>K</kbd> chế tạo · <kbd>I</kbd> túi đồ · <kbd>R</kbd> dân làng · <kbd>C</kbd> lịch · <kbd>B</kbd> bạn bè · <kbd>H</kbd> xem phím. Chúc vui!', done: () => false },
];

/** Qua các bước đã xong; trả về true nếu có đổi bước. */
export function advanceTutorial(s: FarmState) {
  if (s.tutorial < 0 || s.tutorial >= STEPS.length) return false;
  let moved = false;
  while (s.tutorial < STEPS.length - 1 && STEPS[s.tutorial].done(s)) {
    s.tutorial++;
    moved = true;
  }
  return moved;
}

export const tutorialText = (s: FarmState) => (s.tutorial >= 0 && s.tutorial < STEPS.length ? STEPS[s.tutorial].text : null);
export const isLastStep = (s: FarmState) => s.tutorial === STEPS.length - 1;
