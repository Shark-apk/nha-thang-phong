// Sảnh ngoài: hồ sơ, điểm danh, hòm thư, nông trại hôm nay, lễ hội sắp tới, chọn ô lưu / bản đồ, nút Chơi.
// Mở trước khi vào game và trong game (phím Tab).
import { CHECKIN_REWARDS, canCheckin, checkin, claimMail, applyReward, levelOf, unclaimed } from '../game/profile';
import { session, touchProfile, onProfileChange } from '../game/session';
import { dayOfSeason, isRipe, newFarm, seasonOf, SEASON_DAYS, yearOf, type FarmMap, type FarmState } from '../game/farm';
import { clearSave, loadGame, saveGame, SLOTS, useSlot } from '../game/save';
import { objectReady } from '../game/resources';
import { beautyOf } from '../game/farming2';
import { FESTIVALS, NPCS, PETS, SEASONS, SEASON_NAME } from '../data';
import { paintAvatar } from './avatar';
import { openCharacter } from './character';
import { openQuests, questRow } from './questsPage';
import { claimQuest, ensureQuests, storyReady } from '../game/quests';
import { loadIdentity } from '../net/friends';
import { REGIONS, STORY } from '../data';
import { regionOpen } from '../game/town';
import { activeEvent, nextEvent, PASS, passState, passTier, timeLeft } from '../game/events';
import { openEvents } from './eventsPage';
import { openAlbum } from './album';
import { guestState, hasCard, questText, weekGuests } from '../game/guests';
import { buildWorld, TILE } from '../game/world';
import { sfx } from '../audio/sound';

export interface LobbyHost {
  inGame: boolean;
  play: (slot: number, s: FarmState) => void;
  resume: () => void;
  openSettings: () => void;
  /** Ngoại hình vừa đổi. */
  onLook: () => void;
}

export const FARM_MAPS: { id: FarmMap; name: string; tag: string; info: string; ready: boolean }[] = [
  { id: 'plain', name: 'Đồng bằng', tag: 'Dễ · hợp người mới', info: 'Ruộng rộng, ao cá, biển quanh đảo', ready: true },
  { id: 'coast', name: 'Ven biển', tag: 'Vừa · miền Trung', info: 'Bãi cát, biển lớn, làm muối, dừa', ready: true },
  { id: 'tea', name: 'Đồi chè', tag: 'Vừa · Tây Bắc', info: 'Ruộng bậc thang, chè, nếp nương', ready: true },
  { id: 'highland', name: 'Cao nguyên', tag: 'Khó · đất đỏ', info: 'Cà phê, hồ tiêu, sầu riêng', ready: true },
  { id: 'delta', name: 'Miệt vườn', tag: 'Vừa · miền Tây', info: 'Kênh rạch, trái cây quanh năm', ready: true },
];

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const money = (n: number) => n.toLocaleString('vi-VN');
const spawnPoint = () => { const w = buildWorld(); return { x: (w.spawn.x + 0.5) * TILE, y: (w.spawn.y + 0.7) * TILE }; };

/** Việc đáng chú ý hôm nay ở nông trại. */
function farmToday(s: FarmState) {
  const lines: string[] = [];
  const ripe = Object.values(s.crops).filter(isRipe).length;
  if (ripe) lines.push(`${ripe} cây đã chín, chờ thu hoạch`);
  const dry = Object.keys(s.crops).filter((k) => !s.tilled[k]?.watered).length;
  if (dry) lines.push(`${dry} ô chưa tưới`);
  const prod = s.animals.filter((a) => a.product).length;
  if (prod) lines.push(`${prod} vật nuôi có sản phẩm`);
  const pests = Object.values(s.crops).filter((c) => c.pest).length;
  if (pests) lines.push(`${pests} cây bị sâu, cần bắt`);
  const giants = Object.keys(s.giants).length;
  if (giants) lines.push(`${giants} trái khổng lồ chờ bổ`);
  const ready = Object.values(s.objects).filter((o) => objectReady(s, o)).length;
  if (ready) lines.push(`${ready} máy đã làm xong`);
  if (s.mailbox.length) lines.push(`${s.mailbox.length} gói quà trong hòm thư cạnh nhà`);
  if (!lines.length) lines.push('Mọi thứ đều ổn — đi ngủ để sang ngày mới');
  lines.push(`Điểm nông trại đẹp: ${beautyOf(s)}`);
  return lines;
}

