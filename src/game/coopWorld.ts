// Co-op: tách trạng thái thành "đất" (của chủ phòng, đồng bộ cho cả nhóm) và "người" (túi đồ, tiền, sức, kỹ năng… của từng người).
// Đồng bộ bằng cách so khác biệt: mỗi máy định kỳ so phần đất với lần trước và gửi những ô đã đổi.
import type { FarmState } from './farm';

/** Phần đất dạng bảng (khóa ô → giá trị): chỉ gửi những ô đổi. */
export const WORLD_RECORDS = ['tilled', 'crops', 'trees', 'objects', 'beehives', 'cleared', 'giants', 'storage', 'buildings', 'bundles'] as const;
/** Phần đất gửi nguyên cả khối khi đổi. */
export const WORLD_WHOLE = ['animals', 'mine', 'forage', 'greenhouseDay', 'map', 'farmName', 'reefTrash'] as const;
/** Đồng hồ: theo chủ phòng. */
export const CLOCK = ['day', 'minutes', 'weather', 'tomorrow'] as const;
/** Khách vào phòng thì cất những phần này của nông trại mình lại, rời phòng / lưu game thì lấy ra. */
const HOME_KEYS = [...WORLD_RECORDS, ...WORLD_WHOLE, ...CLOCK, 'location', 'player'] as const;

type Rec = Record<string, unknown>;
export interface WorldPatch { r?: Record<string, Record<string, unknown | null>>; w?: Record<string, unknown> }
export type WorldSnap = Rec;

const rec = (s: FarmState, k: string) => ((s as unknown as Rec)[k] ?? {}) as Rec;
const clone = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

/** Toàn bộ phần đất + đồng hồ (gửi cho khách mới vào, hoặc qua đêm). */
export function worldOf(s: FarmState): WorldSnap {
  const out: Rec = {};
  for (const k of [...WORLD_RECORDS, ...WORLD_WHOLE, ...CLOCK]) out[k] = clone((s as unknown as Rec)[k]);
  return out;
}

export const clockOf = (s: FarmState) => ({ day: s.day, minutes: s.minutes, weather: s.weather, tomorrow: s.tomorrow });

/** Trạng thái khách dùng khi ở phòng: người của mình + đất và đồng hồ của chủ phòng. */
export function compose(own: FarmState, world: WorldSnap): FarmState {
  return { ...own, ...clone(world) } as FarmState;
}

/** Cất phần nông trại của khách (để lưu game / rời phòng không lẫn đất của chủ phòng). */
export function homeBackup(own: FarmState): Rec {
  const out: Rec = {};
  for (const k of HOME_KEYS) out[k] = clone((own as unknown as Rec)[k]);
  return out;
}

/** Bản lưu của khách: người hiện tại + nông trại của khách đã cất. */
export const withHome = (s: FarmState, home: Rec): FarmState => ({ ...s, ...clone(home) } as FarmState);

export function applyPatch(s: FarmState, p: WorldPatch) {
  const st = s as unknown as Rec;
  for (const [k, changes] of Object.entries(p.r ?? {})) {
    if (!(WORLD_RECORDS as readonly string[]).includes(k)) continue;
    const r = (st[k] ??= {}) as Rec;
    for (const [sub, v] of Object.entries(changes)) {
      if (v === null) delete r[sub];
      else r[sub] = clone(v);
    }
  }
  for (const [k, v] of Object.entries(p.w ?? {})) if ((WORLD_WHOLE as readonly string[]).includes(k)) st[k] = clone(v);
}

export function applyWorld(s: FarmState, w: WorldSnap) {
  const st = s as unknown as Rec;
  for (const k of [...WORLD_RECORDS, ...WORLD_WHOLE, ...CLOCK]) if (k in w) st[k] = clone(w[k]);
}

/** Nhớ phần đất đã gửi / đã nhận để lần sau chỉ gửi phần đổi. */
export class WorldTracker {
  private recs = new Map<string, Map<string, string>>();
  private whole = new Map<string, string>();

  constructor(s: FarmState) {
    this.reset(s);
  }

  reset(s: FarmState) {
    this.recs.clear();
    this.whole.clear();
    for (const k of WORLD_RECORDS) this.recs.set(k, new Map(Object.entries(rec(s, k)).map(([sub, v]) => [sub, JSON.stringify(v)])));
    for (const k of WORLD_WHOLE) this.whole.set(k, JSON.stringify((s as unknown as Rec)[k] ?? null));
  }

  /** Những gì đã đổi kể từ lần trước (null = không đổi). */
  poll(s: FarmState): WorldPatch | null {
    const p: WorldPatch = {};
    for (const k of WORLD_RECORDS) {
      const seen = this.recs.get(k)!;
      const cur = rec(s, k);
      const ch: Record<string, unknown | null> = {};
      for (const [sub, v] of Object.entries(cur)) {
        const j = JSON.stringify(v);
        if (seen.get(sub) !== j) { ch[sub] = v; seen.set(sub, j); }
      }
      for (const sub of [...seen.keys()]) if (!(sub in cur)) { ch[sub] = null; seen.delete(sub); }
      if (Object.keys(ch).length) (p.r ??= {})[k] = clone(ch);
    }
    for (const k of WORLD_WHOLE) {
      const j = JSON.stringify((s as unknown as Rec)[k] ?? null);
      if (this.whole.get(k) !== j) { (p.w ??= {})[k] = JSON.parse(j); this.whole.set(k, j); }
    }
    return p.r || p.w ? p : null;
  }

  /** Vừa nhận `p` từ người khác (đã áp vào trạng thái): ghi nhận đúng những ô đó để không gửi ngược lại — ô mình vừa đổi mà chưa gửi vẫn được gửi. */
  absorb(p: WorldPatch) {
    for (const [k, changes] of Object.entries(p.r ?? {})) {
      const seen = this.recs.get(k);
      if (!seen) continue;
      for (const [sub, v] of Object.entries(changes)) {
        if (v === null) seen.delete(sub);
        else seen.set(sub, JSON.stringify(v));
      }
    }
    for (const [k, v] of Object.entries(p.w ?? {})) if (this.whole.has(k)) this.whole.set(k, JSON.stringify(v ?? null));
  }
}
