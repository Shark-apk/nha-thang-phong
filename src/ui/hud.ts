// Giao diện HUD bằng HTML/CSS đặt đè lên canvas Phaser: chữ tiếng Việt sắc nét, dễ chỉnh.
import { clockLabel, countItem, priceOf, removeFromSlot, DAY_END, dayOfSeason, HOTBAR, seasonOf, SEASON_DAYS, WEATHER_NAME, weatherFor, yearOf, type FarmState, type Weather } from '../game/farm';
import {
  ANIMALS, BACKPACK, BUILDINGS, CROPS, ITEMS, MACHINES, QUALITY_NAME, RECIPES, SEASON_NAME, shopFor, TIER_NAME, TOOL_ICONS, TOOL_UPGRADES, TOOLS, TREES,
  UPGRADE_DAYS, NPCS, WEEKDAY, LOVE_PER_HEART, GIFTS_PER_WEEK, type BuildingId, type HeartEvent, type ItemId, type NpcDef, type ToolId,
} from '../data';
import { heartsOf, npcState, weekday, weekOf } from '../game/villagers';
import { BAU_CUA, BUNDLES, DISHES, FISH, KITCHEN, RODS, SEASON_NAME as SN, type FishDef } from '../data';
import * as net from '../net/friends';
import { CART_FARE, DECOR, REGIONS, TAILOR, type Guest, type RegionId } from '../data';
import { BUILT, hotItems, HOT_MULT, regionOpen } from '../game/town';
import { levelOf, weekStart, type Profile } from '../game/profile';
import { activeEvent } from '../game/events';
import { paintAvatar } from './avatar';
import { bundleDone, bundleHave, canCook, knowsDish, orderDone, ordersToday } from '../game/activities';
import ICONS from '../../assets/Custom/icons.json';
import { animalsIn, capacityOf, isBuilt } from '../game/animals';
import { canCraft, maxWater, toolTier } from '../game/resources';
import { maxEnergyOf } from '../game/skills';
import type { Slot } from '../game/farm';
import './hud.css';
import { sfx } from '../audio/sound';
import { settings } from './settings';

const SHEETS: Record<string, { url: string; cols: number; w: number; h: number }> = {
  items: { url: '/Objects/Basic_tools_and_meterials.png', cols: 3, w: 48, h: 32 },
  plants: { url: '/Objects/Basic_Plants.png', cols: 6, w: 96, h: 32 },
  crops: { url: '/Custom/crops.png', cols: 6, w: 96, h: 64 },
  season: { url: '/Custom/crops_season.png', cols: 6, w: 96, h: 304 },
  icons: { url: '/Custom/icons.png', cols: 16, w: 256, h: Math.ceil(Object.keys(ICONS).length / 16) * 16 },
  milkgrass: { url: '/Objects/Simple_Milk_and_grass_item.png', cols: 4, w: 64, h: 16 },
  egg: { url: '/Objects/Egg_item.png', cols: 1, w: 16, h: 16 },
};

export function iconStyle(item: ItemId, scale = 3, icon: [string, number] = ITEMS[item].icon) {
  const [sheet, frame] = icon;
  const s = SHEETS[sheet];
  const x = (frame % s.cols) * 16 * scale;
  const y = Math.floor(frame / s.cols) * 16 * scale;
  const hue = ITEMS[item]?.hue ? `;filter:hue-rotate(${ITEMS[item].hue}deg) saturate(1.3)` : '';
  return `background-image:url("${encodeURI(s.url)}");background-size:${s.w * scale}px ${s.h * scale}px;background-position:-${x}px -${y}px${hue}`;
}

interface Handlers {
  select: (slot: number) => void;
  buy: (item: ItemId, qty: number) => boolean;
  build: (b: BuildingId) => boolean;
  buyAnimal: (kind: string) => boolean;
  sleep: () => void;
  setPaused: (p: boolean) => void;
  craft: (id: ItemId) => boolean;
  upgradeTool: (t: ToolId) => boolean;
  upgradeBackpack: () => boolean;
  swap: (a: number, b: number) => void;
  cook: (id: ItemId) => boolean;
  deliver: (i: number) => boolean;
  donate: (bundle: string, item: ItemId) => boolean;
  bauCua: (pick: number, bet: number) => { dice: number[]; win: number } | null;
  buildKitchen: () => boolean;
  visit: (code: string) => void;
  afterRegister: () => void;
  buyPiece: (id: string) => boolean;
  buyDecor: (id: ItemId) => boolean;
  sellNow: (slot: number) => boolean;
  travel: (region: RegionId) => void;
}

/** Hình của ô đồ: dụng cụ đã nâng cấp dùng hình theo cấp (nếu có). */
function slotIcon(s: FarmState, sl: Slot) {
  const tiers = TOOL_ICONS[sl.item as ToolId];
  return iconStyle(sl.item, 3, tiers ? tiers[toolTier(s, sl.item as ToolId)] : undefined);
}
const tierBadge = (s: FarmState, sl: Slot) => {
  const t = (TOOLS as string[]).includes(sl.item) ? toolTier(s, sl.item as ToolId) : 0;
  return t ? `<span class="slot__tier t${t}" title="${TIER_NAME[t]}"></span>` : '';
};

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = '') => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

export class Hud {
  private h!: Handlers;
  private clock = el('div', 'hud-clock');
  private energy = el('div', 'hud-energy', '<div class="hud-energy__fill"></div><span>Sức</span>');
  private hpEl = el('div', 'hud-energy hud-hp', '<div class="hud-energy__fill"></div><span>Máu</span>');
  private bar = el('div', 'hud-bar');
  private hint = el('div', 'hud-hint');
  private toastBox = el('div', 'hud-toast');
  private nightEl = el('div', 'hud-night');
  private fade = el('div', 'hud-fade');
  private modal = el('div', 'hud-modal');
  private weatherEl = el('div', 'hud-weather');
  private flash = el('div', 'hud-flash');
  private banner = el('div', 'hud-banner');
  private tut = el('div', 'hud-tut');
  private tutKey = '';
  private toastTimer = 0;
  /** Ô đang cầm — giữ nguyên khi chuyển bản đồ. */
  selected = 0;

