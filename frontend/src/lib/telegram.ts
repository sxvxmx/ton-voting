import type { TelegramUser } from '../types';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
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

export function getTelegramUser(): TelegramUser | null {
  return window.Telegram?.WebApp?.initDataUnsafe?.user ?? null;
}