/** Số ngày trong game tới một ngày (mùa, ngày) gần nhất, tính cả hôm nay = 0. */
function daysUntil(s: FarmState, season: string, day: number) {
  const cur = (s.day - 1) % (SEASON_DAYS * 4);
  const target = SEASONS.indexOf(season as never) * SEASON_DAYS + (day - 1);
  return (target - cur + SEASON_DAYS * 4) % (SEASON_DAYS * 4);
}

export function openLobby(host: LobbyHost) {
  const p = session.profile;
  const root = document.createElement('div');
  root.className = 'lobby';
  // Phần vẽ lại được; các hộp con (thư, nhân vật, nhiệm vụ) gắn thẳng vào root nên không bị xóa khi vẽ lại
  const view = document.createElement('div');
  view.className = 'lobby__view';
  root.append(view);
  document.body.append(root);

  const slotState = (): FarmState | null => session.live ?? loadGame(p.lastSlot);
  /** Thưởng vào ô lưu: đang chơi thì vào thẳng trạng thái, còn ở sảnh thì nạp – thêm – lưu lại. */
  const withSlot = <T,>(fn: (s: FarmState | null) => T): T => {
    if (session.live) return fn(session.live);
    useSlot(p.lastSlot);
    const s = loadGame(p.lastSlot);
    const got = fn(s);
    if (s) saveGame(s);
    return got;
  };

  let flash = '';
  const say = (m: string) => { flash = m; render(); window.setTimeout(() => { if (flash === m) { flash = ''; render(); } }, 2600); };

  /** Hai khách mời tuần này + việc đang nhờ. */
  function guestCard() {
    return `<button type="button" class="card card--guests" data-a="album"><small>KHÁCH MỜI TUẦN NÀY · thẻ ${p.cards.length}/24</small>${weekGuests().map((g) => `<span class="lg-row"><i class="al-face" style="width:48px;height:48px;background-size:576px 96px;background-position:-${(g.portrait % 12) * 48}px -${Math.floor(g.portrait / 12) * 48}px"></i><span><b>${g.name}</b><small>${hasCard(p, g.id) ? '✓ đã có thẻ' : guestState(p, g.id).accepted ? questText(p, g.id) : 'ra làng gặp để nhận việc'}</small></span></span>`).join('')}</button>`;
  }

  /** Thẻ sự kiện ngày thật: đang diễn ra (đếm ngược) hoặc sắp tới; kèm tiến độ sổ mùa. */
  function realEvent() {
    const ev = activeEvent();
    const ps = passState(p);
    const pass = `<small class="ev-pass">Sổ mùa: bậc ${passTier(ps.points)}/${PASS.tiers.length}</small>`;
    if (ev) {
      const l = timeLeft(ev);
      return `<button type="button" class="card card--real" data-a="events" style="background:${ev.color}"><small>SỰ KIỆN ĐANG DIỄN RA</small><h2>${ev.name}</h2><p>Còn ${l.days} ngày ${l.hours} giờ · ${ev.intro}</p>${pass}</button>`;
    }
    const n = nextEvent();
    return `<button type="button" class="card card--next" data-a="events"><small>SỰ KIỆN SẮP TỚI</small><h3>${n ? `${n.ev.name} · còn ${n.days} ngày` : 'Chưa có'}</h3>${pass}</button>`;
  }

  function render() {
    const s = slotState();
    ensureQuests(p, s, !!loadIdentity());
    const lv = levelOf(p.xp);
    const mails = unclaimed(p);
    const ci = canCheckin(p);
    const cells = CHECKIN_REWARDS.map((r, i) => {
      const n = i + 1;
      const done = ci ? n < p.checkin.next : n < p.checkin.next || (p.checkin.next === 1 && n === 7);
      const cls = ci && n === p.checkin.next ? 'now' : done ? 'done' : n === 7 ? 'big' : '';
      return `<div class="ck ${cls}" title="${r.label}"><b>${n}</b><span>${done ? '✓' : cls === 'now' ? 'Nhận' : r.label}</span></div>`;
    }).join('');
    const fest = s ? FESTIVALS.map((f) => ({ f, d: daysUntil(s, f.season, f.day) })).sort((a, b) => a.d - b.d)[0] : null;
    const bday = s ? NPCS.map((n) => ({ n, d: daysUntil(s, n.birthday.season, n.birthday.day) })).sort((a, b) => a.d - b.d)[0] : null;
    const slotLine = s ? `Ô lưu ${p.lastSlot + 1} · ${esc(s.farmName)} · ${SEASON_NAME[seasonOf(s.day)]} ${dayOfSeason(s.day)}, năm ${yearOf(s.day)}` : `Ô lưu ${p.lastSlot + 1} · trống`;
    view.innerHTML = `
      <div class="lobby__bg" style="background-image:${['props', 'field', 'near', 'far', 'sky'].map((l) => `url('/Custom/phase2/cover/${s ? seasonOf(s.day) : 'spring'}_${l}.png')`).join(',')}"></div>
      <header class="lobby__top">
        <button type="button" class="lobby__face" data-a="character" aria-label="Trang nhân vật"></button>
        <div class="lobby__who"><b>${esc(p.name)}${p.title ? ` <span class="lobby__title">· ${esc(p.title)}</span>` : ''}</b>
          <div class="lobby__lv">Cấp ${lv.level}<span class="xpbar"><span style="width:${(lv.into / lv.need) * 100}%"></span></span><small>${lv.into}/${lv.need}</small></div></div>
        <div class="lobby__grow"></div>
        <div class="pill">${s ? `${money(s.money)} xu` : '—'}</div>
        <div class="pill">${p.tem} tem</div>
        <button type="button" class="pill pill--btn" data-a="mail">Hòm thư${mails ? `<i class="badge">${mails}</i>` : ''}</button>
        <button type="button" class="pill pill--btn" data-a="settings">Cài đặt</button>
        ${host.inGame ? '<button type="button" class="pill pill--btn" data-a="resume">Về game ✕</button>' : ''}
      </header>
      <main class="lobby__main">
        <section class="lobby__col">
          <div class="card">
            <h3>Điểm danh · ngày ${p.checkin.next}/7</h3>
            <div class="ck-row">${cells}</div>
            <button type="button" class="btn ${ci ? 'btn--primary' : ''}" data-a="checkin" ${ci ? '' : 'disabled'}>${ci ? `Nhận quà hôm nay: ${CHECKIN_REWARDS[p.checkin.next - 1].label}` : 'Đã nhận — mai quay lại nhé'}</button>
          </div>
          <div class="card">
            <h3>Nhiệm vụ hôm nay <button type="button" class="linkbtn" data-a="quests">Xem hết</button></h3>
            ${p.quests.daily.map((q, i) => questRow(q, i, 'daily')).join('')}
            ${s && STORY.steps[s.story] ? `<p class="lobby__story">Cốt truyện ${s.story + 1}/${STORY.steps.length}: <b>${STORY.steps[s.story].title}</b>${storyReady(s) ? ' — <span class="ready">xong, nhận thưởng!</span>' : ''}</p>` : ''}
          </div>
          <div class="card card--grow">
            <h3>Nông trại hôm nay</h3>
            ${s ? `<ul>${farmToday(s).map((l) => `<li>${l}</li>`).join('')}</ul>` : '<p>Chưa có nông trại ở ô này. Bấm Chơi để tạo mới.</p>'}
          </div>
        </section>
        <section class="lobby__stage">
          <p class="lobby__hint">Bấm vào ${esc(p.name)} để đổi đồ, xem kỹ năng</p>
          <button type="button" class="lobby__hero" data-a="character" aria-label="Nhân vật ${esc(p.name)}"></button>
          ${p.look.pet ? '<i class="lobby__pet"></i>' : ''}
          <div class="lobby__shadow"></div>
          <div class="lobby__name">${esc(p.name)}</div>
        </section>
        <section class="lobby__col">
          ${realEvent()}
          ${guestCard()}
          ${fest ? `<div class="card card--event card--fest"><small>LỄ HỘI LÀNG SẮP TỚI</small><h2>${fest.f.name}</h2><p>${fest.d === 0 ? 'Hôm nay!' : `Còn ${fest.d} ngày trong game`} · ${SEASON_NAME[fest.f.season]} ${fest.f.day}, ${Math.floor(fest.f.hours[0] / 60)}h–${Math.floor(fest.f.hours[1] / 60)}h</p><p>${fest.f.intro}</p></div>` : ''}
          ${bday ? `<div class="card"><h3>Sinh nhật sắp tới</h3><p><b>${bday.n.name}</b> · ${bday.d === 0 ? 'hôm nay — quà ×8!' : `còn ${bday.d} ngày`}</p><p>Tặng quà đúng ngày sinh nhật được gấp 8 lần tình cảm</p></div>` : ''}
          <div class="card"><h3>Bản đồ thế giới <button type="button" class="linkbtn" data-a="world">Xem</button></h3><p>${s ? `${REGIONS.filter((r) => regionOpen(p, s, r.id)).length}/${REGIONS.length} vùng đã mở · trong game bấm <kbd>M</kbd> hoặc ra bến xe bò` : 'Chọn ô lưu để xem'}</p></div>
          <div class="card"><h3>Phím trong game</h3><p><kbd>Tab</kbd> mở sảnh · <kbd>H</kbd> xem phím · <kbd>Esc</kbd> cài đặt</p></div>
        </section>
      </main>
      <footer class="lobby__bottom">
        <span>${slotLine}</span>
        <div class="lobby__grow"></div>
        ${flash ? `<span class="lobby__flash">${flash}</span>` : ''}
        <button type="button" class="btn" data-a="slots" ${host.inGame ? 'disabled title="Về màn hình chính (Cài đặt) để đổi ô lưu"' : ''}>Đổi ô lưu</button>
        <button type="button" class="btn btn--primary lobby__play" data-a="play">${host.inGame ? 'TIẾP TỤC ▶' : 'CHƠI ▶'}</button>
      </footer>`;
    paintAvatar(root.querySelector('.lobby__face')!, p.look, 0, 2);
    paintAvatar(root.querySelector('.lobby__hero')!, p.look, 0, 8);
    const pet = root.querySelector<HTMLElement>('.lobby__pet');
    if (pet && p.look.pet) pet.style.backgroundPosition = `0 -${PETS[p.look.pet].row * 64}px`;
  }

  // ---------------------------------------------------------------- hộp thoại con
  const modal = (html: string, wire: (m: HTMLElement, close: () => void) => void) => {
    const m = document.createElement('div');
    m.className = 'lobby__modal';
    m.innerHTML = `<div class="panel">${html}</div>`;
    const close = () => m.remove();
    m.addEventListener('click', (e) => { if (e.target === m) close(); });
    root.append(m);
    wire(m, close);
    m.querySelector<HTMLElement>('input, .btn--primary, button')?.focus();
  };

  const openMail = () => modal(`<h2>Hòm thư</h2><div class="shop__list mail-list">${p.mail.length ? p.mail.map((m) => `
      <div class="shop__row"><div><b>${esc(m.title)}</b><span>${esc(m.body)} · ${m.date}</span></div>${m.claimed ? '<span class="mail-done">đã nhận</span>' : `<button type="button" class="btn" data-claim="${m.id}">Nhận</button>`}</div>`).join('') : '<p>Chưa có thư.</p>'}</div>
      <div class="row">${unclaimed(p) ? '<button type="button" class="btn btn--primary" data-all>Nhận hết</button>' : ''}<button type="button" class="btn" data-x>Đóng</button></div>`, (m, close) => {
    m.querySelectorAll<HTMLButtonElement>('[data-claim]').forEach((b) => (b.onclick = () => {
      const got = withSlot((s) => claimMail(p, Number(b.dataset.claim), s) ?? []);
      touchProfile(true);
      sfx('gift');
      close();
      render();
      say(`Đã nhận: ${got.join(', ')}`);
      openMail();
    }));
    m.querySelector<HTMLButtonElement>('[data-all]')?.addEventListener('click', () => {
      const got = withSlot((s) => p.mail.filter((x) => !x.claimed).flatMap((x) => claimMail(p, x.id, s) ?? []));
      touchProfile(true);
      sfx('gift');
      close();
      render();
      say(`Đã nhận: ${got.join(', ')}`);
    });
    m.querySelector<HTMLButtonElement>('[data-x]')!.onclick = close;
  });

  const openNewFarm = (slot: number) => modal(`<h2>Nông trại mới · ô ${slot + 1}</h2>
      <label class="friends__label" for="lb-farm">Tên nông trại</label><input id="lb-farm" class="field" maxlength="24" value="Nhà Thằng Phong">
      <p>Chọn bản đồ</p><div class="maps">${FARM_MAPS.map((f, i) => `<button type="button" class="map ${i === 0 ? 'map--on' : ''}" data-map="${f.id}" ${f.ready ? '' : 'disabled'}>
        <i style="background-position:${i * 25}% 0"></i><b>${f.name}</b><span>${f.tag}</span><small>${f.ready ? f.info : 'Mở ở bản sau'}</small></button>`).join('')}</div>
      <div class="row"><button type="button" class="btn btn--primary" data-ok>Bắt đầu ▶</button><button type="button" class="btn" data-x>Thôi</button></div>`, (m, close) => {
    let map: FarmMap = 'plain';
    m.querySelectorAll<HTMLButtonElement>('[data-map]').forEach((b) => (b.onclick = () => {
      map = b.dataset.map as FarmMap;
      m.querySelectorAll('.map').forEach((x) => x.classList.toggle('map--on', x === b));
    }));
    m.querySelector<HTMLButtonElement>('[data-ok]')!.onclick = () => {
      const s = newFarm(spawnPoint());
      s.farmName = (m.querySelector('#lb-farm') as HTMLInputElement).value.trim().slice(0, 24) || 'Nhà Thằng Phong';
      s.map = map;
      useSlot(slot);
      saveGame(s);
      p.lastSlot = slot;
      touchProfile(true);
      close();
      teardown();
      host.play(slot, s);
    };
    m.querySelector<HTMLButtonElement>('[data-x]')!.onclick = close;
  });

  const openSlots = () => modal(`<h2>Ô lưu</h2><div class="slots">${Array.from({ length: SLOTS }, (_, n) => {
      const s = loadGame(n);
      return `<div class="slot-card ${n === p.lastSlot ? 'slot-card--on' : ''}"><div><b>Ô ${n + 1} · ${s ? esc(s.farmName) : 'trống'}</b><span>${s ? `${SEASON_NAME[seasonOf(s.day)]} ${dayOfSeason(s.day)}, năm ${yearOf(s.day)} · ${money(s.money)} xu` : 'Bắt đầu nông trại mới'}</span></div>
        ${s ? `<button type="button" class="btn btn--primary" data-pick="${n}">Chọn</button><button type="button" class="btn" data-del="${n}">Xóa</button>` : `<button type="button" class="btn btn--primary" data-new="${n}">Tạo mới</button>`}</div>`;
    }).join('')}</div><div class="row"><button type="button" class="btn" data-x>Đóng</button></div>`, (m, close) => {
    m.querySelectorAll<HTMLButtonElement>('[data-pick]').forEach((b) => (b.onclick = () => { p.lastSlot = Number(b.dataset.pick); touchProfile(true); close(); render(); }));
    m.querySelectorAll<HTMLButtonElement>('[data-new]').forEach((b) => (b.onclick = () => { close(); openNewFarm(Number(b.dataset.new)); }));
    m.querySelectorAll<HTMLButtonElement>('[data-del]').forEach((b) => (b.onclick = () => {
      const n = Number(b.dataset.del);
      if (!confirm(`Xóa nông trại ở ô ${n + 1}? Không lấy lại được.`)) return;
      clearSave(n);
      close();
      render();
      openSlots();
    }));
    m.querySelector<HTMLButtonElement>('[data-x]')!.onclick = close;
  });

  // ---------------------------------------------------------------- nút
  root.addEventListener('click', (e) => {
    const c = (e.target as HTMLElement).closest<HTMLElement>('[data-claim]');
    if (c && !root.querySelector('.lobby__modal')) {
      const [kind, i] = c.dataset.claim!.split(':');
      const r = claimQuest(p, kind as 'daily', Number(i));
      if (r) {
        const got = withSlot((st) => applyReward(p, st, r, 'Nhiệm vụ'));
        touchProfile(true);
        sfx('coin');
        render();
        say(`Nhận: ${got.join(', ')}`);
      }
      return;
    }
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-a]');
    if (!b || root.querySelector('.lobby__modal')) return;
    switch (b.dataset.a) {
      case 'checkin': {
        const r = checkin(p);
        if (!r) return;
        const got = withSlot((s) => applyReward(p, s, r.reward, 'Điểm danh'));
        touchProfile(true);
        sfx('coin');
        render();
        say(`Điểm danh ngày ${r.day}: ${got.join(', ') || 'đã nhận'}`);
        break;
      }
      case 'mail': openMail(); break;
      case 'quests': openQuests(root, { withSlot, say }); break;
      case 'events': openEvents(root, { withSlot, say }); break;
      case 'album': openAlbum(root, { withSlot, say }); break;
      case 'world': {
        const st = slotState();
        if (!st) break;
        modal(`<h2>Bản đồ thế giới</h2><div class="wm">${REGIONS.map((r) => {
          const open = regionOpen(p, st, r.id);
          return `<span class="wm__pin ${open ? '' : 'wm__pin--lock'}" style="left:${(r.pin[0] / 320) * 100}%;top:${(r.pin[1] / 200) * 100}%"><b>${r.name}</b><small>${open ? r.info : `mở ở cấp ${r.level}`}</small></span>`;
        }).join('')}</div><p class="cp-note">Vào game rồi bấm M (hoặc ra bến xe bò) để đi.</p><div class="row"><button type="button" class="btn btn--primary" data-x>Đóng</button></div>`, (m, close) => { m.querySelector<HTMLButtonElement>('[data-x]')!.onclick = close; });
        break;
      }
      case 'character': openCharacter(root, {
        slot: slotState,
        saveSlot: (st) => { if (!session.live) { useSlot(p.lastSlot); saveGame(st); } },
        onLook: () => { host.onLook(); render(); },
      }); break;
      case 'slots': openSlots(); break;
      case 'settings': host.openSettings(); break;
      case 'resume': teardown(); host.resume(); break;
      case 'play': {
        if (host.inGame) { teardown(); host.resume(); break; }
        const s = loadGame(p.lastSlot);
        if (!s) { openNewFarm(p.lastSlot); break; }
        useSlot(p.lastSlot);
        teardown();
        host.play(p.lastSlot, s);
        break;
      }
    }
  });
  const key = (e: KeyboardEvent) => {
    if (root.querySelector('.lobby__modal')) {
      if (e.key === 'Escape') root.querySelector('.lobby__modal')?.remove();
      return;
    }
    if (host.inGame && (e.key === 'Escape' || e.key === 'Tab')) { e.preventDefault(); teardown(); host.resume(); }
  };
  window.addEventListener('keydown', key);
  const off = onProfileChange(render);
  function teardown() {
    window.removeEventListener('keydown', key);
    off();
    root.remove();
  }
  render();
  (root.querySelector('.lobby__play') as HTMLButtonElement)?.focus();
  return teardown;
}
