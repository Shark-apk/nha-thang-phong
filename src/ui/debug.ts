// Bảng debug (phím F9) — chỉ có khi chạy `npm run dev`, không có trong bản build.
import type Phaser from 'phaser';
import { addItem, DAY_END, dayOfSeason, SEASON_DAYS, type Weather } from '../game/farm';
import { maxEnergyOf } from '../game/skills';
import { maxWater } from '../game/resources';
import { CROPS, SHOP } from '../data';
import { clearSave } from '../game/save';
import { WorldScene } from '../game/WorldScene';

export function mountDebug(game: Phaser.Game) {
  const panel = document.createElement('div');
  panel.className = 'debug';
  panel.hidden = true;
  const style = document.createElement('style');
  style.textContent = `
    .debug { position: fixed; left: 14px; top: 70px; z-index: 50; width: 260px; padding: 12px; background: #1d1620ee; color: #f4e7c8;
      border: 3px solid #c0563b; border-radius: 10px; font-family: var(--font); font-size: 20px; display: flex; flex-direction: column; gap: 6px; }
    .debug[hidden] { display: none; }
    .debug b { font-weight: normal; color: #f0b474; font-size: 24px; }
    .debug button { height: 34px; font-family: var(--font); font-size: 20px; text-align: left; padding: 0 10px; background: #3b2a2e; color: #f4e7c8;
      border: 2px solid #6b4f36; border-radius: 6px; cursor: pointer; }
    .debug button:hover { border-color: #f0b474; }
    .debug small { color: #b9a584; font-size: 17px; }`;
  document.head.append(style);
  document.body.append(panel);

  const scene = () => game.scene.getScenes(true).find((s): s is WorldScene => s instanceof WorldScene);
  const act = (fn: (s: WorldScene) => void) => () => {
    const s = scene();
    if (!s) return;
    fn(s);
    s.debugRefresh();
    render();
  };
  const actions: [string, (s: WorldScene) => void][] = [
    ['Qua đêm (ngủ ngay)', (s) => s.goToSleep(false)],
    ['Sang mùa sau', (s) => { const st = s.debugState(); st.day += SEASON_DAYS - dayOfSeason(st.day); s.goToSleep(false); }],
    ['Đổi thời tiết (mai)', (s) => { const st = s.debugState(); const order: Weather[] = ['sunny', 'rain', 'storm', 'windy', 'snow']; st.tomorrow = order[(order.indexOf(st.tomorrow) + 1) % order.length]; }],
    ['Cây ăn trái lớn & có trái', (s) => { for (const t of Object.values(s.debugState().trees)) { t.age = 99; t.fruit = 3; } }],
    ['Tua +2 giờ', (s) => { const st = s.debugState(); st.minutes = Math.min(DAY_END - 10, st.minutes + 120); }],
    ['+1.000 xu', (s) => { s.debugState().money += 1000; }],
    ['Đầy sức & nước', (s) => { const st = s.debugState(); st.energy = maxEnergyOf(); st.water = maxWater(st); }],
    ['Tưới hết ruộng', (s) => { for (const t of Object.values(s.debugState().tilled)) t.watered = true; }],
    ['Cây chín hết', (s) => { for (const c of Object.values(s.debugState().crops)) c.grown = CROPS[c.id].stageDays.at(-1)!; }],
    ['+50 gỗ, đá, quặng', (s) => { for (const id of ['wood', 'stone', 'ore_copper', 'ore_iron', 'ore_gold']) addItem(s.debugState(), id, 50); }],
    ['Máy làm xong ngay', (s) => { for (const o of Object.values(s.debugState().objects)) if (o.out) o.readyDay = 0; }],
    ['Vào hang đá', (s) => s.travel('mine', 'entry')],
    ['Tới Tết (Xuân 3, 10h) ở làng', (s) => { const st = s.debugState(); st.day = Math.floor((st.day - 1) / 56) * 56 + 3; st.minutes = 600; s.travel('village', 'from_farm'); }],
    ['Tới Trung Thu (Thu 8, 19h) ở làng', (s) => { const st = s.debugState(); st.day = Math.floor((st.day - 1) / 56) * 56 + 28 + 8; st.minutes = 1140; s.travel('village', 'from_farm'); }],
    ['Cần câu + bếp + nhà kính', (s) => { const st = s.debugState(); addItem(st, 'rod_3', 1); for (const f of ['kitchen', 'b_river', 'recipe_canh_chua', 'legend_fish']) if (!st.flags.includes(f)) st.flags.push(f); st.greenhouseDay = st.day; }],
    ['+10 hạt mỗi loại', (s) => { for (const id of SHOP) addItem(s.debugState(), id, 10); }],
    ['Về nông trại', (s) => s.travel('farm', 'door')],
    ['Vào nhà', (s) => s.travel('house', 'door')],
  ];
  const info = document.createElement('small');
  const render = () => {
    const s = scene()?.debugState();
    info.textContent = s ? `Ngày ${s.day} · ${s.location} · ${Object.keys(s.crops).length} cây · ${s.money} xu` : '';
  };
  panel.innerHTML = '<b>Debug (F9)</b>';
  for (const [label, fn] of actions) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.onclick = act(fn);
    panel.append(b);
  }
  const reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = 'Xóa lưu & chơi lại';
  reset.onclick = () => { clearSave(); location.reload(); };
  panel.append(reset, info);

  window.addEventListener('keydown', (e) => {
    if (e.key !== 'F9') return;
    e.preventDefault();
    panel.hidden = !panel.hidden;
    render();
  });
}
