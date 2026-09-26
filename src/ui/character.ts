// Trang nhân vật (mở từ sảnh): ngoại hình, bộ đồ, thú cưng, kỹ năng & nghề, hồ sơ.
import {
  activeBonus, BODY_COLORS, FACES, FISH, HATS, NPCS, OUTFITS, outfitPieces, PETS, SHIRT_COLORS, SHIRT_NAME, type Look,
} from '../data';
import { levelOf } from '../game/profile';
import { session, syncWorn, touchProfile } from '../game/session';
import { chooseProfession, PROFESSIONS, pendingChoices, SKILL_XP, skillLevel, SKILLS } from '../game/skills';
import { heartsOf } from '../game/villagers';
import type { FarmState } from '../game/farm';
import { paintAvatar } from './avatar';
import { sfx } from '../audio/sound';

type Tab = 'look' | 'outfit' | 'pet' | 'skills' | 'profile';
const TABS: [Tab, string][] = [['look', 'Ngoại hình'], ['outfit', 'Bộ đồ'], ['pet', 'Thú cưng'], ['skills', 'Kỹ năng'], ['profile', 'Hồ sơ']];
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const DIRS = ['trước', 'sau', 'trái', 'phải'];

export interface CharacterHost {
  /** Ô lưu để xem/chọn kỹ năng; `save` ghi lại sau khi chọn nghề. */
  slot: () => FarmState | null;
  saveSlot: (s: FarmState) => void;
  /** Ngoại hình đổi xong (game đang chạy thì dựng lại hình nhân vật). */
  onLook: () => void;
}

