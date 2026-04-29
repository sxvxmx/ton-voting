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
  try {
    webApp.ready();
    webApp.expand();
  } catch (error) {
    console.warn('Failed to initialize Telegram WebApp context', error);
  }
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
    const user = JSON.parse(rawUser) as TelegramUser;
    return typeof user?.id === 'number' ? user : null;
  } catch {
    return null;
  }
}

function readLaunchParam(name: string): string | null {
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
  const fromUnsafe = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (fromUnsafe?.id) {
    return fromUnsafe;
  }

  const fromInitData = parseUserFromInitData(window.Telegram?.WebApp?.initData);
  if (fromInitData?.id) {
    return fromInitData;
  }

  const fromLaunchData = parseUserFromInitData(readLaunchParam('tgWebAppData'));
  if (fromLaunchData?.id) {
    return fromLaunchData;
  }

  return null;
}
