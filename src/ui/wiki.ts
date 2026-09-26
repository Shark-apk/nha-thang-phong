// Bách khoa (phím J / nút Sổ tay): cây trồng, món ăn, dân làng, quái trong hang; và dòng thông tin khi xem một món đồ.
import { CLAY_LOVERS, CROPS, DISHES, HYBRIDS, ITEMS, NPCS, RED_ONLY, SAND_LOVERS, SEASON_NAME, TRELLIS, GIANT, type CropDef, type ItemId } from '../data';
import type { FarmState } from '../game/farm';
import { SEASON_DAYS } from '../game/farm';
import { knowsDish } from '../game/activities';
import { npcHearts } from '../game/villagers';
import { MONSTERS } from '../game/regions';
import { iconStyle } from './hud';

export type WikiTab = 'crops' | 'dishes' | 'npcs' | 'mine';

const days = (c: CropDef) => c.stageDays[c.stageDays.length - 1];

/** Lời mỗi ô mỗi ngày trong một mùa (trừ tiền hạt), tính cả cây mọc lại. */
export function cropProfit(c: CropDef) {
  const seed = Object.values(ITEMS).find((i) => i.crop === c.id);
  const sell = (ITEMS[c.harvest]?.sell ?? 0) * c.yield;
  const d = days(c);
  const harvests = c.regrow ? 1 + Math.max(0, Math.floor((SEASON_DAYS - d) / c.regrow)) : 1;
  const span = c.regrow ? SEASON_DAYS : d;
  return Math.round(((harvests * sell) - (seed?.buy ?? 0)) / span);
}

function soilNote(id: string) {
  if (RED_ONLY.has(id)) return 'chỉ mọc trên đất đỏ';
  if (SAND_LOVERS.has(id)) return 'hợp đất cát (lớn nhanh)';
  if (CLAY_LOVERS.has(id)) return 'hợp đất sét';
  return '';
}

export function cropLine(c: CropDef) {
  const where = c.sky ? 'vườn trên mây, mọi mùa' : c.seasons.map((x) => SEASON_NAME[x]).join(', ');
  const bits = [where, `${days(c)} ngày`, c.regrow ? `mọc lại sau ${c.regrow} ngày` : '', c.paddy ? 'ruộng nước' : '', TRELLIS.has(c.id) ? 'leo giàn' : '',
    GIANT.has(c.id) ? 'có thể thành trái khổng lồ' : '', soilNote(c.id), `bán ${ITEMS[c.harvest]?.sell ?? 0} xu`, `~${cropProfit(c)} xu/ô/ngày`];
  return bits.filter(Boolean).join(' · ');
}

/** Dòng thông tin ngắn cho một món (chú thích ô đồ, nhấn giữ trên điện thoại). */
export function itemInfo(id: ItemId) {
  const it = ITEMS[id];
  if (!it) return '';
  if (it.kind === 'seed' && it.crop && CROPS[it.crop]) return `${it.name}: ${cropLine(CROPS[it.crop])}`;
  const crop = Object.values(CROPS).find((c) => c.harvest === id);
  const bits = [it.energy ? `ăn hồi ${it.energy} sức` : '', it.sell ? `bán ${it.sell} xu` : '', crop ? `trồng từ ${crop.name.toLowerCase()} (${crop.seasons.map((x) => SEASON_NAME[x]).join(', ')})` : ''];
  return `${it.name}${bits.some(Boolean) ? ': ' + bits.filter(Boolean).join(' · ') : ''}`;
}

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const row = (icon: string, title: string, sub: string) => `<div class="shop__row"><i style='${icon}'></i><div><b>${esc(title)}</b><span>${sub}</span></div></div>`;
const names = (ids: ItemId[]) => ids.map((i) => ITEMS[i]?.name ?? i).join(', ');

/** Nội dung một tab bách khoa (HTML). */
export function wikiHtml(s: FarmState, tab: WikiTab, filter = '') {
  const f = filter.trim().toLowerCase();
  const hit = (t: string) => !f || t.toLowerCase().includes(f);
  if (tab === 'crops') {
    const hybrid = new Set(HYBRIDS.map((h) => h.id));
    const list = Object.values(CROPS).filter((c) => !hybrid.has(c.id) || s.hybrids?.includes(c.id)).filter((c) => hit(c.name));
    list.sort((a, b) => cropProfit(b) - cropProfit(a));
    return `<p>Xếp theo lời mỗi ô mỗi ngày (đã trừ tiền hạt, chất lượng thường).</p>` + list.map((c) => row(iconStyle(c.harvest), c.name, cropLine(c))).join('');
  }
  if (tab === 'dishes') {
    return DISHES.filter((d) => hit(d.name)).map((d) => knowsDish(s, d.id)
      ? row(iconStyle(d.id), d.name, `${d.needs.map(([it, n]) => `${n} ${ITEMS[it]?.name.toLowerCase() ?? it}`).join(' + ')} · hồi ${d.energy} sức · bán ${d.sell} xu`)
      : row(iconStyle(d.id), '???', 'chưa biết công thức — dân làng sẽ chỉ khi thân')).join('');
  }
  if (tab === 'npcs') {
    return `<p>Món thích nhất hiện ra khi được 2 tim, món thích khi 4 tim.</p>` + NPCS.filter((n) => hit(n.name)).map((n) => {
      const h = npcHearts(s, n.id);
      const loves = h >= 2 ? names(n.loves) : '??? (2 tim)';
      const likes = h >= 4 ? names(n.likes) : '??? (4 tim)';
      return `<div class="shop__row"><div><b>${n.name} · ${n.role}</b><span>${h} tim · sinh nhật ${SEASON_NAME[n.birthday.season]} ${n.birthday.day}</span><span>Thích nhất: ${loves}</span><span>Thích: ${likes}</span></div></div>`;
    }).join('');
  }
  return `<p>Hang sâu mở ở cấp nông trại 10, lối xuống ở góc hang đá. Hết máu thì ngất, mất 10% tiền (tối đa 1.000 xu).</p>` + Object.values(MONSTERS).map((m) =>
    `<div class="shop__row"><div><b>${m.name}</b><span>${m.hp} máu · đánh mất ${m.damage} máu · ${m.name === 'Dơi' ? 'bay xuyên đá, từ tầng 2' : m.name === 'Người đá' ? 'từ tầng 20, rơi quặng vàng' : 'từ tầng 2, hay rơi quặng sắt'}</span></div></div>`).join('')
    + `<div class="shop__row"><div><b>Tầng sâu nhất của bạn: ${s.mineDeepest ?? 1}</b><span>Thang máy mỗi 5 tầng · rương báu ở tầng 10, 20, 30 · đá quý từ tầng 15</span></div></div>`;
}
