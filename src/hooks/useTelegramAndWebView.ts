import { useEffect, useState, useCallback, useMemo } from 'react';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  language_code?: string;
}

export interface TelegramWebAppState {
  isTelegram: boolean;
  isAndroidWebView: boolean;
  telegramUser: TelegramUser | null;
  platform: string;
  initData: string;
  colorScheme: 'dark' | 'light';
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        setHeaderColor: (color: string) => void;
        setBackgroundColor: (color: string) => void;
        enableClosingConfirmation: () => void;
        sendData: (data: string) => void;
        openTelegramLink: (url: string) => void;
        openLink: (url: string) => void;
        platform: string;
        colorScheme: 'dark' | 'light';
        initData: string;
        initDataUnsafe?: {
          user?: TelegramUser;
          query_id?: string;
          auth_date?: string;
          hash?: string;
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
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
      };
    };
    Android?: {
      showToast?: (message: string) => void;
      vibrate?: (ms: number) => void;
      getAppVersion?: () => string;
      onBackPressed?: () => void;
    };
    AndroidInterface?: {
      showToast?: (message: string) => void;
      vibrate?: (ms: number) => void;
    };
  }
}

export function useTelegramAndWebView() {
  const [state, setState] = useState<TelegramWebAppState>(() => {
    const isTg = typeof window !== 'undefined' && (
      !!window.Telegram?.WebApp?.initData ||
      typeof window.location !== 'undefined' && (window.location.search.includes('tgWebAppPlatform') || window.location.hash.includes('tgWebAppData'))
    );
    const isWv = typeof window !== 'undefined' && (
      !!window.Android || 
      !!window.AndroidInterface || 
      /wv|WebView|Android.*(wv|\.0\.0\.0|Version\/[\d.]*\sChrome)/i.test(navigator.userAgent) ||
      (typeof window.location !== 'undefined' && (window.location.search.includes('platform=android') || window.location.search.includes('mode=apk')))
    );

    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user || null;
    const platform = window.Telegram?.WebApp?.platform || (isWv ? 'android_webview' : 'web');
    const colorScheme = window.Telegram?.WebApp?.colorScheme || 'dark';

    return {
      isTelegram: isTg,
      isAndroidWebView: isWv,
      telegramUser: tgUser,
      platform,
      initData: window.Telegram?.WebApp?.initData || '',
      colorScheme
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const tg = window.Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand();
        tg.setHeaderColor('#020617');
        tg.setBackgroundColor('#020617');
        tg.enableClosingConfirmation?.();

        setState({
          isTelegram: true,
          isAndroidWebView: !!window.Android || !!window.AndroidInterface || /wv|WebView|Android.*(wv|\.0\.0\.0|Version\/[\d.]*\sChrome)/i.test(navigator.userAgent),
          telegramUser: tg.initDataUnsafe?.user || null,
          platform: tg.platform || 'telegram',
          initData: tg.initData || '',
          colorScheme: tg.colorScheme || 'dark'
        });
      } catch (err) {
        console.warn('Telegram WebApp init warning:', err);
      }
    }
  }, []);

  // Universal Back Button handler for Android APK & Telegram WebApp
  const setupBackButton = useCallback((canGoBack: boolean, onBack: () => void) => {
    if (typeof window === 'undefined') return () => {};

    // 1. Telegram WebApp BackButton
    const tgBackButton = window.Telegram?.WebApp?.BackButton;
    if (tgBackButton) {
      try {
        if (canGoBack) {
          tgBackButton.show();
          tgBackButton.onClick(onBack);
        } else {
          tgBackButton.hide();
        }
      } catch (e) {
        console.warn('Telegram BackButton error:', e);
      }
    }

    // 2. Android WebView Bridge Back Pressed handler
    (window as any).onAndroidBackPressed = () => {
      if (canGoBack) {
        onBack();
        return true; // consumed
      }
      return false; // let native system handle (e.g. exit app)
    };

    // 3. Android Hardware Back Button Keyboard Code (KeyCode 4)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (canGoBack && (e.key === 'Escape' || e.key === 'Back' || (e as any).keyCode === 4)) {
        e.preventDefault();
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (tgBackButton) {
        try {
          tgBackButton.offClick(onBack);
        } catch {}
      }
    };
  }, []);

  // Haptic feedback trigger for Telegram or Android native
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'medium') => {
    try {
      // 1. Telegram Haptic
      const tg = window.Telegram?.WebApp?.HapticFeedback;
      if (tg) {
        if (type === 'success' || type === 'warning' || type === 'error') {
          tg.notificationOccurred(type);
        } else {
          tg.impactOccurred(type);
        }
        return;
      }

      // 2. Android WebView Bridge Vibrate
      if (window.Android?.vibrate) {
        window.Android.vibrate(type === 'heavy' ? 80 : 40);
        return;
      }
      if (window.AndroidInterface?.vibrate) {
        window.AndroidInterface.vibrate(type === 'heavy' ? 80 : 40);
        return;
      }

      // 3. Web Navigator Vibrate fallback
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(type === 'heavy' ? 60 : 30);
      }
    } catch {}
  }, []);

  // Android Native Toast fallback
  const showNativeOrWebToast = useCallback((msg: string) => {
    try {
      if (window.Android?.showToast) {
        window.Android.showToast(msg);
        return true;
      }
      if (window.AndroidInterface?.showToast) {
        window.AndroidInterface.showToast(msg);
        return true;
      }
    } catch {}
    return false;
  }, []);

  return {
    ...state,
    triggerHaptic,
    showNativeOrWebToast,
    setupBackButton
  };
}
