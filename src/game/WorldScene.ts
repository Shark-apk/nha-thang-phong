import Phaser from 'phaser';
import { advanceClock, buy, eat, seasonOf, sleep, WEATHER_NAME, type FarmState, type LocationId, type NightReport } from './farm';
import { SEASON_NAME } from '../data';
import { ITEMS, type ItemId } from '../data';
import { PlayerController, type Dir, type Tile } from './player';
import { saveGame } from './save';
import { ensureIdentity, pushCloud } from '../net/cloud';
import { build, buyAnimal } from './animals';
import { craft, swapSlots, upgradeBackpack, upgradeTool } from './resources';
import { bauCua, buildKitchen, cast, cook, deliverOrder, donate, festivalToday, landFish } from './activities';
import { isBirthday } from './villagers';
import { NPCS } from '../data';
import type { Water } from '../data';
import { TIER_NAME } from '../data';
import { BUILDINGS, ANIMALS } from '../data';
import { TILE } from './world';
import type { Hud } from '../ui/hud';
import * as net from '../net/friends';
import { applyVolume, music, sfx, type Surface } from '../audio/sound';
import { buyDecor, buyPiece, rideCart, sellNow } from './town';
import { pieceName, REGIONS, type RegionId } from '../data';
import { emit } from './bus';
import { session, touchProfile } from './session';
import { today } from './profile';
import { endedContests } from './events';
import { chooseProfession, pendingChoices, SKILL_NAME } from './skills';
import { PETS } from '../data';
import { saveSettings, settings } from '../ui/settings';
import { advanceTutorial, isLastStep, tutorialText } from './tutorial';
import { actionOf, pollPad, type Action } from './controls';
import { afterGuestNight, afterHostNight, coopSleep, inCoop, isGuest, others, sendPos } from '../net/coop';
import { applyWorld, type WorldSnap } from './coopWorld';
import { buildSheet } from '../ui/avatar';
import type { Look } from '../data';

/** 10 phút trong game trôi qua sau bấy nhiêu mili giây thật: 5 giây ở mức mặc định (≈ 11 phút/ngày), chậm hơn nếu người chơi chọn. */
const msPer10Min = () => 5000 * ((settings.dayMinutes || 11) / 11);
/** Tự lưu mỗi 2 phút thật (và mỗi lần chuyển cảnh, khi ẩn tab). */
const AUTOSAVE_MS = 120_000;

export interface SceneData {
  state: FarmState;
  hud: Hud;
  /** Điểm xuất hiện đặt tên trong bản đồ (vd. 'door', 'bed'); không có thì dùng state.player. */
  spawn?: string;
  /** Thông báo hiện khi vào cảnh (vd. sau khi ngủ dậy). */
  message?: string;
  /** Đang ghé nông trại bạn: `home` là trạng thái nông trại của mình. */
  visit?: { code: string; name: string; home: FarmState; helped: boolean };
  /** Hang sâu: tầng muốn xuống (0 = hang đá trên). */
  floor?: number;
}

/** Sau khi ngủ / lúc mở game: gửi ảnh chụp nông trại, nhận thư tưới giúp & quà. */
export async function syncFriends(s: FarmState, hud: Hud, onChange?: () => void) {
  await ensureIdentity(s);
  if (!net.loadIdentity()) return;
  void pushCloud(s).then((r) => { if (r === 'conflict') hud.toast('Máy khác vừa lưu bản mới hơn lên mây — lần mở game sau sẽ hỏi giữ bản nào'); });
  try {
    const lines = net.applyInbox(s, await net.fetchInbox());
    if (lines.length) {
      saveGame(s);
      onChange?.();
      window.setTimeout(() => hud.toast(lines.join(' · ')), 2600);
    }
    await net.uploadSnapshot(s);
    const won = await net.claimContestRewards(session.profile, endedContests());
    if (won.length) { touchProfile(true); window.setTimeout(() => hud.toast(won.join(' · ')), 5200); }
  } catch {
    /* không có mạng thì thôi, lần sau thử lại */
  }
}

/**
 * Phần chung của mọi bản đồ: đồng hồ, HUD, nhân vật, phím tắt, ăn, mua, ngủ, chuyển bản đồ.
 * Mỗi bản đồ chỉ cần dựng hình (`buildMap`) và xử lý tương tác riêng (`interact`).
 */
export abstract class WorldScene extends Phaser.Scene {
  protected state!: FarmState;
  protected hud!: Hud;
  protected ctrl!: PlayerController;
  protected selected = 0;
  protected paused = false;
  private clockAcc = 0;
  private autosaveAcc = 0;
  private miniAcc = 1e9;
  private spawn?: string;
  protected message?: string;
  /** Đang ở nông trại bạn (chỉ tưới giúp, để quà). */
  protected visit?: SceneData['visit'];
  protected helpedTiles = new Set<string>();
  private pet?: Phaser.GameObjects.Sprite;
  private tutTick = 1e9;

