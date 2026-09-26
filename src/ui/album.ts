// Bộ sưu tập (mở từ sảnh): thẻ khách mời 2 bộ, sổ cá, món ăn đã nấu.
import { CROPS, DISHES, FISH, GUESTS, HYBRIDS, ITEMS, SET_NAME, SET_REWARD, type Guest } from '../data';
import type { FarmState } from '../game/farm';
import { countItem } from '../game/farm';
import { claimSet, currentQuest, deliverGuest, guestState, hasCard, questText, setCount, weekGuests } from '../game/guests';
import { session, touchProfile } from '../game/session';
import { iconStyle } from './hud';
import { sfx } from '../audio/sound';

type Tab = 'guests' | 'fish' | 'dishes' | 'hybrids';

export interface AlbumHost {
  withSlot: <T>(fn: (s: FarmState | null) => T) => T;
  say: (msg: string) => void;
}

const face = (g: Guest, size: number, lock: boolean) =>
  `<i class="al-face" style="width:${size}px;height:${size}px;background-size:${size * 12}px ${size * 2}px;background-position:-${(g.portrait % 12) * size}px -${Math.floor(g.portrait / 12) * size}px;${lock ? 'filter:brightness(0) opacity(0.3)' : ''}"></i>`;

export function openAlbum(parent: HTMLElement, host: AlbumHost, start: Tab = 'guests') {
  const p = session.profile;
  let tab: Tab = start;
  const week = weekGuests().map((g) => g.id);
  let sel = week[0];
  const el = document.createElement('div');
  el.className = 'lobby__modal charpage';
  parent.append(el);

  const guestsTab = () => {
    const g = GUESTS.find((x) => x.id === sel)!;
    const st = guestState(p, g.id);
    const own = hasCard(p, g.id);
    const q = currentQuest(p, g.id);
    const s = host.withSlot((x) => x);
    const canGive = !!s && st.accepted && q?.kind === 'deliver' && countItem(s, q.item) >= q.qty;
    const sets = (['folk', 'star'] as const).map((set) => {
      const n = setCount(p, set);
      const claimed = p.setsClaimed.includes(set);
      return `<div class="al-set"><div class="al-set__head"><b>Bộ ${SET_NAME[set]} · ${n}/12</b><span>${claimed ? 'đã nhận thưởng' : `Đủ bộ: ${SET_REWARD[set].text}`}</span>${n >= 12 && !claimed ? `<button type="button" class="btn btn--primary" data-set="${set}">Nhận</button>` : ''}</div>
        <div class="al-grid">${GUESTS.filter((x) => x.set === set).map((x) => `<button type="button" class="al-card ${hasCard(p, x.id) ? 'al-card--own' : ''} ${x.id === sel ? 'al-card--sel' : ''} ${week.includes(x.id) ? 'al-card--week' : ''}" data-g="${x.id}">${face(x, 64, !hasCard(p, x.id) && !week.includes(x.id))}<span>${hasCard(p, x.id) || week.includes(x.id) ? x.name : '???'}</span></button>`).join('')}</div></div>`;
    }).join('');
    const detail = `<div class="al-detail">${face(g, 192, !own && !week.includes(g.id))}
      <h3>${own || week.includes(g.id) ? g.name : '???'} <small>${'★'.repeat(g.rarity)}</small></h3>
      ${own || week.includes(g.id) ? `<p>${g.bio}</p><p class="al-quote">"${g.quote}"</p>` : '<p>Chưa gặp — khách này sẽ ghé làng vào một tuần khác.</p>'}
      ${week.includes(g.id) ? '<p class="al-week">Đang ghé làng tuần này (8h–20h)</p>' : ''}
      ${own ? '<p class="al-done">✓ Đã có thẻ</p>' : st.accepted || st.step > 0 ? `<ol class="al-steps">${g.quests.map((qq, i) => `<li class="${i < st.step ? 'done' : i === st.step ? 'now' : ''}">${i === st.step ? questText(p, g.id) : qq.text}</li>`).join('')}</ol>` : week.includes(g.id) ? '<p>Ra làng gặp để nhận việc.</p>' : ''}
      ${canGive ? `<button type="button" class="btn btn--primary" data-give="${g.id}">Giao ${q.qty} ${ITEMS[q.item].name.toLowerCase()}</button>` : ''}
    </div>`;
    return `<div class="al-wrap"><div>${sets}</div>${detail}</div>`;
  };

  const fishTab = () => {
    const s = host.withSlot((x) => x);
    const got = FISH.filter((f) => s?.fishCaught[f.id]).length;
    return `<p>Đã câu ${got}/${FISH.length} loại (ô lưu đang chọn).</p><div class="al-items">${FISH.map((f) => {
      const n = s?.fishCaught[f.id] ?? 0;
      return `<div class="al-item ${n ? '' : 'al-item--lock'}"><i style='${iconStyle(f.id)}'></i><b>${n ? f.name : '???'}</b><small>${n ? `câu ${n} lần` : ''}</small></div>`;
    }).join('')}</div>`;
  };

  const dishTab = () => {
    const s = host.withSlot((x) => x);
    const done = s?.stats.dishes ?? [];
    return `<p>Đã nấu ${DISHES.filter((d) => done.includes(d.id)).length}/${DISHES.length} món.</p><div class="al-items">${DISHES.map((d) => `<div class="al-item ${done.includes(d.id) ? '' : 'al-item--lock'}"><i style='${iconStyle(d.id)}'></i><b>${done.includes(d.id) ? d.name : '???'}</b></div>`).join('')}</div>`;
  };

  const hybridTab = () => {
    const s = host.withSlot((x) => x);
    const found = s?.hybrids ?? [];
    return `<p>Sổ lai giống: tìm ra ${found.length}/${HYBRIDS.length}. Hai cây khác loại chín cạnh nhau đôi khi cho hạt lai (nghề Nhà lai giống gấp đôi cơ hội).</p><div class="al-items">${HYBRIDS.map((h) => {
      const on = found.includes(h.id);
      return `<div class="al-item ${on ? '' : 'al-item--lock'}"><i style='${iconStyle(h.id)}'></i><b>${on ? CROPS[h.id].name : '???'}</b><small>${ITEMS[CROPS[h.a].harvest].name} + ${on ? ITEMS[CROPS[h.b].harvest].name : '?'}</small></div>`;
    }).join('')}</div>`;
  };

  const render = () => {
    el.innerHTML = `<div class="panel cp"><div class="cp-head"><h2>Bộ sưu tập · thẻ ${p.cards.length}/${GUESTS.length}</h2><div class="tabs">${[['guests', 'Khách mời'], ['fish', 'Cá'], ['dishes', 'Món ăn'], ['hybrids', 'Giống lai']].map(([id, n]) => `<button type="button" class="tab ${tab === id ? 'tab--on' : ''}" data-tab="${id}">${n}</button>`).join('')}</div></div>
      <div class="cp-body">${tab === 'guests' ? guestsTab() : tab === 'fish' ? fishTab() : tab === 'dishes' ? dishTab() : hybridTab()}</div>
      <div class="row"><button type="button" class="btn btn--primary" data-close>Đóng</button></div></div>`;
  };

  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!b || b.hasAttribute('disabled')) return;
    const d = b.dataset;
    if (d.tab) { tab = d.tab as Tab; return render(); }
    if (d.g) { sel = d.g; return render(); }
    if ('close' in d) return el.remove();
    let msg: string | null = null;
    if (d.give) msg = host.withSlot((s) => (s ? deliverGuest(p, s, d.give!) : null));
    if (d.set) msg = host.withSlot((s) => claimSet(p, s, d.set as 'folk'));
    if (msg) { touchProfile(true); sfx('catch'); host.say(`Nhận ${msg}`); }
    render();
  });
  render();
}
