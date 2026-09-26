// Kênh sự kiện chung: luật game báo "vừa làm gì", các hệ thống khác (kinh nghiệm, nhiệm vụ, thành tích) nghe và cộng.
// Không có ai nghe thì emit không làm gì — test luật không bị ảnh hưởng.

export type GameEvent =
  | 'till' | 'water' | 'plant' | 'harvest' | 'sell' | 'fish' | 'cook' | 'craft' | 'chop' | 'mine'
  | 'talk' | 'gift' | 'collect' | 'order' | 'donate' | 'help' | 'sleep' | 'build' | 'buyAnimal'
  | 'forage' | 'dive' | 'slay' | 'deep';

export type Listener = (e: GameEvent, n: number, detail?: string) => void;

const listeners = new Set<Listener>();

export function on(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function emit(e: GameEvent, n = 1, detail?: string) {
  for (const l of listeners) l(e, n, detail);
}