  abstract readonly location: LocationId;
  /** Ngoài trời: có mưa/tuyết/lá bay. */
  protected outdoor = false;
  private weatherFx?: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Vùng ô đi vào là sang bản đồ khác (mép bản đồ). */
  protected exits: { x: number; y: number; w: number; h: number; to: LocationId; spawn: string }[] = [];
  private flashTimer?: Phaser.Time.TimerEvent;

  init(data: SceneData) {
    this.state = data.state;
    this.hud = data.hud;
    this.spawn = data.spawn;
    this.message = data.message;
    this.visit = data.visit;
    this.helpedTiles = new Set();
    this.selected = data.hud.selected;
    this.paused = false;
    this.clockAcc = 0;
    this.weatherFx = undefined;
    this.flashTimer = undefined;
    this.exits = [];
    this.remoteSprites = new Map();
    this.lastPos = '';
    this.coopWaiting = false;
  }

  /** Mặt đất cho tiếng bước chân: trong nhà sàn gỗ, hang đá, biển cát, mùa đông tuyết. */
  protected surface(): Surface {
    if (['house', 'coop', 'barn', 'shed', 'greenhouse'].includes(this.location)) return 'wood';
    if (this.location === 'mine') return 'stone';
    if (this.location === 'sea') return 'sand';
    return seasonOf(this.state.day) === 'winter' && this.location !== 'sky' ? 'snow' : 'grass';
  }

  /** Dựng bản đồ; trả về lưới ô bị chặn và các điểm xuất hiện đặt tên (pixel). */
  protected abstract buildMap(): { blocked: boolean[][]; spawns: Record<string, { x: number; y: number; dir?: Dir }> };
  /** Xử lý bấm vào ô `t`. */
  protected abstract interact(t: Tile): void;
  /** Vẽ lại phần phụ thuộc trạng thái (đất, cây…) sau khi qua đêm hoặc khi debug sửa trạng thái. */
  refresh() {}

