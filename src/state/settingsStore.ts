import { create } from 'zustand';
import { setLocale, type Locale } from '../localization';
import { DEFAULT_WARN_THRESHOLD_MIN } from '../lib/tariffMath';

// Kullanıcı ayarları — cihazda kalıcı (settings tablosu). screens.md §10.
// Tema, dil, para birimi ve uyarı eşiği buradan tek kaynak olarak okunur.

export type ThemeMode = 'light' | 'dark' | 'system';

export const CURRENCIES = ['TRY', 'EUR', 'USD', 'GBP'] as const;
export type Currency = (typeof CURRENCIES)[number];

export const WARN_THRESHOLDS = [5, 10, 15, 30] as const;

interface SettingsStore {
  themeMode: ThemeMode;
  locale: Locale;
  currency: Currency;
  warnThresholdMin: number;
  /** §7.1 onboarding bir kez gösterilir. */
  onboardingSeen: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  /** §7.4b oto-algılama açık mı (premium; kullanıcı Ayarlar'dan açar). */
  autoDetectEnabled: boolean;
  setAutoDetect: (value: boolean) => void;
  hydrated: boolean;
  hydrate: () => void;
  setThemeMode: (mode: ThemeMode) => void;
  setLocalePref: (locale: Locale) => void;
  setCurrency: (currency: Currency) => void;
  setWarnThreshold: (minutes: number) => void;
}

function repo() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../db/sessionRepo') as typeof import('../db/sessionRepo');
}

function write(key: string, value: string): void {
  try {
    repo().writeSetting(key, value);
  } catch {
    // Kalıcılık başarısızsa ayar oturum boyunca bellekte geçerli kalır.
  }
}

function read(key: string): string | null {
  try {
    return repo().readSetting(key);
  } catch {
    return null;
  }
}

/**
 * Cihazın dil/bölge ayarından varsayılanlar. Global-first EN + TR: cihaz Türkçeyse
 * TR, değilse EN. Para birimi bölgeden gelir; desteklemediğimiz bir para birimiyse
 * bölgeye göre makul karşılığa düşer.
 */
function detectDeviceDefaults(): { locale: Locale; currency: Currency } {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Localization = require('expo-localization') as typeof import('expo-localization');
    const preferred = Localization.getLocales()[0];
    const language = preferred?.languageCode === 'tr' ? 'tr' : 'en';
    const code = preferred?.currencyCode?.toUpperCase();
    const currency =
      code && (CURRENCIES as readonly string[]).includes(code) ? (code as Currency) : 'EUR';
    return { locale: language, currency: language === 'tr' ? 'TRY' : currency };
  } catch {
    return { locale: 'en', currency: 'TRY' };
  }
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  themeMode: 'system',
  locale: 'en',
  currency: 'TRY',
  warnThresholdMin: DEFAULT_WARN_THRESHOLD_MIN,
  onboardingSeen: false,
  autoDetectEnabled: false,
  hydrated: false,

  setAutoDetect: (autoDetectEnabled) => {
    write('autoDetectEnabled', autoDetectEnabled ? '1' : '0');
    set({ autoDetectEnabled });
  },

  completeOnboarding: () => {
    write('onboardingSeen', '1');
    set({ onboardingSeen: true });
  },

  /** Geliştirici: posterleri tekrar görmek için. Yalnız __DEV__'de çağrılır. */
  resetOnboarding: () => {
    if (!__DEV__) return;
    write('onboardingSeen', '0');
    set({ onboardingSeen: false });
  },

  hydrate: () => {
    const themeMode = read('themeMode');
    const locale = read('locale');
    const currency = read('currency');
    const threshold = Number(read('warnThresholdMin'));

    // İlk açılışta cihaz diline/bölgesine göre varsayılan; sonra kullanıcı seçimi kazanır.
    const device = detectDeviceDefaults();
    const next: Partial<SettingsStore> = {
      hydrated: true,
      locale: device.locale,
      currency: device.currency,
    };
    setLocale(device.locale);
    if (themeMode === 'light' || themeMode === 'dark' || themeMode === 'system') next.themeMode = themeMode;
    if (locale === 'en' || locale === 'tr') next.locale = locale;
    if (currency && (CURRENCIES as readonly string[]).includes(currency)) next.currency = currency as Currency;
    if (Number.isFinite(threshold) && threshold > 0) next.warnThresholdMin = threshold;
    if (read('onboardingSeen') === '1') next.onboardingSeen = true;
    if (read('autoDetectEnabled') === '1') next.autoDetectEnabled = true;

    if (next.locale) setLocale(next.locale);
    set(next);
  },

  setThemeMode: (themeMode) => {
    write('themeMode', themeMode);
    set({ themeMode });
  },

  setLocalePref: (locale) => {
    write('locale', locale);
    setLocale(locale); // t() modül seviyesinde okur; ağaç locale key'iyle tazelenir
    set({ locale });
  },

  setCurrency: (currency) => {
    write('currency', currency);
    set({ currency });
  },

  setWarnThreshold: (warnThresholdMin) => {
    write('warnThresholdMin', String(warnThresholdMin));
    set({ warnThresholdMin });
  },
}));
