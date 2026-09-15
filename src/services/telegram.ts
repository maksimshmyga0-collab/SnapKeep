/**
 * Telegram WebApp API Bridge with seamless mock/fallback
 * for browser development and preview.
 */

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        isExpanded: boolean;
        headerColor?: string;
        backgroundColor?: string;
        setHeaderColor?: (color: string) => void;
        setBackgroundColor?: (color: string) => void;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            photo_url?: string;
          };
          query_id?: string;
          auth_date?: string;
        };
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
          selectionChanged: () => void;
        };
        BackButton?: {
          isVisible: boolean;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
      };
    };
  }
}

export const isTelegramEnvironment = (): boolean => {
  return typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp?.initDataUnsafe?.user || window.Telegram?.WebApp?.ready);
};

export const initTelegramApp = () => {
  if (typeof window === 'undefined') return;
  try {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand?.();
      tg.setHeaderColor?.('#0C0D10');
      tg.setBackgroundColor?.('#0C0D10');
    }
  } catch (e) {
    console.warn('Telegram WebApp init ignored in non-TG environment:', e);
  }
};

export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'selection' = 'light') => {
  if (typeof window === 'undefined') return;
  try {
    const haptic = window.Telegram?.WebApp?.HapticFeedback;
    if (haptic) {
      if (type === 'success') {
        haptic.notificationOccurred('success');
      } else if (type === 'selection') {
        haptic.selectionChanged();
      } else {
        haptic.impactOccurred(type);
      }
      return;
    }
    // Web Vibration fallback for mobile browser preview
    if ('vibrate' in navigator) {
      if (type === 'success') navigator.vibrate([15, 40, 20]);
      else if (type === 'heavy') navigator.vibrate(30);
      else navigator.vibrate(10);
    }
  } catch {
    // Ignore fallback vibration errors
  }
};

export const getTelegramUser = () => {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp?.initDataUnsafe?.user || null;
};
