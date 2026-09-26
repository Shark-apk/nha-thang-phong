// Âm thanh tự tổng hợp bằng WebAudio: không cần file, không vướng bản quyền.
// sfx(tên) cho tiếng động; music.play(mùa) cho nhạc nền chơi vòng, mỗi mùa một điệu (thang ngũ cung).
import type { Season } from '../data';
import { settings } from '../ui/settings';

let ctx: AudioContext | null = null;
let sfxBus: GainNode;
let musicBus: GainNode;
let noiseBuf: AudioBuffer;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    sfxBus = ctx.createGain();
    musicBus = ctx.createGain();
    sfxBus.connect(ctx.destination);
    musicBus.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    applyVolume();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function applyVolume() {
  if (!ctx) return;
  sfxBus.gain.value = settings.sfx * 0.6;
  musicBus.gain.value = settings.music * 0.22;
}

// Trình duyệt chỉ cho phát tiếng sau khi người chơi bấm/gõ phím lần đầu
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => { audio(); music.resume(); }, { once: false, passive: true });

function tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; at?: number; slide?: number; bus?: GainNode; attack?: number } = {}) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + (opts.at ?? 0);
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = opts.type ?? 'square';
  o.frequency.setValueAtTime(freq, t);
  if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * opts.slide), t + dur);
  const v = opts.vol ?? 0.3;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + (opts.attack ?? 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(opts.bus ?? sfxBus);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur: number, opts: { freq?: number; q?: number; vol?: number; at?: number; type?: BiquadFilterType; sweep?: number } = {}) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime + (opts.at ?? 0);
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = opts.type ?? 'bandpass';
  f.frequency.setValueAtTime(opts.freq ?? 800, t);
  if (opts.sweep) f.frequency.exponentialRampToValueAtTime(opts.sweep, t + dur);
  f.Q.value = opts.q ?? 1;
  const g = c.createGain();
  g.gain.setValueAtTime(opts.vol ?? 0.4, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(sfxBus);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}

export type Sfx = 'hoe' | 'water' | 'axe' | 'pick' | 'pop' | 'coin' | 'click' | 'eat' | 'splash' | 'catch' | 'fail' | 'cluck' | 'moo' | 'door' | 'build' | 'gift' | 'night' | 'swing' | 'hurt' | 'slay';

const SFX: Record<Sfx, () => void> = {
  hoe: () => { noise(0.12, { freq: 300, q: 0.8, vol: 0.5 }); tone(90, 0.1, { type: 'triangle', vol: 0.3, slide: 0.6 }); },
  water: () => noise(0.45, { freq: 2400, q: 0.6, vol: 0.18, sweep: 900, type: 'lowpass' }),
  axe: () => { noise(0.08, { freq: 900, q: 2, vol: 0.5 }); tone(140, 0.12, { type: 'triangle', vol: 0.35, slide: 0.5 }); },
  pick: () => { tone(1400, 0.07, { type: 'square', vol: 0.12 }); noise(0.06, { freq: 3000, q: 3, vol: 0.3 }); },
  pop: () => { tone(520, 0.08, { type: 'square', vol: 0.12, slide: 1.8 }); },
  coin: () => { tone(988, 0.08, { type: 'square', vol: 0.1 }); tone(1319, 0.2, { type: 'square', vol: 0.1, at: 0.08 }); },
  click: () => tone(660, 0.04, { type: 'triangle', vol: 0.12 }),
  eat: () => { for (let i = 0; i < 3; i++) noise(0.05, { freq: 1200, q: 4, vol: 0.25, at: i * 0.09 }); },
  splash: () => noise(0.35, { freq: 1500, q: 0.5, vol: 0.3, sweep: 400 }),
  catch: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, { type: 'square', vol: 0.1, at: i * 0.07 })),
  fail: () => tone(300, 0.35, { type: 'triangle', vol: 0.25, slide: 0.5 }),
  cluck: () => { tone(900, 0.05, { type: 'square', vol: 0.08, slide: 0.7 }); tone(760, 0.06, { type: 'square', vol: 0.08, at: 0.08, slide: 0.7 }); },
  moo: () => tone(140, 0.7, { type: 'sawtooth', vol: 0.12, slide: 0.8, attack: 0.15 }),
  door: () => { noise(0.1, { freq: 500, q: 1, vol: 0.3 }); tone(200, 0.1, { type: 'triangle', vol: 0.2, at: 0.05 }); },
  build: () => [0, 0.12, 0.24].forEach((at) => noise(0.07, { freq: 700, q: 2, vol: 0.4, at })),
  gift: () => [784, 988, 1175].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.15, at: i * 0.09 })),
  swing: () => noise(0.12, { freq: 1800, q: 1, vol: 0.3, sweep: 600 }),
  hurt: () => { tone(220, 0.18, { type: 'square', vol: 0.15, slide: 0.5 }); noise(0.1, { freq: 400, q: 1, vol: 0.3 }); },
  slay: () => [660, 440, 330].forEach((f, i) => tone(f, 0.1, { type: 'square', vol: 0.1, at: i * 0.06 })),
  night: () => [523, 392, 330, 262].forEach((f, i) => tone(f, 0.5, { type: 'triangle', vol: 0.12, at: i * 0.22 })),
};

