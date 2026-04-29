import { describe, expect, it } from 'vitest';
import { getTelegramUser } from './telegram';

describe('telegram context', () => {
  it('returns null when Telegram context is unavailable', () => {
    (globalThis as any).window = {
      location: { search: '', hash: '' },
    };
    expect(getTelegramUser()).toBeNull();
  });

  it('reads user from initDataUnsafe first', () => {
    (globalThis as any).window = {
      Telegram: {
        WebApp: {
          initDataUnsafe: {
            user: { id: 10, username: 'alice' },
          },
        },
      },
      location: { search: '', hash: '' },
    };

    expect(getTelegramUser()).toEqual({ id: 10, username: 'alice' });
  });

  it('reads user from initData fallback', () => {
    (globalThis as any).window = {
      Telegram: {
        WebApp: {
          initData: 'user={"id":11,"first_name":"Bob"}',
        },
      },
      location: { search: '', hash: '' },
    };

    expect(getTelegramUser()).toEqual({ id: 11, first_name: 'Bob' });
  });

  it('reads user from tgWebAppData in hash fallback', () => {
    const encodedData = encodeURIComponent('user={"id":12,"first_name":"Carol"}');
    (globalThis as any).window = {
      location: { search: '', hash: `#tgWebAppData=${encodedData}` },
    };

    expect(getTelegramUser()).toEqual({ id: 12, first_name: 'Carol' });
  });
});