export function openCharacter(parent: HTMLElement, host: CharacterHost, start: Tab = 'look') {
  const p = session.profile;
  const draft: Look = { ...p.look };
  let tab: Tab = start;
  let dir = 0;
  const el = document.createElement('div');
  el.className = 'lobby__modal charpage';
  parent.append(el);
  const owns = (id: string) => p.wardrobe.includes(id);

  const lookTab = () => `
    <div class="cp-grid">
      <div class="cp-preview"><div class="cp-hero" data-hero></div>
        <div class="row"><button type="button" class="btn" data-rot="-1" aria-label="Xoay trái">‹</button><span class="cp-dir">Hướng: ${DIRS[dir]}</span><button type="button" class="btn" data-rot="1" aria-label="Xoay phải">›</button></div>
        <label class="friends__label" for="cp-name">Tên</label><input id="cp-name" class="field" maxlength="16" value="${esc(p.name)}">
      </div>
      <div class="cp-opts">
        <h3>Màu lông</h3><div class="swatches">${BODY_COLORS.map((c, i) => `<button type="button" class="sw ${draft.body === i ? 'sw--on' : ''}" data-body="${i}" aria-label="Màu lông ${i + 1}" style="background:${c}"></button>`).join('')}</div>
        <h3>Màu áo</h3><div class="swatches">${SHIRT_COLORS.map((c, i) => {
          const ok = owns(`shirt_${i}`);
          return `<button type="button" class="sw ${draft.shirt === i ? 'sw--on' : ''}" data-shirt="${i}" ${ok ? '' : 'disabled'} title="${ok ? SHIRT_NAME[i] : `${SHIRT_NAME[i]} — chưa có`}" aria-label="Áo ${SHIRT_NAME[i]}" style="background:${c}"></button>`;
        }).join('')}</div>
        <h3>Nón</h3><div class="chips"><button type="button" class="chip ${!draft.hat ? 'chip--on' : ''}" data-hat="">Không đội</button>${Object.entries(HATS).map(([id, n]) => {
          const ok = owns(`hat_${id}`);
          return `<button type="button" class="chip ${draft.hat === id ? 'chip--on' : ''}" data-hat="${id}" ${ok ? '' : 'disabled'}>${ok ? n : `${n} · khóa`}</button>`;
        }).join('')}</div>
        <h3>Trên mặt</h3><div class="chips"><button type="button" class="chip ${!draft.face ? 'chip--on' : ''}" data-face="">Không có</button>${Object.entries(FACES).map(([id, n]) => {
          const ok = owns(`face_${id}`);
          return `<button type="button" class="chip ${draft.face === id ? 'chip--on' : ''}" data-face="${id}" ${ok ? '' : 'disabled'}>${ok ? n : `${n} · khóa`}</button>`;
        }).join('')}</div>
        <p class="cp-note">Món khóa: nhận ở điểm danh, quà lên cấp, nhiệm vụ, sự kiện, tiệm may.</p>
      </div>
    </div>`;

  const outfitTab = () => {
    const bonus = activeBonus(draft);
    return `<p>Mặc đủ nón + áo đúng bộ thì có hiệu ứng. Đang có: <b>${bonus ? OUTFITS.find((o) => o.bonus === bonus)!.name : 'chưa đủ bộ nào'}</b></p>
      <div class="cp-outfits">${OUTFITS.map((o) => {
        const pieces = outfitPieces(o);
        const have = pieces.filter(owns).length;
        const on = draft.hat === o.hat && draft.shirt === o.shirt;
        return `<div class="card ${on ? 'card--on' : ''}"><div class="cp-mini" data-mini="${o.id}"></div><h3>${o.name}</h3><p>${o.info}</p><p class="cp-note">${HATS[o.hat]} + áo ${SHIRT_NAME[o.shirt].toLowerCase()} · có ${have}/2</p>
          <button type="button" class="btn ${on ? '' : 'btn--primary'}" data-wear="${o.id}" ${have === 2 && !on ? '' : 'disabled'}>${on ? 'Đang mặc' : have === 2 ? 'Mặc bộ này' : 'Chưa đủ món'}</button></div>`;
      }).join('')}</div>`;
  };

  const petTab = () => {
    const hearts = Math.floor(p.pet.love / 100);
    return `<div class="cp-grid"><div class="cp-opts">
      <h3>Chọn thú cưng đi theo</h3><div class="cp-pets"><button type="button" class="chip ${!draft.pet ? 'chip--on' : ''}" data-pet="">Không mang</button>${Object.entries(PETS).map(([id, d]) => {
        const ok = owns(`pet_${id}`);
        return `<button type="button" class="petcard ${draft.pet === id ? 'petcard--on' : ''}" data-pet="${id}" ${ok ? '' : 'disabled'}><i style="background-position:0 -${d.row * 64}px"></i><span>${ok ? d.name : `${d.name} · khóa`}</span></button>`;
      }).join('')}</div>
      <label class="friends__label" for="cp-pet">Tên thú cưng</label><input id="cp-pet" class="field" maxlength="12" value="${esc(p.pet.name)}">
      <p>Tình cảm: <span class="talk__hearts">${'♥'.repeat(hearts)}<i>${'♥'.repeat(10 - hearts)}</i></span></p>
      <p class="cp-note">Thú cưng đi theo ngoài trời. Bấm vào để vuốt ve mỗi ngày. Đủ 5 tim thỉnh thoảng tha quà về hòm thư.</p>
    </div></div>`;
  };

  const skillsTab = (s: FarmState | null) => {
    if (!s) return '<p>Chọn một ô lưu có nông trại để xem kỹ năng.</p>';
    const pend = pendingChoices(s);
    return `<div class="cp-skills">${SKILLS.map((sk) => {
      const xp = s.skills[sk.id];
      const lv = skillLevel(xp);
      const next = SKILL_XP[Math.min(10, lv + 1)];
      const mine = PROFESSIONS.filter((x) => x.skill === sk.id && s.professions.includes(x.id)).map((x) => x.name).join(' → ');
      return `<div class="cp-skill"><b>${sk.name}</b><div class="pips">${Array.from({ length: 10 }, (_, i) => `<span class="${i < lv ? 'on' : ''} ${i === 4 || i === 9 ? 'mark' : ''}"></span>`).join('')}</div><span>Cấp ${lv}${lv < 10 ? ` · ${xp}/${next}` : ' · tối đa'}</span><small>${mine || (lv >= 5 ? 'chưa chọn nghề' : 'cấp 5 được chọn nghề')}</small></div>`;
    }).join('')}</div>
    ${pend.map((c) => `<div class="card card--choice"><h3>${SKILLS.find((x) => x.id === c.skill)!.name} cấp ${c.tier} · chọn một nghề (không đổi lại được)</h3><div class="row">${c.options.map((o) => `<button type="button" class="btn prof" data-prof="${o.id}"><b>${o.name}</b><span>${o.info}</span></button>`).join('')}</div></div>`).join('')}`;
  };

  const profileTab = (s: FarmState | null) => {
    const lv = levelOf(p.xp);
    const best = s ? NPCS.filter((n) => heartsOf(s.npcs[n.id]?.love ?? 0) >= 8).length : 0;
    const fish = s ? FISH.filter((f) => s.fishCaught[f.id]).length : 0;
    return `<div class="cp-stats">
      <div class="card"><h3>Cấp nông trại ${lv.level}</h3><p>${lv.into}/${lv.need} tới cấp sau · tổng ${p.xp} kinh nghiệm</p></div>
      <div class="card"><h3>Ô lưu đang chọn</h3><p>${s ? `${esc(s.farmName)} · ngày thứ ${s.day} · ${s.money.toLocaleString('vi-VN')} xu` : 'trống'}</p></div>
      <div class="card"><h3>Cá đã câu</h3><p>${fish}/${FISH.length} loại</p></div>
      <div class="card"><h3>Bạn thân trong làng</h3><p>${best}/8 người đủ 8 tim</p></div>
      <div class="card"><h3>Tủ đồ</h3><p>${p.wardrobe.length} món</p></div>
      <div class="card"><h3>Điểm danh</h3><p>Lần cuối: ${p.checkin.last ?? 'chưa'} · tới ngày ${p.checkin.next}/7</p></div>
    </div><p class="cp-note">Danh hiệu và thành tích có ở mốc nhiệm vụ.</p>`;
  };

  function render() {
    const s = host.slot();
    el.innerHTML = `<div class="panel cp">
      <div class="cp-head"><h2>Nhân vật · ${esc(p.name)}</h2><div class="tabs">${TABS.map(([id, n]) => `<button type="button" class="tab ${tab === id ? 'tab--on' : ''}" data-tab="${id}">${n}${id === 'skills' && s && pendingChoices(s).length ? ' •' : ''}</button>`).join('')}</div></div>
      <div class="cp-body">${tab === 'look' ? lookTab() : tab === 'outfit' ? outfitTab() : tab === 'pet' ? petTab() : tab === 'skills' ? skillsTab(s) : profileTab(s)}</div>
      <div class="row"><button type="button" class="btn btn--primary" data-save>Lưu & đóng</button><button type="button" class="btn" data-close>Thôi</button></div>
    </div>`;
    const hero = el.querySelector<HTMLElement>('[data-hero]');
    if (hero) paintAvatar(hero, draft, dir * 4, 8);
    el.querySelectorAll<HTMLElement>('[data-mini]').forEach((m) => {
      const o = OUTFITS.find((x) => x.id === m.dataset.mini)!;
      paintAvatar(m, { ...draft, hat: o.hat, shirt: o.shirt }, 0, 3);
    });
  }

  const readInputs = () => {
    const n = el.querySelector<HTMLInputElement>('#cp-name')?.value.trim();
    if (n) p.name = n.slice(0, 16);
    const pn = el.querySelector<HTMLInputElement>('#cp-pet')?.value.trim();
    if (pn) p.pet.name = pn.slice(0, 12);
  };

  el.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!t || t.hasAttribute('disabled')) return;
    const d = t.dataset;
    if (d.tab) { readInputs(); tab = d.tab as Tab; return render(); }
    if (d.rot) { readInputs(); dir = (dir + Number(d.rot) + 4) % 4; return render(); }
    if (d.body !== undefined) { readInputs(); draft.body = Number(d.body); return render(); }
    if (d.shirt !== undefined) { readInputs(); draft.shirt = Number(d.shirt); return render(); }
    if (d.hat !== undefined) { readInputs(); draft.hat = d.hat || null; return render(); }
    if (d.face !== undefined) { readInputs(); draft.face = d.face || null; return render(); }
    if (d.pet !== undefined) { readInputs(); draft.pet = d.pet || null; return render(); }
    if (d.wear) { const o = OUTFITS.find((x) => x.id === d.wear)!; draft.hat = o.hat; draft.shirt = o.shirt; sfx('gift'); return render(); }
    if (d.prof) {
      const s = host.slot();
      if (s && chooseProfession(s, d.prof)) { host.saveSlot(s); sfx('catch'); }
      return render();
    }
    if ('save' in d) {
      readInputs();
      const changed = JSON.stringify(draft) !== JSON.stringify(p.look);
      p.look = { ...draft };
      touchProfile(true);
      syncWorn();
      el.remove();
      if (changed) host.onLook();
      return;
    }
    if ('close' in d) el.remove();
  });
  render();
}