export function sfx(name: Sfx) {
  if (settings.sfx <= 0) return;
  try { SFX[name](); } catch { /* không có âm thanh thì thôi */ }
}

// ---------------------------------------------------------------- nhạc nền

/** Mỗi mùa một thang âm, nhịp và âm sắc. */
const SONGS: Record<Season, { scale: number[]; bpm: number; lead: OscillatorType; root: number }> = {
  spring: { scale: [0, 2, 4, 7, 9], bpm: 96, lead: 'triangle', root: 392 },   // ngũ cung trưởng, tươi
  summer: { scale: [0, 2, 4, 7, 9], bpm: 112, lead: 'square', root: 440 },
  fall: { scale: [0, 3, 5, 7, 10], bpm: 84, lead: 'triangle', root: 349 },    // ngũ cung thứ, buồn nhẹ
  winter: { scale: [0, 2, 5, 7, 9], bpm: 70, lead: 'sine', root: 330 },
};

class Music {
  private season: Season | null = null;
  private timer = 0;
  private step = 0;
  private seed = 1;
  private phrase: number[] = [];
  private night = false;

  play(season: Season, night = false) {
    this.night = night;
    if (this.season === season && this.timer) return;
    this.stop();
    this.season = season;
    this.seed = season.length * 7 + 3;
    this.phrase = this.makePhrase();
    this.resume();
  }

  resume() {
    if (!this.season || this.timer || settings.music <= 0 || !ctx) return;
    const beat = 60 / SONGS[this.season].bpm / 2;
    this.timer = window.setInterval(() => this.tick(), beat * 1000);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = 0;
  }

  setNight(n: boolean) {
    this.night = n;
  }

  private rand() {
    this.seed = (this.seed * 16807) % 2147483647;
    return this.seed / 2147483647;
  }

  /** Câu nhạc 16 nốt đi từng bước trong thang âm, lặp lại có biến tấu. */
  private makePhrase() {
    const out: number[] = [];
    let n = 5;
    for (let i = 0; i < 16; i++) {
      n = Math.max(0, Math.min(9, n + Math.round((this.rand() - 0.5) * 3)));
      out.push(this.rand() < 0.22 ? -1 : n);
    }
    return out;
  }

  private tick() {
    if (!this.season || !ctx || settings.music <= 0) return;
    const song = SONGS[this.season];
    const i = this.step++ % 32;
    if (i === 0 && this.step > 32 && this.rand() < 0.5) this.phrase = this.makePhrase();
    const note = (deg: number, oct = 0) => song.root * 2 ** ((song.scale[deg % 5] + 12 * (Math.floor(deg / 5) + oct)) / 12);
    const beat = 60 / song.bpm / 2;
    const quiet = this.night ? 0.5 : 1;
    const n = this.phrase[i % 16];
    if (n >= 0 && (i % 2 === 0 || this.rand() < 0.35)) tone(note(n), beat * 1.6, { type: song.lead, vol: 0.18 * quiet, bus: musicBus, attack: 0.02 });
    // bè trầm mỗi nhịp
    if (i % 4 === 0) tone(note([0, 3, 4, 2][(i / 8) % 4 | 0], -2), beat * 3.5, { type: 'triangle', vol: 0.22 * quiet, bus: musicBus, attack: 0.03 });
  }
}
export const music = new Music();
