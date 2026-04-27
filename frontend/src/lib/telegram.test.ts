import { describe, expect, it } from 'vitest';
import { getTelegramUser } from './telegram';

describe('telegram context', () => {
  it('returns null when Telegram context is unavailable', () => {
    (globalThis as any).window = {};
    expect(getTelegramUser()).toBeNull();
  });
});