  create() {
    this.state.location = this.location;
    const { blocked, spawns } = this.buildMap();
    const sp = this.spawn ? spawns[this.spawn] : undefined;
    const start = sp ?? this.state.player;
    this.ctrl = new PlayerController(this, start.x, start.y, blocked, (t) => this.tryInteract(t));
    this.ctrl.surface = this.surface();
    if (sp?.dir) this.ctrl.place(sp.x, sp.y, sp.dir);
    this.state.player = { x: start.x, y: start.y };

    const w = blocked[0].length * TILE;
    const h = blocked.length * TILE;
    const cam = this.cameras.main;
    cam.setRoundPixels(true);
    const fit = () => {
      // Phaser đổi cỡ ngay lúc máy báo xoay, khi trình duyệt chưa đổi khung xong → canvas kẹt ở cỡ cũ (màn dọc trong khi máy đã ngang).
      // Khung cha đã khác cỡ canvas thì đo lại ở khung hình sau.
      const ps = this.scale.parentSize;
      if (ps.width > 0 && ps.height > 0 && (Math.abs(ps.width - this.scale.width) > 1 || Math.abs(ps.height - this.scale.height) > 1)) {
        requestAnimationFrame(() => this.scale.refresh());
      }
      cam.setZoom(Math.max(2, Math.round(Math.min(this.scale.width / 420, this.scale.height / 270))));
      // Bản đồ nhỏ hơn màn hình (trong nhà): đặt giữa màn hình thay vì bám theo nhân vật
      const small = w * cam.zoom <= this.scale.width && h * cam.zoom <= this.scale.height;
      if (small) {
        cam.removeBounds();
        cam.stopFollow();
        cam.centerOn(w / 2, h / 2);
      } else {
        cam.setBounds(0, 0, w, h);
        cam.startFollow(this.ctrl.sprite, true, 0.15, 0.15);
      }
    };
    fit();
    this.scale.on('resize', fit);
    this.events.once('shutdown', () => this.scale.off('resize', fit));

    const kb = this.input.keyboard!;
    kb.on('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Tab') e.preventDefault();
      if (this.paused) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 9 && /^Digit|^Numpad/.test(e.code || 'Digit')) return this.select(n - 1);
      const a = actionOf(e);
      if (a) { if (a === 'use') e.preventDefault(); this.doAction(a); }
    });
    // Nút cảm ứng, tay cầm gửi hành động qua sự kiện chung
    const onAction = (e: Event) => { if (!this.paused) this.doAction((e as CustomEvent<Action>).detail); };
    window.addEventListener('game:action', onAction);
    this.events.once('shutdown', () => window.removeEventListener('game:action', onAction));
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      if (!this.paused) this.select((this.selected + (dy > 0 ? 1 : 8)) % 9);
    });

    this.hud.bind({
      select: (i) => this.select(i),
      buy: (item, qty) => this.buy(item, qty),
      build: (b) => {
        const r = build(this.state, b);
        if (r.ok) sfx('build');
        this.hud.toast(r.ok ? `Đã đặt xây ${BUILDINGS[b].name.toLowerCase()} — sáng mai xong` : r.reason);
        this.renderHud();
        return r.ok;
      },
      buyAnimal: (kind) => {
        const r = buyAnimal(this.state, kind);
        this.hud.toast(r.ok ? `Đã mua 1 ${ANIMALS[kind].name.toLowerCase()} — đang ở ${BUILDINGS[ANIMALS[kind].home].name.toLowerCase()}` : r.reason);
        this.renderHud();
        return r.ok;
      },
      sleep: () => this.goToSleep(false),
      setPaused: (p) => {
        this.paused = p;
        // Đang mở bảng (có ô nhập chữ): không để Phaser nuốt phím cách, mũi tên…
        this.input.keyboard!.manager.enabled = !p;
      },
      craft: (id) => {
        const r = craft(this.state, id);
        if (r.ok) sfx('build');
        this.hud.toast(r.ok ? `Đã làm 1 ${ITEMS[id].name.toLowerCase()}` : r.reason);
        this.renderHud();
        return r.ok;
      },
      upgradeTool: (t) => {
        const r = upgradeTool(this.state, t);
        this.hud.toast(r.ok ? `Đã gửi ${ITEMS[t].name.toLowerCase()} cho thợ rèn — 2 ngày nữa xong` : r.reason);
        this.renderHud();
        return r.ok;
      },
      upgradeBackpack: () => {
        const r = upgradeBackpack(this.state);
        this.hud.toast(r.ok ? `Túi đồ giờ có ${r.qty} ô — bấm I để xem` : r.reason);
        this.renderHud();
        return r.ok;
      },
      swap: (a, b) => {
        swapSlots(this.state, a, b);
        this.renderHud();
      },
      cook: (id) => this.report(cook(this.state, id), `Nấu xong ${ITEMS[id].name.toLowerCase()}`),
      deliver: (i) => this.report(deliverOrder(this.state, i), 'Đã giao đơn hàng — nhận tiền thưởng'),
      donate: (b, item) => {
        const r = donate(this.state, b, item);
        this.hud.toast(r.ok ? (r.completed ? 'Đủ bộ rồi! Đình làng gửi quà cảm ơn' : `Đã góp ${r.qty} ${ITEMS[item].name.toLowerCase()}`) : r.reason);
        this.renderHud();
        return r.ok;
      },
      bauCua: (pick, bet) => {
        const r = bauCua(this.state, pick, bet);
        this.renderHud();
        if (!r.ok) { this.hud.toast(r.reason); return null; }
        return r;
      },
      buildKitchen: () => this.report(buildKitchen(this.state), 'Nhà đã có bếp — vào nhà, bấm vào bếp để nấu'),
      visit: (code) => this.visitFriend(code),
      buyPiece: (id) => { const r = buyPiece(session.profile, this.state, id); if (r.ok) { touchProfile(true); sfx('coin'); } return this.report(r, `Đã mua ${pieceName(id).toLowerCase()} — mặc ở trang nhân vật`); },
      buyDecor: (id) => { const r = buyDecor(this.state, id); if (r.ok) sfx('coin'); return this.report(r, `Đã mua ${ITEMS[id].name.toLowerCase()} — đặt trên cỏ ở nông trại`); },
      sellNow: (slot) => {
        const r = sellNow(this.state, slot);
        if (r.ok) { sfx('coin'); emit('sell', r.qty ?? 0); }
        return this.report(r, `Vựa trả ${(r.ok && r.qty || 0).toLocaleString('vi-VN')} xu`);
      },
      travel: (region) => this.rideTo(region),
      afterRegister: () => { net.uploadSnapshot(this.state).catch(() => {}); },
    });
    this.refresh();
    this.renderHud();
    this.hud.visitBanner(this.visit ? `Đang thăm nông trại của ${this.visit.name}` : null);
    this.spawnPet();
    if (this.spawn === 'bed') this.time.delayedCall(2800, () => this.offerProfession());
    music.play(seasonOf(this.state.day), this.state.minutes >= 19 * 60);
    if (this.outdoor) this.startWeather();
    if (this.message) this.hud.toast(this.message);
  }

  // ---------------------------------------------------------------- thời tiết
  private startWeather() {
    if (!this.textures.exists('fx-rain')) {
      const g = this.add.graphics();
      g.fillStyle(0xbfe3ff, 0.9).fillRect(0, 0, 1, 5).generateTexture('fx-rain', 1, 5).clear();
      g.fillStyle(0xffffff, 1).fillRect(0, 0, 2, 2).generateTexture('fx-snow', 2, 2).clear();
      g.fillStyle(0xd9a45a, 1).fillRect(0, 0, 3, 2).generateTexture('fx-leaf', 3, 2).destroy();
    }
    const w = this.state.weather;
    this.hud.weather(w);
    const cfg: Partial<Record<string, Phaser.Types.GameObjects.Particles.ParticleEmitterConfig>> = {
      rain: { speedY: { min: 260, max: 320 }, speedX: -30, lifespan: 1000, frequency: 10, quantity: 2, alpha: 0.7 },
      storm: { speedY: { min: 340, max: 420 }, speedX: -90, lifespan: 900, frequency: 6, quantity: 3, alpha: 0.8 },
      snow: { speedY: { min: 20, max: 45 }, speedX: { min: -15, max: 15 }, lifespan: 7000, frequency: 70, quantity: 1, alpha: 0.9 },
      windy: { speedX: { min: 90, max: 150 }, speedY: { min: 10, max: 40 }, lifespan: 4000, frequency: 250, quantity: 1, rotate: { min: 0, max: 360 } },
    };
    const c = cfg[w];
    if (!c) return;
    const tex = w === 'snow' ? 'fx-snow' : w === 'windy' ? 'fx-leaf' : 'fx-rain';
    // Toạ độ hạt tương đối với emitter; emitter được dời theo góc trên-trái khung nhìn mỗi khung hình
    this.weatherFx = this.add.particles(0, 0, tex, { ...c, x: { min: -120, max: 900 }, y: -10 }).setDepth(9800);
    if (w === 'storm') {
      this.flashTimer = this.time.addEvent({ delay: 7000, loop: true, callback: () => Math.random() < 0.5 && this.hud.lightning() });
    }
  }

  private followWeather() {
    if (!this.weatherFx) return;
    const v = this.cameras.main.worldView;
    this.weatherFx.setPosition(v.x, v.y);
  }

  private report(r: { ok: boolean; reason?: string }, okMsg: string) {
    this.hud.toast(r.ok ? okMsg : (r as { reason: string }).reason);
    this.refresh();
    this.renderHud();
    return r.ok;
  }

  /** Thả câu xuống nước loại `water`, chơi trò kéo cá. */
  protected fish(water: Water) {
    const r = cast(this.state, this.selected, water);
    if (!r.ok) return this.hud.toast(r.reason);
    sfx('splash');
    this.renderHud();
    this.hud.fishing(r.fish, r.bar, (caught, perfect) => {
      sfx(caught ? 'catch' : 'fail');
      if (!caught) return this.hud.toast('Cá sổng mất rồi…');
      const got = landFish(this.state, r.fish, perfect);
      this.hud.toast(got.ok ? `Câu được ${r.fish.name.toLowerCase()}${perfect ? ' (bạc — kéo hoàn hảo!)' : ''}` : got.reason);
      if (got.ok) this.popItem(this.ctrl.facingTile(), r.fish.id);
      this.renderHud();
    });
  }

  private tryInteract(t: Tile) {
    if (this.paused || this.ctrl.busy) return;
    if (this.pet && Math.hypot(this.pet.x / TILE - (t.x + 0.5), this.pet.y / TILE - (t.y + 0.5)) < 1) return this.petPet();
    this.interact(t);
  }

  protected select(i: number) {
    this.selected = i;
    this.hud.selected = i;
    this.renderHud();
  }

  protected renderHud() {
    this.hud.render(this.state, this.selected);
  }

  protected popItem(t: Tile, item: ItemId) {
    sfx('pop');
    const [texKey, frame] = ITEMS[item].icon;
    const img = this.add.image(t.x * TILE + TILE / 2, t.y * TILE + TILE / 2, texKey, frame).setDepth(9500);
    this.tweens.add({ targets: img, y: img.y - 18, alpha: 0, duration: 700, ease: 'Quad.easeOut', onComplete: () => img.destroy() });
  }

  private eatHeld() {
    if (this.ctrl.busy) return;
    const r = eat(this.state, this.selected);
    if (r.ok) {
      this.popItem(this.ctrl.feetTile(), r.item!);
      sfx('eat');
      this.hud.toast(`Ăn ${ITEMS[r.item!].name} — hồi ${r.qty} sức`);
      this.renderHud();
    } else this.hud.toast(r.reason);
  }

  private buy(item: ItemId, qty: number) {
    const r = buy(this.state, item, qty);
    sfx(r.ok ? 'coin' : 'fail');
    this.hud.toast(r.ok ? `Đã mua ${qty} ${ITEMS[item].name}` : r.reason);
    this.renderHud();
    return r.ok;
  }

  /** Chuyển sang bản đồ khác, xuất hiện ở điểm `spawn` của bản đồ đó. */
  travel(to: LocationId, spawn: string, message?: string) {
    if (this.visit) return this.leaveVisit();
    if (this.paused) return;
    this.paused = true;
    this.autosave();
    sfx('door');
    this.cameras.main.fadeOut(220, 18, 12, 22);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(to, { state: this.state, hud: this.hud, spawn, message } satisfies SceneData);
    });
  }

  // ---------------------------------------------------------------- thú cưng
  private spawnPet() {
    this.pet = undefined;
    const kind = session.profile.look.pet;
    if (!this.outdoor || !kind || this.visit) return;
    const row = PETS[kind].row;
    for (const [a, f] of [['idle', [0, 1]], ['walk', [2, 3]]] as const) {
      const key = `pet-${kind}-${a}`;
      if (!this.anims.exists(key)) this.anims.create({ key, frames: this.anims.generateFrameNumbers('pets', { frames: f.map((x) => row * 4 + x) }), frameRate: a === 'idle' ? 2 : 8, repeat: -1 });
    }
    this.pet = this.add.sprite(this.ctrl.sprite.x - 14, this.ctrl.sprite.y + 4, 'pets', row * 4).play(`pet-${kind}-idle`);
  }

  private followPet(dt: number) {
    const pet = this.pet;
    if (!pet) return;
    const pl = this.ctrl.sprite;
    const back: Record<Dir, [number, number]> = { down: [-16, 2], up: [16, 2], left: [16, 2], right: [-16, 2] };
    const [ox, oy] = back[this.ctrl.dir];
    const tx = pl.x + ox, ty = pl.y + oy + 4;
    const dx = tx - pet.x, dy = ty - pet.y;
    const dist = Math.hypot(dx, dy);
    const kind = session.profile.look.pet;
    if (dist > 200) pet.setPosition(tx, ty);
    else if (dist > 6) {
      const step = Math.min(dist, (dist > 40 ? 110 : 70) * (dt / 1000));
      pet.x += (dx / dist) * step;
      pet.y += (dy / dist) * step;
      if (Math.abs(dx) > 1) pet.setFlipX(dx < 0);
      if (pet.anims.currentAnim?.key !== `pet-${kind}-walk`) pet.play(`pet-${kind}-walk`);
    } else if (pet.anims.currentAnim?.key !== `pet-${kind}-idle`) pet.play(`pet-${kind}-idle`);
    pet.setDepth(pet.y + 4);
  }

  private petPet() {
    const p = session.profile;
    const first = p.pet.pettedDay !== today();
    if (first) {
      p.pet.pettedDay = today();
      p.pet.love = Math.min(1000, p.pet.love + 40);
      touchProfile();
    }
    sfx('gift');
    const heart = this.add.text(this.pet!.x, this.pet!.y - 12, '♥', { fontFamily: 'VT323', fontSize: '14px', color: '#d9485a', resolution: 4 }).setOrigin(0.5).setDepth(9500);
    this.tweens.add({ targets: heart, y: heart.y - 16, alpha: 0, duration: 800, onComplete: () => heart.destroy() });
    this.hud.toast(`${first ? 'Vuốt ve' : 'Chơi với'} ${p.pet.name} · ${Math.floor(p.pet.love / 100)}/10 tim`);
  }

  /** Sáng ra: kỹ năng đủ cấp 5/10 mà chưa chọn nghề thì hỏi. */
  private offerProfession() {
    if (this.visit) return;
    const c = pendingChoices(this.state)[0];
    if (!c) return;
    this.hud.choose(`${SKILL_NAME[c.skill]} cấp ${c.tier}!`, 'Chọn một nghề — chọn rồi không đổi lại được:', [
      ...c.options.map((o) => ({ label: `${o.name}: ${o.info}`, primary: false, fn: () => { chooseProfession(this.state, o.id); sfx('catch'); this.hud.toast(`Đã thành ${o.name}!`); } })),
      { label: 'Để sau', fn: () => this.hud.toast('Chọn nghề sau ở trang nhân vật (Tab → bấm nhân vật → Kỹ năng)') },
    ]);
  }

  // ---------------------------------------------------------------- bản đồ thế giới & xe bò
  /** Mở bản đồ thế giới; chỉ đi xe bò được khi đang ở ngoài trời (không phải lúc thăm bạn). */
  protected openWorldMap() {
    const outdoor = ['farm', 'village', 'town', 'forest', 'sea', 'sky'].includes(this.location) && !this.visit;
    this.hud.openWorldMap(this.state, session.profile, this.location, outdoor);
  }

  private rideTo(region: RegionId) {
    const r = rideCart(session.profile, this.state, region);
    if (!r.ok) return this.hud.toast(r.reason);
    const dest = REGIONS.find((x) => x.id === region)!;
    this.renderHud();
    this.travel(dest.scene as LocationId, dest.spawn, `Xe bò tới ${dest.name}${r.qty ? ` · ${r.qty} xu` : ''}`);
  }

  /** Về nhà sau khi thăm bạn: mang theo sức, giờ, nước, tiền; gửi các ô đã tưới giúp. */
  protected leaveVisit() {
    const v = this.visit!;
    const home = v.home;
    home.energy = this.state.energy;
    home.minutes = this.state.minutes;
    home.water = this.state.water;
    home.money = this.state.money;
    const tiles = [...this.helpedTiles];
    if (tiles.length) emit('help', tiles.length);
    this.paused = true;
    this.visit = undefined;
    if (tiles.length) {
      net.waterFarm(v.code, tiles).catch((e) => this.hud.toast(`Chưa gửi được lượt tưới giúp: ${(e as Error).message}`));
    }
    this.cameras.main.fadeOut(220, 18, 12, 22);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('farm', { state: home, hud: this.hud, spawn: 'door', message: tiles.length ? `Về tới nhà — đã tưới giúp ${v.name} ${tiles.length} ô, bạn ấy sẽ thấy khi vào game` : 'Về tới nhà' } satisfies SceneData);
    });
  }

  /** Ghé nông trại bạn: tải ảnh chụp rồi mở nông trại ở chế độ thăm. */
  async visitFriend(code: string) {
    this.hud.toast('Đang sang nhà bạn…');
    try {
      const f = await net.getFarm(code);
      if (!f.snapshot) return this.hud.toast(`${f.name} chưa có nông trại để xem`);
      const state = net.visitState(this.state, f.snapshot);
      const helped = (await net.listFriends()).find((x) => x.code === f.code)?.helpedToday ?? false;
      this.paused = true;
      this.cameras.main.fadeOut(220, 18, 12, 22);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('farm', { state, hud: this.hud, spawn: 'door', visit: { code: f.code, name: f.name, home: this.state, helped }, message: `Nông trại của ${f.name} — tưới giúp hoặc để quà ở hòm thư. Ra cửa nhà để về.` } satisfies SceneData);
      });
    } catch (e) {
      this.hud.toast((e as Error).message);
    }
  }

  /** Qua đêm: luôn thức dậy cạnh giường trong nhà. */
  goToSleep(passedOut: boolean) {
    if (this.visit) return this.leaveVisit();
    // Co-op: khách chờ chủ phòng; chủ chờ cả nhóm lên giường
    if (coopSleep(passedOut)) { this.coopWaiting = true; return; }
    this.paused = true;
    sfx('night');
    this.hud.fadeOut(() => {
      const r = sleep(this.state, passedOut);
      this.state.location = 'house';
      afterHostNight(this.state);
      saveGame(this.state);
      if (!isGuest()) syncFriends(this.state, this.hud);
      this.hud.fadeIn(morningText(this.state, r, passedOut));
      this.scene.start('house', { state: this.state, hud: this.hud, spawn: 'bed', message: morningNote(this.state, r) } satisfies SceneData);
    });
  }

  update(_t: number, dtMs: number) {
    // Tay cầm: B đóng bảng đang mở; còn lại là hành động / đổi món
    for (const p of pollPad()) {
      if (this.paused) { if (p === 'back') window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' })); continue; }
      if (p === 'prev' || p === 'next') this.select((this.selected + (p === 'next' ? 1 : 8)) % 9);
      else if (p !== 'back') this.doAction(p);
    }
    this.ctrl.update(this.paused);
    if (this.paused) return;
    this.clockAcc += dtMs;
    const step = msPer10Min();
    while (this.clockAcc >= step) {
      this.clockAcc -= step;
      if (this.coopWaiting && isGuest()) break; // khách đã lên giường / quá 2h: chờ chủ phòng cho qua đêm
      const passOut = advanceClock(this.state, 10);
      if (this.state.minutes === 17 * 60 && !this.visit) this.remindWater();
      this.renderHud();
      if (passOut) {
        this.goToSleep(true);
        return;
      }
    }
    this.state.player = { x: this.ctrl.sprite.x, y: this.ctrl.sprite.y };
    if (inCoop()) this.coopTick(dtMs);
    this.miniAcc += dtMs;
    if (this.miniAcc > 400) {
      this.miniAcc = 0;
      this.hud.minimap(this.ctrl.walkGrid(), this.ctrl.feetTile(), this.minimapMarks());
    }
    this.autosaveAcc += dtMs;
    if (this.autosaveAcc > AUTOSAVE_MS) this.autosave();
    const f = this.ctrl.feetTile();
    const ex = this.exits.find((e) => f.x >= e.x && f.x < e.x + e.w && f.y >= e.y && f.y < e.y + e.h);
    if (ex) return this.travel(ex.to, ex.spawn);
    this.tutTick += dtMs;
    if (this.tutTick > 500) {
      this.tutTick = 0;
      advanceTutorial(this.state);
      this.hud.tutorial(this.visit ? null : tutorialText(this.state), isLastStep(this.state), () => { this.state.tutorial = -1; this.hud.tutorial(null, false, () => {}); });
    }
    this.followPet(dtMs);
    this.hud.night(this.state.minutes);
    music.setNight(this.state.minutes >= 19 * 60);
    this.followWeather();
  }

  /** 17h: còn cây ngoài đồng chưa tưới thì nhắc (trời mưa thì thôi). */
  private remindWater() {
    const dry = Object.keys(this.state.crops).filter((k) => Number(k.split(',')[0]) < 100 && !this.state.tilled[k]?.watered).length;
    if (dry) this.hud.toast(`17 giờ rồi — còn ${dry} cây chưa tưới`);
  }

  /** Chấm vàng trên bản đồ nhỏ (dân làng…); cảnh nào có thì ghi đè. */
  protected minimapMarks(): { x: number; y: number }[] {
    return [];
  }

  /** Tự lưu giữa ngày (không lưu khi đang ghé nông trại bạn — lúc đó trạng thái là của bạn). */
  protected autosave() {
    this.autosaveAcc = 0;
    if (!this.visit) saveGame(this.state);
  }

  /** Làm một hành động (phím, nút cảm ứng, tay cầm đều qua đây). */
  doAction(a: Action) {
    switch (a) {
      case 'use': return this.tryInteract(this.ctrl.targetTile());
      case 'eat': return this.eatHeld();
      case 'calendar': return this.hud.openCalendar(this.state);
      case 'inventory': return this.hud.openInventory(this.state);
      case 'craft': return this.hud.openCrafting(this.state);
      case 'relations': return this.hud.openRelations(this.state);
      case 'friends': return void this.hud.openFriends(this.state);
      case 'help': return this.hud.openHelp();
      case 'wiki': return this.hud.openWiki(this.state);
      case 'minimap': this.hud.toggleMinimap(); this.miniAcc = 1e9; return;
      case 'map': return this.openWorldMap();
      case 'lobby': return void window.dispatchEvent(new Event('lobby:open'));
      case 'settings': return this.hud.openSettings({
        onChange: () => { saveSettings(); applyVolume(); if (settings.music > 0) music.resume(); else music.stop(); },
        onTutorial: () => { this.state.tutorial = 0; this.tutTick = 1e9; },
        onQuit: () => { this.autosave(); location.reload(); },
      });
    }
  }

  // ---------------------------------------------------------------- co-op

  /** Khóa chỗ đứng để người khác biết mình ở cùng cảnh không (hang sâu thêm số tầng). */
  get locKey(): string {
    return this.location;
  }
  protected coopWaiting = false;
  private coopAcc = 0;
  private lastPos = '';
  private remoteSprites = new Map<string, { spr: Phaser.GameObjects.Sprite; label: Phaser.GameObjects.Text; bubble?: Phaser.GameObjects.Text; tex: string }>();

  /** Gửi vị trí của mình, vẽ người chơi khác cùng cảnh (đi mượt tới chỗ họ). */
  private coopTick(dtMs: number) {
    this.coopAcc += dtMs;
    const v = this.ctrl.sprite.body!.velocity;
    const moving = Math.abs(v.x) + Math.abs(v.y) > 1;
    if (this.coopAcc > 110) {
      this.coopAcc = 0;
      const pos = { x: Math.round(this.ctrl.sprite.x), y: Math.round(this.ctrl.sprite.y), loc: this.locKey, dir: this.ctrl.dir, moving };
      const k = JSON.stringify(pos);
      if (k !== this.lastPos) { this.lastPos = k; sendPos(pos); }
    }
    const here = new Set<string>();
    for (const r of others()) {
      if (r.loc !== this.locKey || !r.x) continue;
      here.add(r.c);
      let o = this.remoteSprites.get(r.c);
      if (!o) {
        const spr = this.add.sprite(r.x, r.y, 'char', 0).setOrigin(0.5, 0.62);
        const label = this.add.text(r.x, r.y - 22, r.n, { fontFamily: 'VT323', fontSize: '8px', color: '#fff', stroke: '#3b2a2e', strokeThickness: 2, resolution: 4 }).setOrigin(0.5).setDepth(9001);
        o = { spr, label, tex: 'char' };
        this.remoteSprites.set(r.c, o);
      }
      if (r.look && o.tex === 'char') this.remoteLook(r.c, r.look, o);
      const k = Math.min(1, dtMs / 90);
      o.spr.x += (r.x - o.spr.x) * k;
      o.spr.y += (r.y - o.spr.y) * k;
      const anim = `${o.tex}-${r.moving ? 'walk' : 'idle'}-${r.dir}`;
      if (this.anims.exists(anim) && o.spr.anims.currentAnim?.key !== anim) o.spr.play(anim);
      o.spr.setDepth(o.spr.y + 7);
      o.label.setPosition(o.spr.x, o.spr.y - 22).setText(r.n);
      const chat = r.chat && r.chat.until > Date.now() ? r.chat.text : '';
      if (chat && !o.bubble) o.bubble = this.add.text(0, 0, '', { fontFamily: 'VT323', fontSize: '11px', color: '#3b2a2e', backgroundColor: '#f4e7c8', padding: { x: 3, y: 1 }, resolution: 4, wordWrap: { width: 120 } }).setOrigin(0.5, 1).setDepth(9002);
      if (o.bubble) { o.bubble.setVisible(!!chat).setText(chat).setPosition(o.spr.x, o.spr.y - 28); }
    }
    for (const [c, o] of this.remoteSprites) if (!here.has(c)) { o.spr.destroy(); o.label.destroy(); o.bubble?.destroy(); this.remoteSprites.delete(c); }
  }

  /** Dựng hình người chơi khác theo ngoại hình của họ (một lần mỗi ngoại hình). */
  private remoteLook(c: string, look: Look, o: { spr: Phaser.GameObjects.Sprite; tex: string }) {
    const key = `remote-${[...JSON.stringify(look)].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7).toString(36)}`;
    o.tex = key;
    const ready = () => {
      if (!this.anims.exists(`${key}-idle-down`)) for (const [d, row] of [['down', 0], ['up', 1], ['left', 2], ['right', 3]] as const) {
        this.anims.create({ key: `${key}-idle-${d}`, frames: this.anims.generateFrameNumbers(key, { frames: [row * 4, row * 4 + 1] }), frameRate: 2, repeat: -1 });
        this.anims.create({ key: `${key}-walk-${d}`, frames: this.anims.generateFrameNumbers(key, { frames: [row * 4 + 2, row * 4 + 3] }), frameRate: 7, repeat: -1 });
      }
      if (o.spr.active) o.spr.setTexture(key, 0);
    };
    if (this.textures.exists(key)) return ready();
    buildSheet(look, 'char').then((cv) => {
      if (!this.textures.exists(key)) {
        const t = this.textures.addCanvas(key, cv)!;
        for (let f = 0; f < 16; f++) t.add(f, 0, (f % 4) * 48, Math.floor(f / 4) * 48, 48, 48);
      }
      if (this.scene.isActive()) ready();
    }).catch(() => {});
  }

  /** Chủ phòng: cả nhóm đã lên giường → qua đêm. */
  coopSleepNow() {
    this.coopWaiting = false;
    this.goToSleep(false);
  }

  /** Khách: chủ phòng vừa cho cả nhóm qua đêm — tính phần của mình (sức, tiền bán hàng…) rồi lấy đất + ngày của chủ. */
  coopNight(w: WorldSnap) {
    this.paused = true;
    this.coopWaiting = false;
    sfx('night');
    this.hud.fadeOut(() => {
      const r = sleep(this.state, false);
      applyWorld(this.state, w);
      afterGuestNight(this.state);
      this.state.location = 'house';
      saveGame(this.state);
      this.hud.fadeIn(morningText(this.state, r, false));
      this.scene.start('house', { state: this.state, hud: this.hud, spawn: 'bed', message: morningNote(this.state, r) } satisfies SceneData);
    });
  }

  /** Đang ghé nông trại bạn (thư bạn bè đợi về nhà mới nhận, kẻo tiền bị ghi đè khi rời đi). */
  get visiting() {
    return !!this.visit;
  }

  // ---------------------------------------------------------------- dành cho bảng debug (F9)
  debugState() {
    return this.state;
  }
  debugRefresh() {
    this.refresh();
    this.renderHud();
  }
}

