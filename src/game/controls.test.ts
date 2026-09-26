import { describe, expect, it } from 'vitest';
import { actionOf, bindKey, keyOf, resetKeys } from './controls';

const key = (code: string, k = '') => ({ code, key: k }) as KeyboardEvent;

describe('đổi phím', () => {
  it('phím mặc định; E luôn là Dùng', () => {
    resetKeys();
    expect(actionOf(key('Space'))).toBe('use');
    expect(actionOf(key('KeyE'))).toBe('use');
    expect(actionOf(key('KeyI'))).toBe('inventory');
    expect(actionOf(key('Tab'))).toBe('lobby');
    expect(actionOf(key('KeyZ'))).toBeNull();
  });

  it('gán phím đang của việc khác thì hai việc đổi phím cho nhau; Tab, Esc, số 1–9 không gán được', () => {
    resetKeys();
    expect(bindKey('inventory', 'KeyK')).toBe(true);
    expect(keyOf('inventory')).toBe('KeyK');
    expect(keyOf('craft')).toBe('KeyI');
    expect(actionOf(key('KeyK'))).toBe('inventory');
    expect(bindKey('eat', 'Tab')).toBe(false);
    expect(bindKey('eat', 'Digit3')).toBe(false);
    expect(bindKey('lobby', 'KeyQ')).toBe(false);
    bindKey('eat', 'KeyE');
    expect(actionOf(key('KeyE'))).toBe('eat'); // E đã gán cho Ăn thì không còn là Dùng
    resetKeys();
    expect(keyOf('inventory')).toBe('KeyI');
  });
});
