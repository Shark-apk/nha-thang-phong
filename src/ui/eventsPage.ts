// Trang sự kiện (mở từ sảnh): sự kiện đang diễn ra (nhiệm vụ + đổi tem), sổ mùa 30 bậc, lịch sự kiện cả năm.
import { ITEMS, pieceName } from '../data';
import type { FarmState } from '../game/farm';
import {
  activeEvent, buyEventItem, claimEventQuest, claimPassTier, EVENTS, eventProgress, nextEvent, PASS, passState, passTier, timeLeft,
} from '../game/events';
import { session, touchProfile } from '../game/session';
import { sfx } from '../audio/sound';

type Tab = 'event' | 'pass' | 'calendar';
const ddmm = (md: string) => `${md.slice(3)}/${md.slice(0, 2)}`;

export interface EventsHost {
  withSlot: <T>(fn: (s: FarmState | null) => T) => T;
  say: (msg: string) => void;
}

const tierLabel = (i: number) => {
  const t = PASS.tiers[i];
  if (t.money) return `${t.money} xu`;
  if (t.tem) return `${t.tem} tem`;
  if (t.item) return `${t.qty ?? 1} ${ITEMS[t.item].name.toLowerCase()}`;
  return pieceName(t.piece!);
};

export function openEvents(parent: HTMLElement, host: EventsHost, start?: Tab) {
  const p = session.profile;
  const ev = activeEvent();
  let tab: Tab = start ?? (ev ? 'event' : 'pass');
  const el = document.createElement('div');
  el.className = 'lobby__modal charpage';
  parent.append(el);

  const eventTab = () => {
    if (!ev) {
      const n = nextEvent();
      return `<p>Hiện chưa có sự kiện. ${n ? `Sắp tới: <b>${n.ev.name}</b> (${ddmm(n.ev.start)}), còn ${n.days} ngày.` : ''}</p>`;
    }
    const pr = eventProgress(p, ev);
    const left = timeLeft(ev);
    return `<div class="ev-banner" style="background:${ev.color}"><small>ĐANG DIỄN RA · ${ddmm(ev.start)} – ${ddmm(ev.end)}</small><h2>${ev.name}</h2><p>${ev.intro}</p><b>Còn ${left.days} ngày ${left.hours} giờ</b></div>
      <div class="ev-cols"><div><h3>Nhiệm vụ sự kiện</h3>${ev.quests.map((q, i) => {
        const done = pr.progress[i] >= q.n;
        const got = pr.claimed.includes(i);
        return `<div class="q-row ${got ? 'q-row--claimed' : ''}"><div class="q-main"><span>${q.text}</span><span class="q-bar"><span style="width:${(pr.progress[i] / q.n) * 100}%"></span></span></div>${got ? '<span class="q-done">✓</span>' : done ? `<button type="button" class="btn btn--primary" data-evq="${i}">+${q.tem} tem</button>` : `<span class="q-count">${pr.progress[i].toLocaleString('vi-VN')}/${q.n.toLocaleString('vi-VN')}</span>`}</div>`;
      }).join('')}</div>
      <div><h3>Đổi tem · bạn có ${p.tem} tem</h3>${ev.shop.map((it, i) => {
        const bought = pr.bought.includes(i) || ((it.kind === 'piece' || it.kind === 'pet') && p.wardrobe.includes(it.id));
        return `<div class="q-row"><div class="q-main"><span>${it.name}${it.qty ? ` ×${it.qty}` : ''}</span><small>${it.kind === 'piece' ? 'vào tủ đồ' : it.kind === 'pet' ? 'thú cưng mới' : 'vào túi đồ'}</small></div>${bought ? '<span class="q-done">đã có</span>' : `<button type="button" class="btn" data-buy="${i}" ${p.tem >= it.price ? '' : 'disabled'}>${it.price} tem</button>`}</div>`;
      }).join('')}</div></div>`;
  };

  const passTab = () => {
    const ps = passState(p);
    const tier = passTier(ps.points);
    return `<p>Sổ mùa quý này (${ps.key}): <b>bậc ${tier}/${PASS.tiers.length}</b> · ${ps.points % PASS.pointsPerTier}/${PASS.pointsPerTier} điểm tới bậc sau. Điểm từ điểm danh, nhiệm vụ ngày/tuần, nhiệm vụ sự kiện. Miễn phí, không có bản trả tiền.</p>
      <div class="pass">${PASS.tiers.map((_, i) => {
        const n = i + 1;
        const got = ps.claimed.includes(n);
        const ready = n <= tier && !got;
        return `<button type="button" class="pass__tier ${got ? 'pass--got' : ready ? 'pass--ready' : n <= tier ? '' : 'pass--lock'}" data-tier="${n}" ${ready ? '' : 'disabled'}><b>Bậc ${n}</b><span>${tierLabel(i)}</span>${got ? '<small>✓</small>' : ready ? '<small>Nhận</small>' : ''}</button>`;
      }).join('')}</div>`;
  };

  const calendarTab = () => `<div class="ev-cal">${EVENTS.map((e) => `<div class="ev-cal__row ${ev?.id === e.id ? 'ev-cal--on' : ''}"><i style="background:${e.color}"></i><b>${ddmm(e.start)} – ${ddmm(e.end)}</b><span>${e.name}</span><small>${e.intro}</small></div>`).join('')}</div>
    <p class="cp-note">Lễ hội trong làng (Tết Xuân 3, Trung Thu Thu 8…) vẫn theo lịch trong game — xem lịch bằng phím C.</p>`;

  const render = () => {
    el.innerHTML = `<div class="panel cp"><div class="cp-head"><h2>Sự kiện</h2><div class="tabs">${[['event', ev ? ev.name : 'Sự kiện'], ['pass', 'Sổ mùa'], ['calendar', 'Lịch cả năm']].map(([id, n]) => `<button type="button" class="tab ${tab === id ? 'tab--on' : ''}" data-tab="${id}">${n}</button>`).join('')}</div></div>
      <div class="cp-body">${tab === 'event' ? eventTab() : tab === 'pass' ? passTab() : calendarTab()}</div>
      <div class="row"><button type="button" class="btn btn--primary" data-close>Đóng</button></div></div>`;
  };

  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!b || b.hasAttribute('disabled')) return;
    const d = b.dataset;
    if (d.tab) { tab = d.tab as Tab; return render(); }
    if ('close' in d) return el.remove();
    let msg: string | null = null;
    if (d.evq) { const t = claimEventQuest(p, Number(d.evq)); if (t) msg = `+${t} tem`; }
    if (d.buy) {
      const r = host.withSlot((s) => buyEventItem(p, s, Number(d.buy)));
      msg = r.ok ? `Đã đổi ${r.name}` : r.reason;
    }
    if (d.tier) { const r = host.withSlot((s) => claimPassTier(p, s, Number(d.tier))); if (r) msg = `Sổ mùa: ${r}`; }
    if (msg) {
      touchProfile(true);
      sfx('coin');
      host.say(msg);
    }
    render();
  });
  render();
}
