// Trang nhiệm vụ (mở từ sảnh): hôm nay, tuần, cốt truyện, dân làng, thành tích.
import { ACHIEVEMENTS, ITEMS, NPC, NPC_QUESTS, STORY } from '../data';
import { applyReward } from '../game/profile';
import { session, touchProfile } from '../game/session';
import type { FarmState } from '../game/farm';
import { countItem } from '../game/farm';
import {
  canClaimBonus, claimBonus, claimQuest, claimStory, DAILY_BONUS, DAILY_REWARD, deliverNpcQuest, npcQuestsOpen, storyCheck, titlesOf, WEEKLY_REWARD,
  type QuestProgress,
} from '../game/quests';
import { sfx } from '../audio/sound';

type Tab = 'daily' | 'weekly' | 'story' | 'npc' | 'ach';
const TABS: [Tab, string][] = [['daily', 'Hôm nay'], ['weekly', 'Tuần này'], ['story', 'Cốt truyện'], ['npc', 'Dân làng'], ['ach', 'Thành tích']];
const rewardText = (r: { money?: number; tem?: number }) => [r.money ? `${r.money} xu` : '', r.tem ? `${r.tem} tem` : ''].filter(Boolean).join(' + ');

export interface QuestsHost {
  /** Chạy `fn` trên ô lưu đang chọn (đang chơi thì trạng thái sống, ở sảnh thì nạp–sửa–lưu). */
  withSlot: <T>(fn: (s: FarmState | null) => T) => T;
  say: (msg: string) => void;
}

export function questRow(q: QuestProgress, i: number, kind: 'daily' | 'weekly') {
  const pct = Math.round((q.progress / q.target) * 100);
  const done = q.progress >= q.target;
  const btn = q.claimed ? '<span class="q-done">✓ đã nhận</span>' : done ? `<button type="button" class="btn btn--primary" data-claim="${kind}:${i}">Nhận</button>` : `<span class="q-count">${q.progress.toLocaleString('vi-VN')}/${q.target.toLocaleString('vi-VN')}</span>`;
  return `<div class="q-row ${q.claimed ? 'q-row--claimed' : ''}"><div class="q-main"><span>${q.text}</span><span class="q-bar"><span style="width:${pct}%"></span></span></div>${btn}</div>`;
}

