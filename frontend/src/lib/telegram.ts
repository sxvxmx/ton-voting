import type { TelegramUser } from '../types';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        initData?: string;
        initDataUnsafe?: {
          user?: TelegramUser;
        };
      };
    };
  }
}

export function initTelegramWebApp(): void {
  const webApp = window.Telegram?.WebApp;
  if (!webApp) {
    return;
  }
  webApp.ready();
  webApp.expand();
}

export async function ensureTelegramWebAppReady(timeoutMs = 12000, intervalMs = 150): Promise<boolean> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const webApp = window.Telegram?.WebApp;
    if (webApp) {
      webApp.ready();
      webApp.expand();
      return true;
    }
    await new Promise((resolve) => {
      window.setTimeout(resolve, intervalMs);
    });
  }

  return false;
}

function parseUserFromInitData(rawInitData: string | null | undefined): TelegramUser | null {
  if (!rawInitData) {
    return null;
  }

  try {
    const params = new URLSearchParams(rawInitData);
    const rawUser = params.get('user');
    if (!rawUser) {
      return null;
    }

    const parsed = JSON.parse(rawUser) as TelegramUser;
    if (!parsed || typeof parsed.id !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function locationParam(name: string): string | null {
  const fromSearch = new URLSearchParams(window.location.search).get(name);
  if (fromSearch) {
    return fromSearch;
  }

  const hashRaw = window.location.hash ?? '';
  const hash = hashRaw.startsWith('#') ? hashRaw.slice(1) : hashRaw;
  if (!hash) {
    return null;
  }
  return new URLSearchParams(hash).get(name);
}

export function getTelegramUser(): TelegramUser | null {
  const unsafeUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (unsafeUser?.id) {
    return unsafeUser;
  }

  const fromTelegramInitData = parseUserFromInitData(window.Telegram?.WebApp?.initData);
  if (fromTelegramInitData) {
    return fromTelegramInitData;
  }

  const fromUrlInitData = parseUserFromInitData(locationParam('tgWebAppData'));
  if (fromUrlInitData) {
    return fromUrlInitData;
  }

  return null;
}