  constructor(private root: HTMLElement) {
    root.append(this.nightEl, this.weatherEl, this.flash, this.banner, this.tut, this.clock, this.energy, this.hpEl, this.bar, this.hint, this.toastBox, this.fade, this.modal);
    for (let i = 0; i < HOTBAR; i++) {
      const b = el('button', 'slot');
      b.type = 'button';
      b.addEventListener('click', () => this.h?.select(i));
      this.bar.append(b);
    }
    // Esc đóng bảng đang mở
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && this.modal.classList.contains('show')) { e.stopImmediatePropagation(); this.close(); } }, true);
    // Tiếng bấm nút giao diện
    root.addEventListener('click', (e) => { if ((e.target as HTMLElement).closest('button')) sfx('click'); });
    this.hint.innerHTML = '<kbd>WASD</kbd> đi · <kbd>Space</kbd>/<kbd>chuột</kbd> dùng · <kbd>F</kbd> ăn · <kbd>I</kbd> túi · <kbd>K</kbd> chế tạo · <kbd>H</kbd> xem hết phím · <kbd>Esc</kbd> cài đặt';
  }

  private state: FarmState | null = null;

  bind(h: Handlers) {
    this.h = h;
  }

  render(s: FarmState, selected: number) {
    this.state = s;
    const left = DAY_END - s.minutes;
    const season = seasonOf(s.day);
    this.clock.innerHTML = `<b class="season-${season}">${SEASON_NAME[season]} · ${dayOfSeason(s.day)}</b><small>${WEEKDAY[weekday(s.day)]} · Năm ${yearOf(s.day)} · ${WEATHER_NAME[s.weather]}</small><span class="${left <= 120 ? 'late' : ''}">${clockLabel(s.minutes)}</span><em>${s.money.toLocaleString('vi-VN')} xu</em>`;
    this.clock.title = `Mai: ${WEATHER_NAME[s.tomorrow]} · bấm C để xem lịch`;
    const fill = this.energy.firstElementChild as HTMLElement;
    fill.style.height = `${(s.energy / maxEnergyOf()) * 100}%`;
    fill.classList.toggle('low', s.energy < 20);
    this.energy.title = `Sức: ${s.energy}/${maxEnergyOf()}`;
    [...this.bar.children].forEach((b, i) => {
      const slot = s.inventory[i];
      b.classList.toggle('slot--on', i === selected);
      b.innerHTML = `<span class="slot__key">${i + 1}</span>${slot ? this.slotHtml(s, slot) : ''}`;
      (b as HTMLButtonElement).title = slot ? this.slotTitle(s, slot) : 'Trống';
      b.setAttribute('aria-label', slot ? `${ITEMS[slot.item].name}${slot.qty > 1 ? ` ×${slot.qty}` : ''}` : `Ô ${i + 1} trống`);
    });
  }

  private slotHtml(s: FarmState, slot: Slot) {
    const water = slot.item === 'can' ? `<span class="slot__water"><span style="width:${(s.water / maxWater(s)) * 100}%"></span></span>` : '';
    const star = slot.q ? `<span class="slot__q q${slot.q}" title="${QUALITY_NAME[slot.q]}"></span>` : '';
    return `<i style='${slotIcon(s, slot)}'></i>${slot.qty > 1 ? `<span class="slot__qty">${slot.qty}</span>` : ''}${water}${star}${tierBadge(s, slot)}`;
  }

  private slotTitle(s: FarmState, slot: Slot) {
    const it = ITEMS[slot.item];
    const tier = (TOOLS as string[]).includes(slot.item) ? toolTier(s, slot.item as ToolId) : 0;
    const extra = slot.item === 'can' ? ` — nước ${s.water}/${maxWater(s)}` : it.energy ? ` — ăn hồi ${it.energy} sức (F)` : it.kind === 'machine' && MACHINES[slot.item as keyof typeof MACHINES] ? ` — ${MACHINES[slot.item as keyof typeof MACHINES].info}` : it.sell ? ` — bán ${it.sell} xu` : '';
    return `${it.name}${tier ? ` ${TIER_NAME[tier]}` : ''}${slot.q ? ` (${QUALITY_NAME[slot.q]})` : ''}${extra}`;
  }

  /** Túi đồ (phím I): bấm 2 ô để đổi chỗ; hàng đầu là thanh công cụ. */
  openInventory(s: FarmState, picked: number | null = null) {
    const box = el('div', 'panel inv', `<h2>Túi đồ · ${s.inventory.length} ô</h2><p>Bấm một ô rồi bấm ô khác để đổi chỗ. Hàng đầu (1–9) là thanh công cụ.</p>`);
    const grid = el('div', 'inv__grid');
    s.inventory.forEach((slot, i) => {
      const b = el('button', `slot${i === picked ? ' slot--on' : ''}${i < HOTBAR ? ' slot--hot' : ''}`, `${i < HOTBAR ? `<span class="slot__key">${i + 1}</span>` : ''}${slot ? this.slotHtml(s, slot) : ''}`);
      b.title = slot ? this.slotTitle(s, slot) : 'Trống';
      b.setAttribute('aria-label', slot ? `${ITEMS[slot.item].name} ×${slot.qty}` : `Ô ${i + 1} trống`);
      b.addEventListener('click', () => {
        if (picked === null) return this.openInventory(s, i);
        if (picked !== i) this.h.swap(picked, i);
        this.openInventory(s, null);
      });
      grid.append(b);
    });
    const tools = TOOLS.map((t) => `${ITEMS[t].name} <b>${TIER_NAME[toolTier(s, t)]}</b>`).join(' · ');
    const up = s.upgrading ? ` · Thợ rèn đang làm ${ITEMS[s.upgrading.tool].name.toLowerCase()} (xong ngày ${s.upgrading.readyDay})` : '';
    const close = el('button', 'btn btn--primary', 'Đóng');
    close.addEventListener('click', () => this.close());
    box.append(grid, el('p', 'inv__tools', tools + up), close);
    this.open(box);
  }

  /** Bảng chế tạo (phím K). */
  openCrafting(s: FarmState) {
    const box = el('div', 'panel shop', '<h2>Chế tạo</h2><p>Gỗ: chặt cây bằng rìu · Đá & quặng: đập đá ngoài đồng hoặc trong hang (cửa hang ở góc đông bắc).</p>');
    const list = el('div', 'shop__list');
    for (const r of RECIPES) {
      const it = ITEMS[r.id];
      const needs = r.needs.map(([id, n]) => `<span class="${countItem(s, id) >= n ? 'have' : 'lack'}">${n} ${ITEMS[id].name.toLowerCase()} (${countItem(s, id)})</span>`).join(', ');
      const info = MACHINES[r.id as keyof typeof MACHINES]?.info ?? 'đặt trên cỏ, 4 ngày ra mật';
      const row = el('div', 'shop__row', `<i style='${iconStyle(r.id)}'></i><div><b>${it.name}</b><span>${info}</span><span class="needs">${needs}</span></div>`);
      const b = el('button', 'btn', 'Làm') as HTMLButtonElement;
      b.disabled = !canCraft(s, r.id);
      b.addEventListener('click', () => { if (this.h.craft(r.id)) this.openCrafting(s); });
      row.append(b);
      list.append(row);
    }
    const close = el('button', 'btn btn--primary', 'Xong');
    close.addEventListener('click', () => this.close());
    box.append(list, close);
    this.open(box);
  }

  toast(msg: string) {
    this.toastBox.textContent = msg;
    this.toastBox.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastBox.classList.remove('show'), 2600);
  }

  /** Trời tối dần từ 18:00, tối hẳn lúc 22:00. */
  night(minutes: number) {
    const a = Math.max(0, Math.min(1, (minutes - 18 * 60) / (4 * 60)));
    this.nightEl.style.opacity = String(a * 0.62);
  }

  private open(content: HTMLElement) {
    this.modal.replaceChildren(content);
    this.modal.classList.add('show');
    this.h.setPaused(true);
  }

  /** Thanh máu trong hang sâu; `null` là ẩn. */
  hp(v: number | null, max = 100) {
    this.hpEl.classList.toggle('show', v !== null);
    if (v === null) return;
    const fill = this.hpEl.firstElementChild as HTMLElement;
    fill.style.height = `${Math.max(0, (v / max) * 100)}%`;
    fill.classList.toggle('low', v / max < 0.3);
    this.hpEl.title = `Máu: ${Math.max(0, Math.round(v))}/${max}`;
  }

  /** Tạm dừng / chạy lại game (sảnh ngoài dùng). */
  pause(p: boolean) {
    this.h?.setPaused(p);
  }

  close() {
    this.modal.classList.remove('show');
    this.modal.replaceChildren();
    this.h.setPaused(false);
  }

  confirmSleep(s: FarmState) {
    const box = el('div', 'panel', `<h2>Đi ngủ?</h2><p>Kết thúc ngày ${s.day}. Cây đã tưới sẽ lớn thêm, hàng trong thùng được bán, game tự lưu.</p>`);
    const row = el('div', 'row');
    const yes = el('button', 'btn btn--primary', 'Ngủ thôi');
    const no = el('button', 'btn', 'Chưa');
    yes.addEventListener('click', () => { this.close(); this.h.sleep(); });
    no.addEventListener('click', () => this.close());
    row.append(yes, no);
    box.append(row);
    this.open(box);
    yes.focus();
  }

  /** Hộp chọn nhiều nút. */
  choose(title: string, text: string, options: { label: string; primary?: boolean; fn: () => void }[]) {
    const box = el('div', 'panel', `<h2>${title}</h2><p>${text}</p>`);
    const row = el('div', 'row');
    for (const o of options) {
      const b = el('button', o.primary ? 'btn btn--primary' : 'btn', o.label);
      b.addEventListener('click', () => { this.close(); o.fn(); });
      row.append(b);
    }
    box.append(row);
    this.open(box);
    (row.firstElementChild as HTMLButtonElement)?.focus();
  }

  /** Cửa hàng; `owner` = tên dân làng đứng quầy (chỉ hiện tab của họ). */
  openShop(s: FarmState, tab: 'seeds' | 'animals' | 'smith' | 'fish' | 'festival' = 'seeds', owner?: string, items: ItemId[] = []) {
    const season = seasonOf(s.day);
    const box = el('div', 'panel shop');
    const tabs = el('div', 'tabs');
    if (owner) tabs.innerHTML = `<b class="shop__owner">${owner}</b>`;
    for (const [id, label] of owner ? [] : [['seeds', `Hạt giống · mùa ${SEASON_NAME[season]}`], ['animals', 'Chuồng trại & vật nuôi'], ['smith', 'Thợ rèn']] as const) {
      const b = el('button', `tab${tab === id ? ' tab--on' : ''}`, label);
      b.setAttribute('aria-pressed', String(tab === id));
      b.addEventListener('click', () => this.openShop(s, id, owner));
      tabs.append(b);
    }
    const money = el('p', '', `Bạn có <b>${s.money.toLocaleString('vi-VN')} xu</b>.${tab === 'seeds' ? ` Còn ${SEASON_DAYS - dayOfSeason(s.day)} ngày nữa hết mùa.` : ''}`);
    const refreshMoney = () => ((money.querySelector('b') as HTMLElement).textContent = `${s.money.toLocaleString('vi-VN')} xu`);
    const list = el('div', 'shop__list');
    if (tab === 'seeds') {
      for (const id of shopFor(season)) list.append(this.shopRow(id, s, refreshMoney));
    } else if (tab === 'festival') {
      for (const id of items) list.append(this.shopRow(id, s, refreshMoney));
    } else if (tab === 'fish') {
      for (const id of Object.keys(RODS)) list.append(this.shopRow(id, s, refreshMoney));
      const caught = FISH.filter((f) => s.fishCaught[f.id]).length;
      list.append(el('p', 'fishbook__head', `Sổ tay câu cá · đã câu ${caught}/${FISH.length} loại`));
      for (const f of FISH) list.append(this.fishRow(s, f));
    } else if (tab === 'smith') {
      for (const t of TOOLS) {
        const tier = toolTier(s, t);
        const up = TOOL_UPGRADES[tier];
        const busy = s.upgrading?.tool === t;
        const icon = TOOL_ICONS[t]?.[Math.min(3, tier + 1)];
        const state = busy ? `đang rèn — xong sáng ngày ${s.upgrading!.readyDay}` : !up ? 'đã cấp vàng, tốt nhất rồi' : `lên ${TIER_NAME[tier + 1]}: ${up.cost.toLocaleString('vi-VN')} xu + 5 ${ITEMS[up.ore].name.toLowerCase()} (có ${countItem(s, up.ore)}) · ${UPGRADE_DAYS} ngày`;
        const perk = t === 'can' ? 'chứa 40/60/100 nước, Shift tưới cả vùng' : t === 'hoe' ? 'Shift cuốc 3 ô / 5 ô / 3×3' : 'đánh mạnh hơn; từ cấp đồng phá được gốc cây to / tảng đá lớn / quặng vàng';
        const row = el('div', 'shop__row', `<i style='${iconStyle(t, 3, icon)}'></i><div><b>${ITEMS[t].name} ${TIER_NAME[tier]}</b><span>${state}</span><span>${perk}</span></div>`);
        if (up && !busy) {
          const b = el('button', 'btn', 'Rèn') as HTMLButtonElement;
          b.disabled = !!s.upgrading;
          b.title = s.upgrading ? 'Thợ rèn chỉ nhận 1 món một lúc' : '';
          b.addEventListener('click', () => { if (this.h.upgradeTool(t)) this.openShop(s, 'smith', owner); });
          row.append(b);
        }
        list.append(row);
      }
      for (const id of ['wood', 'stone', ...(countItem(s, 'sword') ? [] : ['sword'])]) list.append(this.shopRow(id, s, refreshMoney));
      const kit = el('div', 'shop__row', `<i style='${iconStyle('com_trang')}'></i><div><b>Nâng nhà: làm bếp</b><span>${s.flags.includes('kitchen') ? 'đã có bếp — vào nhà, bấm vào bếp để nấu' : `${KITCHEN.cost.toLocaleString('vi-VN')} xu + ${KITCHEN.wood} gỗ (có ${countItem(s, 'wood')}) · nấu món ăn hồi sức nhiều`}</span></div>`);
      if (!s.flags.includes('kitchen')) {
        const b = el('button', 'btn', 'Làm');
        b.addEventListener('click', () => { if (this.h.buildKitchen()) this.openShop(s, 'smith', owner); });
        kit.append(b);
      }
      list.append(kit);
      const next = BACKPACK.find((b) => b.size > s.inventory.length);
      const row = el('div', 'shop__row', `<i class="shop__bag"></i><div><b>Túi đồ ${s.inventory.length} ô</b><span>${next ? `nới lên ${next.size} ô: ${next.cost.toLocaleString('vi-VN')} xu` : 'đã to nhất'}</span></div>`);
      if (next) {
        const b = el('button', 'btn', 'Nâng');
        b.addEventListener('click', () => { if (this.h.upgradeBackpack()) this.openShop(s, 'smith', owner); });
        row.append(b);
      }
      list.append(row);
    } else {
      for (const b of Object.values(BUILDINGS)) {
        const bd = s.buildings[b.id];
        const state = !bd ? `${b.cost.toLocaleString('vi-VN')} xu` : bd.readyDay > s.day ? 'đang xây — mai xong' : b.id === 'pond' ? 'đã có — cá tự sinh 2 ngày/con' : `đã có · ${animalsIn(s, b.id as 'coop').length}/${capacityOf(s, b.id)} con`;
        const row = el('div', 'shop__row', `<i class="shop__build"></i><div><b>${b.name}</b><span>${state}</span></div>`);
        if (!bd) {
          const btn = el('button', 'btn', 'Xây');
          btn.addEventListener('click', () => { if (this.h.build(b.id)) this.openShop(s, 'animals', owner); });
          row.append(btn);
        }
        list.append(row);
      }
      for (const a of Object.values(ANIMALS)) {
        const home = BUILDINGS[a.home];
        const can = isBuilt(s, a.home);
        const prod = a.product ? `ra ${ITEMS[a.product].name.toLowerCase()} mỗi ${a.every} ngày${a.grazeOnly ? ' (khi ra đồng)' : ''}` : 'cày 3×3 ô mỗi nhát cuốc (khi đủ 2 tim)';
        const row = el('div', 'shop__row', `<i style='${this.animalIcon(a.kind)}'></i><div><b>${a.name} · ${a.price.toLocaleString('vi-VN')} xu</b><span>${home.name} · ${prod}</span></div>`);
        const btn = el('button', 'btn', can ? 'Mua' : 'Cần chuồng') as HTMLButtonElement;
        btn.disabled = !can;
        btn.addEventListener('click', () => { if (this.h.buyAnimal(a.kind)) this.openShop(s, 'animals', owner); });
        row.append(btn);
        list.append(row);
      }
      for (const id of ['hay', 'beehive']) list.append(this.shopRow(id, s, refreshMoney));
    }
    const close = el('button', 'btn btn--primary', 'Xong');
    close.addEventListener('click', () => this.close());
    box.append(tabs, money, list, close);
    this.open(box);
  }

  private animalIcon(kind: string) {
    const sp = ANIMALS[kind].sprite;
    if (sp.tex === 'icons') return `background-image:url("/Custom/icons.png");background-size:${256 * 3}px ${64 * 3}px;background-position:-${(sp.idle[0] % 16) * 48}px -${Math.floor(sp.idle[0] / 16) * 48}px`;
    if (sp.tex === 'chicken') return `background-image:url("${encodeURI('/Characters/Free Chicken Sprites.png')}");background-size:${64 * 3}px ${32 * 3}px;background-position:0 0`;
    return `background-image:url("${encodeURI('/Characters/Free Cow Sprites.png')}");background-size:${96 * 1.5}px ${64 * 1.5}px;background-position:0 0`;
  }

  private fishRow(s: FarmState, f: FishDef) {
    const n = s.fishCaught[f.id] ?? 0;
    const where = f.where.map((w) => ({ pond: 'ao', river: 'sông làng', sea: 'biển quanh nông trại' })[w]).join(', ');
    const hours = `${Math.floor(f.hours[0] / 60)}h–${Math.floor(f.hours[1] / 60) % 24}h`;
    const seasons = f.seasons.length === 4 ? 'quanh năm' : f.seasons.map((x) => SN[x]).join(', ');
    return el('div', `shop__row${n ? '' : ' fish--unknown'}`, `<i style='${iconStyle(f.id)}'></i><div><b>${n ? f.name : '???'} ${n ? `· đã câu ${n}` : ''}</b><span>${seasons} · ${where} · ${hours} · ${'★'.repeat(Math.ceil(f.diff / 20))} · ${f.sell} xu</span></div>`);
  }

  private shopRow(id: ItemId, s: FarmState, refreshMoney: () => void) {
    const it = ITEMS[id];
    const crop = it.crop ? CROPS[it.crop] : null;
    const tree = it.tree ? TREES[it.tree] : null;
    let info = '';
    if (crop) {
      const days = crop.stageDays[crop.stageDays.length - 1];
      const harvest = ITEMS[crop.harvest];
      info = `chín ${days} ngày${crop.regrow ? ` · mọc lại ${crop.regrow} ngày` : ''} · bán ${harvest.sell}${crop.yield > 1 ? `×${crop.yield}` : ''} xu${crop.paddy ? ' · ruộng nước' : ''}`;
    } else if (tree) info = `ra trái sau ${tree.grow} ngày · mùa ${tree.seasons.map((x) => SEASON_NAME[x]).join(', ')} · ${ITEMS[tree.fruit].sell} xu/quả`;
    else if (it.kind === 'fertilizer') info = 'bón lên đất đã cuốc → dễ ra nông sản bạc, vàng';
    else if (id === 'hay') info = 'đổ vào máng trong chuồng, mỗi con ăn 1 phần/ngày';
    else if (id === 'beehive') info = 'đặt trên cỏ, 4 ngày ra mật; gần hoa ra mật hoa';
    else if (it.kind === 'material') info = 'nguyên liệu chế tạo (K)';
    const price = priceOf(s, id);
    const row = el('div', 'shop__row', `<i style='${iconStyle(id)}'></i><div><b>${it.name}</b><span>${price}${price < it.buy ? ` <s>${it.buy}</s>` : ''} xu · ${info}</span></div>`);
    for (const q of [1, 5, 10]) {
      const b = el('button', 'btn', `+${q}`);
      b.title = `${price * q} xu`;
      b.addEventListener('click', () => { if (this.h.buy(id, q)) refreshMoney(); });
      row.append(b);
    }
    return row;
  }

  /** Hộp thoại dân làng: chân dung + tên + lời; nút tùy chọn (mặc định "Tạm biệt"). */
  say(npc: NpcDef, text: string, buttons: { label: string; primary?: boolean; fn: () => void }[] = [{ label: 'Tạm biệt', primary: true, fn: () => {} }], s?: FarmState) {
    const hearts = s ? heartsOf(npcState(s, npc.id).love) : null;
    const box = el('div', 'panel talk');
    const face = el('div', 'talk__face');
    face.style.backgroundPosition = `-${(npc.portrait % 8) * 96}px -${Math.floor(npc.portrait / 8) * 96}px`;
    const body = el('div', 'talk__body', `<b>${npc.name}${hearts !== null ? ` <span class="talk__hearts" title="${hearts}/10 tim">${'♥'.repeat(hearts)}<i>${'♥'.repeat(10 - hearts)}</i></span>` : ''}</b><p>${text}</p>`);
    const row = el('div', 'row');
    for (const o of buttons) {
      const b = el('button', o.primary ? 'btn btn--primary' : 'btn', o.label);
      b.addEventListener('click', () => { this.close(); o.fn(); });
      row.append(b);
    }
    body.append(row);
    box.append(face, body);
    this.open(box);
    (row.firstElementChild as HTMLButtonElement)?.focus();
  }

  /** Hộp thoại khách mời: chân dung từ guests.png (32×32, 12 cột). */
  sayGuest(g: Guest, text: string, buttons: { label: string; primary?: boolean; fn: () => void }[] = [{ label: 'Tạm biệt', primary: true, fn: () => {} }]) {
    const box = el('div', 'panel talk');
    const face = el('div', 'talk__face talk__face--guest');
    face.style.backgroundPosition = `-${(g.portrait % 12) * 96}px -${Math.floor(g.portrait / 12) * 96}px`;
    const body = el('div', 'talk__body', `<b>${g.name} <span class="talk__guest">· khách mời ${'★'.repeat(g.rarity)}</span></b><p>${text}</p>`);
    const row = el('div', 'row');
    for (const o of buttons) {
      const b = el('button', o.primary ? 'btn btn--primary' : 'btn', o.label);
      b.addEventListener('click', () => { this.close(); o.fn(); });
      row.append(b);
    }
    body.append(row);
    box.append(face, body);
    this.open(box);
    (row.firstElementChild as HTMLButtonElement)?.focus();
  }

  /** Rạp hát: khách ngôi sao biểu diễn — chân dung nhún theo nhạc, lời hát chạy lần lượt. */
  theater(g: Guest, reward: number | null) {
    const lyrics = [...g.lines, g.quote].map((l) => `♪ ${l} ♪`);
    const box = el('div', 'panel stage', `<h2>Rạp hát chợ huyện</h2><div class="stage__curtain"><div class="stage__star talk__face--guest" style="background-position:-${(g.portrait % 12) * 96}px -${Math.floor(g.portrait / 12) * 96}px"></div><p class="stage__lyric">${lyrics[0]}</p></div><p>${g.name} biểu diễn tối nay!${reward ? ` Khán giả được tặng ${reward} tem.` : ' (Tuần này bạn đã nhận quà xem diễn.)'}</p>`);
    const close = el('button', 'btn btn--primary', 'Vỗ tay & về');
    close.addEventListener('click', () => { window.clearInterval(t); this.close(); });
    box.append(close);
    this.open(box);
    let i = 0;
    const t = window.setInterval(() => {
      if (!this.modal.contains(box)) return window.clearInterval(t);
      i = (i + 1) % lyrics.length;
      (box.querySelector('.stage__lyric') as HTMLElement).textContent = lyrics[i];
      sfx('catch');
    }, 1800);
  }

  /** Sự kiện tim: đọc từng đoạn, có thể chọn lựa; xong gọi `done(điểm cộng thêm)`. */
  story(npc: NpcDef, ev: HeartEvent, done: (love: number) => string | null) {
    const step = (i: number) => {
      if (i < ev.lines.length) {
        const title = i === 0 ? `<em class="talk__event">♥ ${ev.hearts} tim · ${ev.title}</em><br>` : '';
        return this.say(npc, title + ev.lines[i], [{ label: 'Tiếp', primary: true, fn: () => step(i + 1) }]);
      }
      if (ev.choice) {
        return this.say(npc, ev.choice.q, ev.choice.options.map((o) => ({ label: o.label, fn: () => finish(o.love, o.reply) })));
      }
      finish(0);
    };
    const finish = (love: number, reply?: string) => {
      const reward = done(love);
      const text = [reply, reward ? `<b class="talk__reward">${reward}</b>` : ''].filter(Boolean).join('<br>');
      if (text) this.say(npc, text);
    };
    step(0);
  }

  /**
   * Trò câu cá: giữ Space / chuột để nâng vùng xanh theo con cá.
   * Cá trong vùng → thanh tiến độ đầy dần; đầy là kéo được, cạn là sổng.
   */
  fishing(fish: FishDef, bar: number, done: (caught: boolean, perfect: boolean) => void) {
    const box = el('div', 'panel fishing', `<h2>Câu cá</h2><p class="fishing__msg">Đang chờ cá cắn câu…</p>`);
    const game = el('div', 'fishing__game');
    const track = el('div', 'fishing__track');
    const zone = el('div', 'fishing__zone');
    const fishEl = el('i', 'fishing__fish');
    fishEl.setAttribute('style', iconStyle(fish.id, 2));
    const prog = el('div', 'fishing__prog', '<span></span>');
    track.append(zone, fishEl);
    game.append(track, prog);
    const hint = el('p', 'fishing__hint', 'Giữ <kbd>Space</kbd> hoặc giữ chuột để kéo vùng xanh lên');
    box.append(game, hint);
    this.open(box);
    const msg = box.querySelector('.fishing__msg') as HTMLElement;
    let hold = false;
    const down = (e: Event) => { if (e instanceof KeyboardEvent && e.code !== 'Space') return; e.preventDefault(); hold = true; };
    const up = (e: Event) => { if (e instanceof KeyboardEvent && e.code !== 'Space') return; hold = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    game.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    const cleanup = () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('pointerup', up);
    };
    // Vị trí 0 = đáy, 1 = đỉnh
    let zy = 0, zv = 0, fy = 0.3, ft = 0.5, progress = 0.3, perfect = true, last = 0, started = false;
    const speed = 0.25 + fish.diff / 100;
    const frame = (t: number) => {
      if (!this.modal.contains(box)) return cleanup();
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      if (started) {
        zv += (hold ? 2.6 : -2.2) * dt;
        zv = Math.max(-1.4, Math.min(1.4, zv));
        zy += zv * dt;
        if (zy < 0) { zy = 0; zv = Math.max(0, zv) * -0.3; }
        if (zy > 1 - bar) { zy = 1 - bar; zv = Math.min(0, zv); }
        if (Math.random() < dt * (0.8 + fish.diff / 40)) ft = Math.random();
        fy += Math.sign(ft - fy) * Math.min(Math.abs(ft - fy), speed * dt);
        const inside = fy >= zy && fy <= zy + bar;
        progress += (inside ? 0.32 : -0.24) * dt;
        if (!inside) perfect = false;
        if (progress >= 1 || progress <= 0) {
          cleanup();
          this.close();
          return done(progress >= 1, perfect);
        }
      }
      zone.style.height = `${bar * 100}%`;
      zone.style.bottom = `${zy * 100}%`;
      fishEl.style.bottom = `calc(${fy * 100}% - 16px)`;
      (prog.firstElementChild as HTMLElement).style.height = `${Math.max(0, progress) * 100}%`;
      requestAnimationFrame(frame);
    };
    window.setTimeout(() => { started = true; msg.textContent = 'Cá cắn câu! Giữ cá trong vùng xanh!'; }, 700 + Math.random() * 1600);
    requestAnimationFrame(frame);
  }

  /** Bếp trong nhà. */
  openCooking(s: FarmState) {
    const box = el('div', 'panel shop', '<h2>Bếp</h2><p>Món nấu hồi sức nhiều hơn ăn sống, bán cũng được giá.</p>');
    const list = el('div', 'shop__list');
    for (const d of DISHES) {
      const known = knowsDish(s, d.id);
      const needs = d.needs.map(([id, n]) => `<span class="${countItem(s, id) >= n ? 'have' : 'lack'}">${n} ${ITEMS[id].name.toLowerCase()} (${countItem(s, id)})</span>`).join(', ');
      const row = el('div', 'shop__row', `<i style='${iconStyle(d.id)}'></i><div><b>${known ? d.name : '??? (chưa học công thức)'}</b><span>hồi ${d.energy} sức · bán ${d.sell} xu</span><span class="needs">${known ? needs : 'Có người trong làng biết cách nấu'}</span></div>`);
      const b = el('button', 'btn', 'Nấu') as HTMLButtonElement;
      b.disabled = !canCook(s, d.id);
      b.addEventListener('click', () => { if (this.h.cook(d.id)) this.openCooking(s); });
      row.append(b);
      list.append(row);
    }
    const close = el('button', 'btn btn--primary', 'Xong');
    close.addEventListener('click', () => this.close());
    box.append(list, close);
    this.open(box);
  }

  /** Bảng tin: 3 đơn đặt hàng mỗi ngày. */
  openOrders(s: FarmState) {
    const box = el('div', 'panel shop', '<h2>Bảng tin làng</h2><p>Dân làng đặt hàng mỗi sáng, hết ngày là hết hạn. Giao đơn được tiền và thêm tình cảm.</p>');
    const list = el('div', 'shop__list');
    ordersToday(s).forEach((o, i) => {
      const npc = NPCS.find((n) => n.id === o.npc)!;
      const done = orderDone(s, i);
      const have = countItem(s, o.item);
      const row = el('div', 'shop__row', `<i style='${iconStyle(o.item)}'></i><div><b>${npc.name} cần ${o.qty} ${ITEMS[o.item].name.toLowerCase()}</b><span>${done ? 'đã giao — cảm ơn nhiều!' : `thưởng ${o.reward.toLocaleString('vi-VN')} xu + tình cảm · bạn có ${have}`}</span></div>`);
      if (!done) {
        const b = el('button', 'btn', 'Giao') as HTMLButtonElement;
        b.disabled = have < o.qty;
        b.addEventListener('click', () => { if (this.h.deliver(i)) this.openOrders(s); });
        row.append(b);
      }
      list.append(row);
    });
    const close = el('button', 'btn btn--primary', 'Xong');
    close.addEventListener('click', () => this.close());
    box.append(list, close);
    this.open(box);
  }

  /** Đình làng: 4 bộ sưu tập. */
  openBundles(s: FarmState, extra?: { label: string; fn: () => void }) {
    const box = el('div', 'panel shop', '<h2>Đình làng</h2><p>Đình xuống cấp rồi. Góp đồ vào các bộ để làng sửa đình và tặng lại phần thưởng.</p>');
    const list = el('div', 'shop__list');
    for (const b of BUNDLES) {
      const done = bundleDone(s, b.id);
      const wrap = el('div', `bundle${done ? ' bundle--done' : ''}`, `<b>${b.name}</b> <span>→ ${b.reward}${done ? ' ✓' : ''}</span>`);
      const items = el('div', 'bundle__items');
      for (const [it, n] of b.needs) {
        const got = bundleHave(s, b.id, it);
        const btn = el('button', `slot${got >= n ? ' slot--full' : ''}`, `<i style='${iconStyle(it)}'></i><span class="slot__qty">${got}/${n}</span>`) as HTMLButtonElement;
        btn.title = `${ITEMS[it].name}: đã góp ${got}/${n} · bạn có ${countItem(s, it)}`;
        btn.disabled = done || got >= n || countItem(s, it) === 0;
        btn.addEventListener('click', () => { if (this.h.donate(b.id, it)) this.openBundles(s, extra); });
        items.append(btn);
      }
      wrap.append(items);
      list.append(wrap);
    }
    const row = el('div', 'row');
    if (extra) {
      const x = el('button', 'btn', extra.label);
      x.addEventListener('click', () => { this.close(); extra.fn(); });
      row.append(x);
    }
    const close = el('button', 'btn btn--primary', 'Xong');
    close.addEventListener('click', () => this.close());
    row.append(close);
    box.append(list, row);
    this.open(box);
  }

  /** Bầu cua tôm cá ngày Tết. */
  openBauCua(s: FarmState, last?: { dice: number[]; win: number }) {
    const box = el('div', 'panel baucua', `<h2>Bầu cua tôm cá</h2><p>Chọn một con và mức cược. Lắc 3 hột: ra mấy con trúng thì ăn bấy nhiêu lần. Bạn có <b>${s.money.toLocaleString('vi-VN')} xu</b>.</p>`);
    const sym = (i: number, scale = 3) => `background-image:url('/Custom/icons.png');background-size:${256 * scale}px auto;background-position:-${(ICONS[BAU_CUA[i].icon] % 16) * 16 * scale}px -${Math.floor(ICONS[BAU_CUA[i].icon] / 16) * 16 * scale}px`;
    if (last) {
      box.append(el('div', 'baucua__dice', last.dice.map((d) => `<i style="${sym(d, 4)}"></i>`).join('') + `<b class="${last.win > 0 ? 'win' : 'lose'}">${last.win > 0 ? `Trúng ${last.win} xu!` : `Thua ${-last.win} xu`}</b>`));
    }
    let bet = 100;
    const bets = el('div', 'row');
    for (const b of [50, 100, 500]) {
      const btn = el('button', `tab${b === bet ? ' tab--on' : ''}`, `${b} xu`);
      btn.addEventListener('click', () => { bet = b; [...bets.children].forEach((c) => c.classList.toggle('tab--on', c === btn)); });
      bets.append(btn);
    }
    const board = el('div', 'baucua__board');
    BAU_CUA.forEach((c, i) => {
      const b = el('button', 'slot', `<i style="${sym(i)}"></i><span class="slot__key">${c.name}</span>`);
      b.addEventListener('click', () => { const r = this.h.bauCua(i, bet); if (r) this.openBauCua(s, r); });
      board.append(b);
    });
    const close = el('button', 'btn btn--primary', 'Thôi, nghỉ chơi');
    close.addEventListener('click', () => this.close());
    box.append(bets, board, close);
    this.open(box);
  }

  /** Bản đồ thế giới (phím M, bến xe bò): bấm vùng đã mở để đi xe bò. */
  openWorldMap(s: FarmState, p: Profile, here: string, canTravel: boolean) {
    const lv = levelOf(p.xp).level;
    const box = el('div', 'panel worldmap', `<h2>Bản đồ thế giới</h2><p>Đi xe bò ${CART_FARE} xu, mất 1 giờ (về nông trại miễn phí). Cấp nông trại: ${lv}.</p>`);
    const map = el('div', 'wm');
    for (const r of REGIONS) {
      const open = regionOpen(p, s, r.id);
      const built = BUILT.includes(r.id);
      const isHere = r.scene === here;
      const b = el('button', `wm__pin${isHere ? ' wm__pin--here' : ''}${open ? '' : ' wm__pin--lock'}`, `<b>${r.name}</b><small>${isHere ? 'bạn ở đây' : !open ? `cấp ${r.level}` : built ? r.info : 'sắp có'}</small>`) as HTMLButtonElement;
      b.style.left = `${(r.pin[0] / 320) * 100}%`;
      b.style.top = `${(r.pin[1] / 200) * 100}%`;
      b.disabled = isHere || !open || !built || !canTravel;
      b.title = r.info;
      b.addEventListener('click', () => { this.close(); this.h.travel(r.id); });
      map.append(b);
    }
    const close = el('button', 'btn btn--primary', 'Đóng');
    close.addEventListener('click', () => this.close());
    box.append(map, el('p', 'cp-note', canTravel ? 'Bấm vào vùng muốn tới.' : 'Ra ngoài trời (nông trại, làng, chợ huyện) rồi mở bản đồ để đi xe bò.'), close);
    this.open(box);
  }

  /** Tiệm may: nón, đồ trên mặt, áo — vào tủ đồ ở hồ sơ. */
  openTailor(s: FarmState, p: Profile) {
    const box = el('div', 'panel shop', `<h2>Tiệm may</h2><p>Bạn có <b>${s.money.toLocaleString('vi-VN')} xu</b>. Món mua xong mặc ở trang nhân vật (Tab → bấm nhân vật).</p>`);
    const list = el('div', 'shop__list');
    for (const t of TAILOR) {
      const own = p.wardrobe.includes(t.id);
      const row = el('div', 'shop__row', `<i class="shop__piece"></i><div><b>${t.name}</b><span>${own ? 'đã có' : `${t.price.toLocaleString('vi-VN')} xu`}</span></div>`);
      // Xem trước: nhân vật của mình mặc thử món này
      const [kind, id] = [t.id.slice(0, t.id.indexOf('_')), t.id.slice(t.id.indexOf('_') + 1)];
      const look = { ...p.look, ...(kind === 'hat' ? { hat: id } : kind === 'face' ? { face: id } : { shirt: Number(id) }) };
      paintAvatar(row.querySelector('.shop__piece')!, look, 0, 2);
      if (!own) {
        const b = el('button', 'btn', 'Mua');
        b.addEventListener('click', () => { if (this.h.buyPiece(t.id)) this.openTailor(s, p); });
        row.append(b);
      }
      list.append(row);
    }
    const close = el('button', 'btn btn--primary', 'Xong');
    close.addEventListener('click', () => this.close());
    box.append(list, close);
    this.open(box);
  }

  /** Tiệm trang trí: đồ đặt trên nông trại. */
  openDecorShop(s: FarmState) {
    const box = el('div', 'panel shop', `<h2>Tiệm trang trí</h2><p>Bạn có <b>${s.money.toLocaleString('vi-VN')} xu</b>. Đặt trên cỏ ở nông trại; cầm rìu bấm vào để nhặt lại.</p>`);
    const list = el('div', 'shop__list');
    for (const [id, d] of Object.entries(DECOR)) {
      const row = el('div', 'shop__row', `<i style='${iconStyle(id)}'></i><div><b>${d.name}</b><span>${d.price.toLocaleString('vi-VN')} xu · điểm đẹp +${d.beauty}</span></div>`);
      const b = el('button', 'btn', 'Mua');
      b.addEventListener('click', () => { if (this.h.buyDecor(id)) this.openDecorShop(s); });
      row.append(b);
      list.append(row);
    }
    const close = el('button', 'btn btn--primary', 'Xong');
    close.addEventListener('click', () => this.close());
    box.append(list, close);
    this.open(box);
  }

  /** Vựa thu mua: bán ngay cả chồng đang cầm; 3 món giá cao tuần này. */
  openWholesale(s: FarmState, slot: number) {
    const hot = hotItems(s);
    const held = s.inventory[slot];
    const box = el('div', 'panel shop', `<h2>Vựa thu mua</h2><p>Bán ngay, trả tiền liền. Tuần này vựa mua giá cao (×1,5):</p>`);
    const list = el('div', 'shop__list');
    for (const id of hot) list.append(el('div', 'shop__row', `<i style='${iconStyle(id)}'></i><div><b>${ITEMS[id].name}</b><span>${Math.round(ITEMS[id].sell * HOT_MULT)} xu (thường ${ITEMS[id].sell})</span></div>`));
    const sell = el('button', 'btn btn--primary', held && ITEMS[held.item].sell ? `Bán ${held.qty} ${ITEMS[held.item].name.toLowerCase()} đang cầm` : 'Cầm món muốn bán rồi bấm vào vựa') as HTMLButtonElement;
    sell.disabled = !held || !ITEMS[held.item].sell;
    sell.addEventListener('click', () => { if (this.h.sellNow(slot)) this.close(); });
    const close = el('button', 'btn', 'Thôi');
    close.addEventListener('click', () => this.close());
    const row = el('div', 'row');
    row.append(sell, close);
    box.append(list, row);
    this.open(box);
  }

  /** Bạn bè (phím B): đăng ký mã, kết bạn, ghé thăm. */
  async openFriends(s: FarmState, tab: 'friends' | 'rank' | 'contest' | 'market' = 'friends') {
    const id = net.loadIdentity();
    const box = el('div', 'panel shop friends', '<h2>Bạn bè</h2>');
    const close = el('button', 'btn btn--primary', 'Đóng');
    close.addEventListener('click', () => this.close());
    if (!id) {
      box.insertAdjacentHTML('beforeend', `<p>Đặt tên nông trại để nhận <b>mã bạn bè</b>. Gửi mã cho bạn để ghé thăm, tưới giúp, để quà cho nhau — không cần cùng lúc online.</p>`);
      const name = el('input', 'field') as HTMLInputElement;
      name.placeholder = 'Tên nông trại (vd. Vườn nhà Phong)';
      name.maxLength = 24;
      const url = el('input', 'field') as HTMLInputElement;
      url.value = net.defaultUrl();
      url.title = 'Địa chỉ máy chủ bạn bè (npm run server, hoặc địa chỉ Cloudflare Tunnel)';
      const err = el('p', 'friends__err');
      const go = el('button', 'btn btn--primary', 'Đăng ký');
      go.addEventListener('click', async () => {
        err.textContent = 'Đang kết nối…';
        try {
          await net.register(url.value.trim(), name.value);
          this.h.afterRegister();
          this.openFriends(s);
        } catch (e) { err.textContent = (e as Error).message; }
      });
      box.append(el('label', 'friends__label', 'Tên nông trại'), name, el('label', 'friends__label', 'Máy chủ'), url, err, el('div', 'row'));
      (box.lastElementChild as HTMLElement).append(go, close);
      this.open(box);
      name.focus();
      return;
    }
    box.insertAdjacentHTML('beforeend', `<p>Mã của bạn: <b class="friends__code">${id.code}</b> · ${id.name}<br><small>Máy chủ: ${id.url}</small></p>`);
    const tabs = el('div', 'tabs');
    for (const [t, label] of [['friends', 'Bạn bè'], ['rank', 'Xếp hạng'], ['contest', 'Thi đấu'], ['market', 'Chợ']] as const) {
      const b = el('button', `tab${t === tab ? ' tab--on' : ''}`, label);
      b.addEventListener('click', () => this.openFriends(s, t));
      tabs.append(b);
    }
    const list = el('div', 'shop__list', '<p>Đang tải…</p>');
    const msg = el('p', 'friends__err');
    const row = el('div', 'row');
    box.append(tabs);
    const again = () => this.openFriends(s, tab);
    const fail = (e: unknown) => { msg.textContent = (e as Error).message; };
    const held = () => { const sl = s.inventory[this.selected]; return sl && ITEMS[sl.item].sell > 0 && ITEMS[sl.item].kind !== 'tool' ? sl : null; };
    const itemLabel = (item: ItemId, q = 0) => `${ITEMS[item]?.name ?? item}${q ? ` (${QUALITY_NAME[q].toLowerCase()})` : ''}`;
    const load = async <T,>(get: () => Promise<T>, show: (v: T) => void) => {
      try { const v = await get(); list.replaceChildren(); show(v); } catch (e) { list.replaceChildren(el('p', 'friends__err', (e as Error).message)); }
    };

    if (tab === 'friends') {
      const addRow = el('div', 'row');
      const code = el('input', 'field') as HTMLInputElement;
      code.placeholder = 'Nhập mã bạn bè (6 ký tự)';
      code.maxLength = 6;
      const add = el('button', 'btn', 'Kết bạn');
      add.addEventListener('click', async () => {
        try {
          const f = await net.addFriend(code.value.trim());
          this.openFriends(s);
          this.toast(`Đã kết bạn với ${f.name}`);
        } catch (e) { fail(e); }
      });
      addRow.append(code, add);
      const out = el('button', 'btn', 'Đổi máy chủ / đăng xuất');
      out.addEventListener('click', () => { if (confirm('Quên mã bạn bè trên máy này? (Mã vẫn còn trên máy chủ)')) { net.saveIdentity(null); this.openFriends(s); } });
      row.append(close, out);
      box.append(addRow, msg, list, row);
      this.open(box);
      await load(net.listFriends, (friends) => {
        if (!friends.length) list.append(el('p', '', 'Chưa có bạn nào. Gửi mã của bạn cho bạn bè nhé!'));
        for (const f of friends) {
          const seen = f.updated ? `cập nhật ${new Date(f.updated).toLocaleString('vi-VN')}` : 'chưa chơi';
          const r = el('div', 'shop__row', `<i class="shop__bag"></i><div><b>${f.name}</b><span>mã ${f.code} · ${seen}${f.helpedToday ? ' · hôm nay đã tưới giúp' : ''}</span></div>`);
          const heart = el('button', 'btn', '♥ Thả tim') as HTMLButtonElement;
          heart.title = 'Mỗi ngày thả tim mỗi nông trại một lần — tim tính vào bảng xếp hạng';
          heart.addEventListener('click', async () => {
            try { const r = await net.likeFarm(f.code); heart.disabled = true; heart.textContent = `♥ ${r.likes}`; sfx('gift'); } catch (e) { fail(e); }
          });
          const b = el('button', 'btn', 'Ghé thăm') as HTMLButtonElement;
          b.disabled = !f.updated;
          b.addEventListener('click', () => { this.close(); this.h.visit(f.code); });
          r.append(heart, b);
          list.append(r);
        }
      });
      return;
    }

    if (tab === 'rank') {
      const cols: [keyof net.Score | 'likes', string][] = [['level', 'Cấp nông trại'], ['beauty', 'Điểm đẹp'], ['likes', 'Tim'], ['earned', 'Tổng tiền bán'], ['deepest', 'Tầng hang sâu'], ['fishKinds', 'Loại cá']];
      const pick = el('div', 'tabs rank__by');
      let by: (typeof cols)[number][0] = 'level';
      let data: net.Rank[] = [];
      const draw = () => {
        list.replaceChildren();
        [...pick.children].forEach((c, i) => c.classList.toggle('tab--on', cols[i][0] === by));
        [...data].sort((a, b) => b[by] - a[by]).forEach((r, i) => {
          const medal = ['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`;
          list.append(el('div', `shop__row${r.me ? ' rank--me' : ''}`, `<b class="rank__pos">${medal}</b><div><b>${r.name}${r.me ? ' (bạn)' : ''}</b><span>cấp ${r.level} · đẹp ${r.beauty} · ♥ ${r.likes} · bán ${r.earned.toLocaleString('vi-VN')} xu · hang tầng ${r.deepest} · ${r.fishKinds} loại cá</span></div><b class="rank__val">${r[by].toLocaleString('vi-VN')}</b>`));
        });
      };
      for (const [k, label] of cols) {
        const b = el('button', 'tab', label);
        b.addEventListener('click', () => { by = k; draw(); });
        pick.append(b);
      }
      row.append(close);
      box.append(el('p', '', 'Bạn và bạn bè. Số liệu cập nhật mỗi lần ngủ dậy.'), pick, msg, list, row);
      this.open(box);
      net.uploadSnapshot(s).catch(() => {});
      await load(net.leaderboard, (v) => { data = v; draw(); });
      return;
    }

    if (tab === 'contest') {
      const ev = activeEvent();
      const cid = ev ? ev.id : `tuan-${weekStart()}`;
      const name = ev ? `Hội thi ${ev.name}` : 'Hội thi tuần này';
      const h = held();
      const enter = el('button', 'btn btn--primary', h ? `Nộp ${itemLabel(h.item, h.q)} · ${net.contestScore(h.item, h.q ?? 0)} điểm` : 'Cầm nông sản / cá muốn dự thi') as HTMLButtonElement;
      enter.disabled = !h;
      enter.addEventListener('click', async () => {
        const sl = held();
        if (!sl) return;
        try {
          const r = await net.enterContest(cid, sl.item, sl.q ?? 0, net.contestScore(sl.item, sl.q ?? 0));
          removeFromSlot(s, this.selected, 1);
          this.render(s, this.selected);
          sfx('coin');
          this.openFriends(s, 'contest');
          this.toast(r.improved ? `Đã nộp — điểm cao nhất của bạn: ${r.best}` : `Đã nộp, nhưng chưa hơn điểm cũ (${r.best})`);
        } catch (e) { fail(e); }
      });
      row.append(enter, close);
      box.append(el('p', '', `<b>${name}</b> — nộp 1 nông sản hoặc cá; điểm = giá bán × chất lượng (bạc ×1,25, vàng ×1,5, kim cương ×2). Mỗi người giữ điểm cao nhất, món nộp sẽ mất.`), msg, list, row);
      this.open(box);
      await load(() => net.contestBoard(cid), (board) => {
        if (!board.length) list.append(el('p', '', 'Chưa ai dự thi. Làm người đầu tiên!'));
        board.forEach((r, i) => list.append(el('div', `shop__row${r.me ? ' rank--me' : ''}`, `<b class="rank__pos">${['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`}</b><i style='${ITEMS[r.item] ? iconStyle(r.item) : ''}'></i><div><b>${r.name}${r.me ? ' (bạn)' : ''}</b><span>${itemLabel(r.item, r.q)}</span></div><b class="rank__val">${r.score}</b>`)));
      });
      return;
    }

    // Chợ giữa bạn bè
    const h = held();
    const sellBox = el('div', 'row market__sell');
    if (h) {
      const qty = el('input', 'field') as HTMLInputElement;
      qty.type = 'number'; qty.min = '1'; qty.max = String(h.qty); qty.value = String(h.qty);
      const price = el('input', 'field') as HTMLInputElement;
      price.type = 'number'; price.min = '1';
      const base = () => Math.max(1, Math.round(net.contestScore(h.item, h.q ?? 0) * Number(qty.value || 1)));
      price.value = String(base());
      qty.addEventListener('input', () => { price.value = String(base()); });
      const post = el('button', 'btn btn--primary', 'Rao bán');
      post.addEventListener('click', async () => {
        const n = Math.min(h.qty, Math.max(1, Math.floor(Number(qty.value))));
        const pr = Math.floor(Number(price.value));
        const slot = s.inventory.indexOf(h);
        if (slot < 0) return;
        try {
          await net.marketPost(h.item, h.q ?? 0, n, pr);
          removeFromSlot(s, slot, n);
          this.render(s, this.selected);
          this.openFriends(s, 'market');
          this.toast(`Đã rao ${n} ${itemLabel(h.item, h.q).toLowerCase()} giá ${pr.toLocaleString('vi-VN')} xu`);
        } catch (e) { fail(e); }
      });
      sellBox.append(el('span', '', `Rao ${itemLabel(h.item, h.q)}: số lượng`), qty, el('span', '', 'giá (xu)'), price, post);
    } else sellBox.append(el('span', '', 'Cầm món muốn bán trên thanh công cụ rồi mở lại để rao.'));
    row.append(close);
    box.append(el('p', '', `Mua bán với bạn bè. Bạn có <b>${s.money.toLocaleString('vi-VN')} xu</b>. Hàng đang rao được giữ ở chợ; bán được thì tiền về khi bạn ngủ dậy.`), sellBox, msg, list, row);
    this.open(box);
    await load(net.marketList, (items) => {
      if (!items.length) list.append(el('p', '', 'Chợ đang trống.'));
      for (const m of items) {
        const r = el('div', 'shop__row', `<i style='${ITEMS[m.item] ? iconStyle(m.item) : ''}'></i><div><b>${m.qty} ${itemLabel(m.item, m.q)}</b><span>${m.mine ? 'hàng của bạn' : m.seller} · ${m.price.toLocaleString('vi-VN')} xu</span></div>`);
        const b = el('button', 'btn', m.mine ? 'Gỡ' : 'Mua') as HTMLButtonElement;
        if (!m.mine && s.money < m.price) { b.disabled = true; b.title = 'Không đủ tiền'; }
        b.addEventListener('click', async () => {
          try {
            if (m.mine) {
              const r = await net.marketCancel(m.id);
              net.receive(s, r.item, r.qty, r.q, 'Chợ bạn bè');
              this.toast('Đã gỡ hàng về túi');
            } else {
              if (s.money < m.price) return this.toast('Không đủ tiền');
              const r = await net.marketBuy(m.id);
              s.money -= r.price;
              net.receive(s, r.item, r.qty, r.q, m.seller);
              sfx('coin');
              this.toast(`Đã mua ${r.qty} ${itemLabel(r.item, r.q).toLowerCase()} của ${m.seller}`);
            }
            this.render(s, this.selected);
            again();
          } catch (e) { fail(e); }
        });
        r.append(b);
        list.append(r);
      }
    });
  }

  /** Khung hướng dẫn góc trái (null = ẩn). */
  tutorial(html: string | null, last: boolean, onSkip: () => void) {
    const k = html ?? '';
    if (k === this.tutKey) return;
    this.tutKey = k;
    this.tut.classList.toggle('show', !!html);
    if (!html) return this.tut.replaceChildren();
    this.tut.innerHTML = `<b>${last ? 'Hoàn thành' : 'Hướng dẫn'}</b><p>${html}</p>`;
    const b = el('button', 'btn', last ? 'Đóng' : 'Bỏ qua hướng dẫn');
    b.addEventListener('click', onSkip);
    this.tut.append(b);
  }

  /** Bảng phím tắt (phím H). */
  openHelp() {
    const rows: [string, string][] = [
      ['WASD / mũi tên', 'đi lại'], ['Space / E / chuột trái', 'dùng món đang cầm lên ô có khung vàng'], ['Shift + dùng', 'cuốc/tưới cả vùng (dụng cụ đã nâng cấp)'],
      ['1–9 / lăn chuột', 'chọn món trên thanh công cụ'], ['F', 'ăn món đang cầm'], ['I', 'túi đồ (bấm 2 ô để đổi chỗ)'], ['K', 'chế tạo'],
      ['R', 'dân làng & tình cảm'], ['B', 'bạn bè'], ['M', 'bản đồ thế giới, đi xe bò'], ['Tab', 'sảnh: nhiệm vụ, nhân vật, hòm thư'], ['C', 'lịch mùa, sinh nhật, lễ hội'], ['H', 'bảng này'], ['Esc', 'cài đặt, âm lượng, cỡ chữ'],
    ];
    const box = el('div', 'panel', `<h2>Phím tắt</h2><table class="help">${rows.map(([k, v]) => `<tr><td><kbd>${k}</kbd></td><td>${v}</td></tr>`).join('')}</table>
      <p>Ruộng rào: trồng trọt · Rương cạnh nhà: bán hàng (tiền về sáng mai) · Mép đông: sang làng · Góc đông bắc: hang đá · Ngủ để qua ngày và lưu game.</p>`);
    const close = el('button', 'btn btn--primary', 'Đóng');
    close.addEventListener('click', () => this.close());
    box.append(close);
    this.open(box);
  }

  /** Cài đặt (phím Esc). */
  openSettings(opts: { onChange: () => void; onTutorial: () => void; onQuit: () => void }) {
    const box = el('div', 'panel settings', '<h2>Cài đặt</h2>');
    const slider = (label: string, get: () => number, set: (v: number) => void) => {
      const row = el('label', 'set__row', `<span>${label}</span>`);
      const input = el('input') as HTMLInputElement;
      input.type = 'range';
      input.min = '0';
      input.max = '100';
      input.value = String(Math.round(get() * 100));
      input.addEventListener('input', () => { set(Number(input.value) / 100); opts.onChange(); });
      row.append(input);
      return row;
    };
    box.append(
      slider('Nhạc', () => settings.music, (v) => (settings.music = v)),
      slider('Tiếng động', () => settings.sfx, (v) => (settings.sfx = v)),
    );
    const sizes = el('div', 'set__row', '<span>Cỡ chữ</span>');
    for (const [v, n] of [[0.85, 'Nhỏ'], [1, 'Vừa'], [1.2, 'To'], [1.4, 'Rất to']] as const) {
      const b = el('button', `tab${settings.uiScale === v ? ' tab--on' : ''}`, n);
      b.addEventListener('click', () => { settings.uiScale = v; opts.onChange(); this.close(); this.openSettings(opts); });
      sizes.append(b);
    }
    box.append(sizes);
    const row = el('div', 'row');
    const tut = el('button', 'btn', 'Xem lại hướng dẫn');
    tut.addEventListener('click', () => { this.close(); opts.onTutorial(); });
    const quit = el('button', 'btn', 'Về màn hình chính');
    quit.addEventListener('click', () => { if (confirm('Về màn hình chính? Game chỉ lưu lúc đi ngủ — việc làm hôm nay sẽ mất.')) opts.onQuit(); });
    const close = el('button', 'btn btn--primary', 'Xong');
    close.addEventListener('click', () => this.close());
    row.append(close, tut, quit);
    box.append(el('p', 'set__note', 'Game tự lưu mỗi khi đi ngủ.'), row);
    this.open(box);
  }

  /** Dải báo đang ở nông trại bạn. */
  visitBanner(text: string | null) {
    this.banner.textContent = text ?? '';
    this.banner.classList.toggle('show', !!text);
  }

  /** Bảng quan hệ (phím R). */
  openRelations(s: FarmState) {
    const box = el('div', 'panel shop', '<h2>Dân làng</h2><p>Nói chuyện mỗi ngày và tặng quà (2 lần/tuần, sinh nhật ×8) để lên tim. Đủ 2/4/6/8 tim có chuyện riêng.</p>');
    const list = el('div', 'shop__list');
    for (const n of NPCS) {
      const st = s.npcs[n.id];
      const love = st?.love ?? 0;
      const hearts = heartsOf(love);
      const gifts = st && st.giftWeek === weekOf(s.day) ? st.giftsThisWeek : 0;
      const talked = st?.talkedDay === s.day;
      const row = el('div', 'shop__row', `<i class="rel__face" style="background-position:-${(n.portrait % 8) * 48}px -${Math.floor(n.portrait / 8) * 48}px"></i><div><b>${n.name} <span class="talk__hearts">${'♥'.repeat(hearts)}<i>${'♥'.repeat(10 - hearts)}</i></span></b><span>${n.role} · sinh nhật ${SEASON_NAME[n.birthday.season]} ${n.birthday.day}</span><span>${talked ? 'đã trò chuyện hôm nay' : 'chưa nói chuyện hôm nay'} · quà tuần này ${gifts}/${GIFTS_PER_WEEK} · ${love % LOVE_PER_HEART}/${LOVE_PER_HEART} tới tim sau</span></div>`);
      list.append(row);
    }
    const close = el('button', 'btn btn--primary', 'Đóng');
    close.addEventListener('click', () => this.close());
    box.append(list, close);
    this.open(box);
  }

  weather(w: Weather) {
    this.weatherEl.className = `hud-weather w-${w}`;
  }

  lightning() {
    this.flash.classList.remove('go');
    void this.flash.offsetWidth;
    this.flash.classList.add('go');
  }

  openCalendar(s: FarmState) {
    const season = seasonOf(s.day);
    const start = s.day - dayOfSeason(s.day) + 1;
    const cells = Array.from({ length: SEASON_DAYS }, (_, i) => {
      const d = start + i;
      const w = d === s.day ? s.weather : d === s.day + 1 ? s.tomorrow : d > s.day ? null : weatherFor(d);
      const cls = d === s.day ? 'today' : d < s.day ? 'past' : '';
      const bday = NPCS.filter((n) => n.birthday.season === season && n.birthday.day === i + 1).map((n) => `<em>🎂 ${n.name}</em>`).join('');
      return `<div class="cal__day ${cls}"><b>${i + 1}</b>${bday}${w && d >= s.day ? `<span>${WEATHER_NAME[w]}</span>` : ''}</div>`;
    }).join('');
    const box = el('div', 'panel cal', `<h2>Mùa ${SEASON_NAME[season]} · Năm ${yearOf(s.day)}</h2><div class="cal__grid">${cells}</div><p>Hôm nay: ${WEATHER_NAME[s.weather]} · Mai: ${WEATHER_NAME[s.tomorrow]}</p>`);
    const close = el('button', 'btn btn--primary', 'Đóng');
    close.addEventListener('click', () => this.close());
    box.append(close);
    this.open(box);
  }

  fadeOut(done: () => void) {
    this.fade.classList.add('show');
    window.setTimeout(done, 900);
  }

  fadeIn(msg: string) {
    this.fade.innerHTML = `<span style="white-space: pre-line">${msg}</span>`;
    window.setTimeout(() => {
      this.fade.classList.remove('show');
      window.setTimeout(() => (this.fade.innerHTML = ''), 800);
    }, 1400);
  }
}