function morningText(s: FarmState, r: NightReport, passedOut: boolean) {
  const season = SEASON_NAME[seasonOf(s.day)];
  const head = r.newSeason ? `Mùa ${season} đã đến!` : passedOut ? 'Bạn ngất vì thức quá khuya… chỉ còn nửa sức.' : `Ngày mới`;
  const income = r.income ? ` · Thu nhập hôm qua: ${r.income} xu` : '';
  return `${head}\n${season} ngày ${((s.day - 1) % 14) + 1} · ${WEATHER_NAME[s.weather]}${income}`;
}

function morningNote(s: FarmState, r: NightReport) {
  const notes: string[] = [];
  if (r.withered) notes.push(`${r.withered} cây trái mùa đã héo`);
  if (r.struck) notes.push(`Sét đánh trúng 1 cây ${r.struck.toLowerCase()} đêm qua`);
  if (r.crops.pests) notes.push(`${r.crops.pests} cây bị sâu — bấm vào cây để bắt`);
  if (r.crops.giant) notes.push(`Có một trái ${r.crops.giant.toLowerCase()} khổng lồ! Cầm rìu bổ ra`);
  if (r.crops.hybrid) notes.push(`Lai giống thành công: hạt ${r.crops.hybrid.toLowerCase()} (vào túi)`);
  if (r.res.crow) notes.push(`Quạ ăn mất 1 cây ${r.res.crow.toLowerCase()} — làm bù nhìn (K) để đuổi quạ`);
  if (r.res.watered) notes.push(`Vòi tưới đã tưới ${r.res.watered} ô`);
  if (r.res.tool) notes.push(`Thợ rèn gửi trả ${ITEMS[r.res.tool].name.toLowerCase()} ${TIER_NAME[s.tools[r.res.tool]]}`);
  if (s.weather === 'rain' || s.weather === 'storm' || s.weather === 'snow') notes.push(`Trời ${WEATHER_NAME[s.weather].toLowerCase()} — ruộng tự được tưới`);
  const fest = festivalToday(s);
  if (fest) notes.unshift(`Hôm nay có ${fest.name} ở làng, ${Math.floor(fest.hours[0] / 60)}h–${Math.floor(fest.hours[1] / 60)}h`);
  const bday = NPCS.find((n) => isBirthday(s, n));
  if (bday) notes.push(`Sinh nhật ${bday.name} — quà hôm nay được gấp 8`);
  notes.push(`Mai: ${WEATHER_NAME[s.tomorrow].toLowerCase()}`);
  return notes.join(' · ');
}
