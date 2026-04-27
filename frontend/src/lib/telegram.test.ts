import { describe, expect, it } from 'vitest';
import { getTelegramUser } from './telegram';

describe('telegram context', () => {
  it('returns null when Telegram context is unavailable', () => {
    (globalThis as any).window = {
      location: { search: '', hash: '' },
    };
    expect(getTelegramUser()).toBeNull();
  });

  it('reads user from initDataUnsafe when available', () => {
    (globalThis as any).window = {
      Telegram: {
        WebApp: {
          initDataUnsafe: {
            user: {
              id: 123,
              username: 'alice',
            },
          },
        },
      },
      location: { search: '', hash: '' },
    };

    expect(getTelegramUser()).toEqual({
      id: 123,
      username: 'alice',
    });
  });

  it('falls back to tgWebAppData URL query user', () => {
    const raw = encodeURIComponent('user={"id":777,"first_name":"Bob"}');
    (globalThis as any).window = {
      location: { search: `?tgWebAppData=${raw}`, hash: '' },
    };

    expect(getTelegramUser()).toEqual({
      id: 777,
      first_name: 'Bob',
    });
  });

  it('falls back to tgWebAppData hash user', () => {
    const raw = encodeURIComponent('user={"id":888,"first_name":"Carol"}');
    (globalThis as any).window = {
      location: { search: '', hash: `#tgWebAppData=${raw}` },
    };

    expect(getTelegramUser()).toEqual({
      id: 888,
      first_name: 'Carol',
    });
  });
});