export function openQuests(parent: HTMLElement, host: QuestsHost, start: Tab = 'daily') {
  const p = session.profile;
  let tab: Tab = start;
  const el = document.createElement('div');
  el.className = 'lobby__modal charpage';
  parent.append(el);

  const body = () => {
    const s = host.withSlot((x) => x);
    if (tab === 'daily') {
      const q = p.quests.daily;
      return `<p>Làm mới lúc 0h mỗi ngày thật. Mỗi nhiệm vụ: ${rewardText(DAILY_REWARD)}.</p>${q.map((x, i) => questRow(x, i, 'daily')).join('')}
        <div class="q-row q-bonus"><div class="q-main"><span>Xong cả 3 nhiệm vụ hôm nay</span></div>${p.quests.dailyBonus ? '<span class="q-done">✓ đã nhận</span>' : `<button type="button" class="btn ${canClaimBonus(p) ? 'btn--primary' : ''}" data-bonus ${canClaimBonus(p) ? '' : 'disabled'}>${rewardText(DAILY_BONUS)}</button>`}</div>`;
    }
    if (tab === 'weekly') return `<p>Làm mới mỗi thứ Hai. Mỗi nhiệm vụ: ${rewardText(WEEKLY_REWARD)}.</p>${p.quests.weekly.map((x, i) => questRow(x, i, 'weekly')).join('')}`;
    if (!s) return '<p>Chọn một ô lưu có nông trại để xem.</p>';
    if (tab === 'story') {
      return `<h3>${STORY.chapter}</h3><div class="story">${STORY.steps.map((st, i) => {
        const state = i < s.story ? 'done' : i === s.story ? (storyCheck(s, st.check) ? 'ready' : 'now') : 'lock';
        const reward = [st.reward.money ? `${st.reward.money} xu` : '', ...(st.reward.items ?? []).map(([it, n]) => `${n} ${ITEMS[it].name.toLowerCase()}`), st.reward.flag === 'road_town' ? 'mở đường lên chợ huyện' : ''].filter(Boolean).join(', ');
        return `<div class="story__step story--${state}"><b>${i + 1}</b><div><span class="story__t">${state === 'lock' ? '???' : st.title}</span><span>${state === 'lock' ? 'Làm xong bước trước để mở' : st.text}</span>${state !== 'lock' ? `<small>Thưởng: ${reward}</small>` : ''}</div>${state === 'ready' ? '<button type="button" class="btn btn--primary" data-story>Nhận</button>' : state === 'done' ? '<span class="q-done">✓</span>' : ''}</div>`;
      }).join('')}</div>`;
    }
    if (tab === 'npc') {
      const open = npcQuestsOpen(s);
      const done = NPC_QUESTS.filter((q) => s.npcQuestsDone.includes(q.id)).length;
      return `<p>Dân làng nhờ việc khi đủ tim (1, 3, 5). Đã giúp ${done}/${NPC_QUESTS.length} việc.</p>${open.length ? open.map((q) => {
        const have = countItem(s, q.item);
        return `<div class="q-row"><div class="q-main"><span><b>${NPC[q.npc].name}</b> · ${q.text}</span><small>Cần ${q.qty} ${ITEMS[q.item].name.toLowerCase()} (có ${have}) · thưởng ${[q.reward.money ? `${q.reward.money} xu` : '', ...(q.reward.items ?? []).map(([it, n]) => `${n} ${ITEMS[it].name.toLowerCase()}`)].filter(Boolean).join(', ')} + tình cảm</small></div><button type="button" class="btn ${have >= q.qty ? 'btn--primary' : ''}" data-npcq="${q.id}" ${have >= q.qty ? '' : 'disabled'}>Giao</button></div>`;
      }).join('') : '<p>Chưa ai nhờ việc — trò chuyện, tặng quà để thân hơn.</p>'}`;
    }
    const titles = titlesOf(p);
    return `<p>Đã mở ${p.achievements.length}/${ACHIEVEMENTS.length} thành tích.</p>
      <div class="chips titles"><span>Danh hiệu:</span><button type="button" class="chip ${!p.title ? 'chip--on' : ''}" data-title="">Không dùng</button>${titles.map((t) => `<button type="button" class="chip ${p.title === t ? 'chip--on' : ''}" data-title="${t}">${t}</button>`).join('')}</div>
      <div class="ach-grid">${ACHIEVEMENTS.map((a) => {
        const on = p.achievements.includes(a.id);
        return `<div class="ach ${on ? 'ach--on' : ''}" title="${a.text}"><b>${on ? a.name : '???'}</b><span>${a.text}</span>${a.title ? `<small>Danh hiệu: ${on ? a.title : '???'}</small>` : ''}</div>`;
      }).join('')}</div>`;
  };

  const render = () => {
    el.innerHTML = `<div class="panel cp"><div class="cp-head"><h2>Nhiệm vụ</h2><div class="tabs">${TABS.map(([id, n]) => `<button type="button" class="tab ${tab === id ? 'tab--on' : ''}" data-tab="${id}">${n}</button>`).join('')}</div></div>
      <div class="cp-body">${body()}</div><div class="row"><button type="button" class="btn btn--primary" data-close>Đóng</button></div></div>`;
  };

  el.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('button');
    if (!b || b.hasAttribute('disabled')) return;
    const d = b.dataset;
    if (d.tab) { tab = d.tab as Tab; return render(); }
    if ('close' in d) return el.remove();
    let got: string[] | null = null;
    if (d.claim) {
      const [kind, i] = d.claim.split(':');
      const r = claimQuest(p, kind as 'daily', Number(i));
      if (r) got = host.withSlot((s) => applyReward(p, s, r, 'Nhiệm vụ'));
    }
    if ('bonus' in d) { const r = claimBonus(p); if (r) got = host.withSlot((s) => applyReward(p, s, r, 'Nhiệm vụ')); }
    if ('story' in d) got = host.withSlot((s) => (s ? claimStory(s) : null));
    if (d.npcq) got = host.withSlot((s) => (s ? deliverNpcQuest(s, d.npcq!) : null));
    if (d.title !== undefined) { p.title = d.title || null; touchProfile(true); return render(); }
    if (got) {
      touchProfile(true);
      sfx('coin');
      host.say(`Nhận: ${got.join(', ') || 'xong'}`);
    }
    render();
  });
  render();
}
