import { create } from 'zustand';
import { trackOnboardingDone } from '../lib/analytics';
import { resolveLocale, setLocale, type Locale } from '../localization';
import { setClockFormat, type ClockFormat } from '../lib/format';
import { setDistanceUnit, type DistanceUnit } from '../lib/geo';
import { DEFAULT_WARN_THRESHOLD_MIN } from '../lib/tariffMath';

// Kullanıcı ayarları — cihazda kalıcı (settings tablosu). screens.md §10.
// Tema, dil, para birimi ve uyarı eşiği buradan tek kaynak olarak okunur.

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Seçicide görünen para birimleri — desteklenen dillerin pazarlarını karşılar.
 * Liste bir DOĞRULAMA listesi değil: cihazın kendi ISO kodu listede olmasa da
 * olduğu gibi kabul edilir (formatMoney zaten Intl'e devrediyor). Eskiden
 * listede olmayan her kod sessizce EUR'ya düşüyordu ve Kanadalı kullanıcı
 * girdiği tarifeyi her yüzeyde euro olarak görüyordu.
 */
export const CURRENCIES = [
  'USD', 'EUR', 'GBP', 'TRY', 'CAD', 'AUD', 'NZD', 'CHF',
  'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'MXN', 'BRL', 'JPY', 'KRW', 'TWD',
] as const;
export type Currency = string;

export const WARN_THRESHOLDS = [5, 10, 15, 30] as const;

interface SettingsStore {
  themeMode: ThemeMode;
  locale: Locale;
  currency: Currency;
  warnThresholdMin: number;
  /** Saat biçimi — 'device' cihazın bölge ayarını izler. */
  clockFormat: 'device' | ClockFormat;
  setClockFormatPref: (value: 'device' | ClockFormat) => void;
  /** Mesafe birimi — 'device' cihazın ölçü sistemini izler. */
  units: 'device' | DistanceUnit;
  setUnits: (value: 'device' | DistanceUnit) => void;
  /** §7.1 onboarding bir kez gösterilir. */
  onboardingSeen: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  /** Her şeyi sil sonrası tercihleri cihaz varsayılanına döndürür. */
  resetToDefaults: () => void;
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
 * Kullanılabilir para birimi kodu mu. XXX ISO 4217'de "para birimi yok" demektir
 * ve bir tutarı onunla göstermek anlamsızdır.
 */
function isUsableCurrency(code: string | null | undefined): code is string {
  return !!code && /^[A-Z]{3}$/.test(code) && code !== 'XXX';
}

/**
 * Cihazın dil/bölge ayarından varsayılanlar.
 *
 * Para birimi cihazın kendi ISO kodudur — listede olmasa bile. Liste yalnız
 * seçiciyi doldurur; bilinmeyen kodu EUR'ya çevirmek, kullanıcının girdiği
 * rakamı yanlış para biriminde göstermek demekti.
 */
function detectDeviceDefaults(): {
  locale: Locale;
  currency: Currency;
  clock: ClockFormat;
  unit: DistanceUnit;
} {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Localization = require('expo-localization') as typeof import('expo-localization');
    const preferred = Localization.getLocales()[0];
    const language = resolveLocale(preferred?.languageTag ?? preferred?.languageCode);
    const code = preferred?.currencyCode?.toUpperCase();
    // getCalendars her ortamda olmayabilir; yokluğu para birimi tespitini
    // çöpe atmamalı.
    const calendar =
      typeof Localization.getCalendars === 'function' ? Localization.getCalendars()[0] : undefined;
    return {
      locale: language,
      // Geçerli bir ISO 4217 kodu üç harftir; başka bir şey geldiyse dile düş.
      currency: isUsableCurrency(code) ? code : language === 'tr' ? 'TRY' : 'USD',
      clock: calendar?.uses24hourClock === false ? '12' : '24',
      unit: preferred?.measurementSystem === 'us' ? 'imperial' : 'metric',
    };
  } catch {
    return { locale: 'en', currency: 'USD', clock: '24', unit: 'metric' };
  }
}

/** Seçim 'device' ise cihazın söylediği uygulanır. */
function applyFormats(
  clockPref: 'device' | ClockFormat,
  unitPref: 'device' | DistanceUnit,
  device: { clock: ClockFormat; unit: DistanceUnit },
): void {
  setClockFormat(clockPref === 'device' ? device.clock : clockPref);
  setDistanceUnit(unitPref === 'device' ? device.unit : unitPref);
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  themeMode: 'system',
  locale: 'en',
  currency: 'TRY',
  warnThresholdMin: DEFAULT_WARN_THRESHOLD_MIN,
  onboardingSeen: false,
  // Premium kullanıcıda varsayılan AÇIK: satın alınan özelliğin çalışması için
  // ayrıca bir anahtar aramak zorunda kalmak "para verdim çalışmıyor" üretiyor.
  autoDetectEnabled: true,
  clockFormat: 'device',
  units: 'device',
  hydrated: false,

  setAutoDetect: (autoDetectEnabled) => {
    write('autoDetectEnabled', autoDetectEnabled ? '1' : '0');
    set({ autoDetectEnabled });
  },

  completeOnboarding: () => {
    trackOnboardingDone();
    write('onboardingSeen', '1');
    set({ onboardingSeen: true });
  },

  /** Geliştirici: posterleri tekrar görmek için. Yalnız __DEV__'de çağrılır. */
  resetOnboarding: () => {
    if (!__DEV__) return;
    write('onboardingSeen', '0');
    set({ onboardingSeen: false });
  },

  /**
   * Ayarlar > Veri "her şeyi sil" sonrası: tercihler cihaz varsayılanlarına
   * döner ve onboarding yeniden gösterilir. Kopya "uygulama sıfırlanır" diyor;
   * ayarların sessizce kalması o sözü tutmamak olurdu.
   */
  resetToDefaults: () => {
    const device = detectDeviceDefaults();
    applyFormats('device', 'device', device);
    set({
      clockFormat: 'device',
      units: 'device',
      onboardingSeen: false,
      themeMode: 'system',
      locale: device.locale,
      currency: device.currency,
      warnThresholdMin: DEFAULT_WARN_THRESHOLD_MIN,
      autoDetectEnabled: true,
    });
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
    // Kayıtlı dil artık bölgeli olabilir ('en-GB'); resolveLocale bilinmeyeni eler.
    if (locale) {
      const resolved = resolveLocale(locale);
      if (resolved.toLowerCase() === locale.toLowerCase()) next.locale = resolved;
    }
    if (isUsableCurrency(currency)) next.currency = currency;
    if (Number.isFinite(threshold) && threshold > 0) next.warnThresholdMin = threshold;
    if (read('onboardingSeen') === '1') next.onboardingSeen = true;
    // Varsayılan açık olduğu için yalnız KAPATMA kararı kalıcılaşır.
    if (read('autoDetectEnabled') === '0') next.autoDetectEnabled = false;

    const clockPref = read('clockFormat');
    if (clockPref === '12' || clockPref === '24' || clockPref === 'device') {
      next.clockFormat = clockPref;
    }
    const unitPref = read('units');
    if (unitPref === 'metric' || unitPref === 'imperial' || unitPref === 'device') {
      next.units = unitPref;
    }
    applyFormats(next.clockFormat ?? 'device', next.units ?? 'device', device);

    if (next.locale) setLocale(next.locale);
    set(next);
  },

  setClockFormatPref: (clockFormat) => {
    write('clockFormat', clockFormat);
    setClockFormat(clockFormat === 'device' ? detectDeviceDefaults().clock : clockFormat);
    set({ clockFormat });
  },

  setUnits: (units) => {
    write('units', units);
    setDistanceUnit(units === 'device' ? detectDeviceDefaults().unit : units);
    set({ units });
  },

  setThemeMode: (themeMode) => {
    write('themeMode', themeMode);
    set({ themeMode });
  },

  setLocalePref: (locale) => {
    write('locale', locale);
    setLocale(locale); // t() modül seviyesinde okur; ağaç locale key'iyle tazelenir
    // Widget'ın etiketleri App Group kutusunda yaşar — dil değişince yeniden yaz.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const la = require('../lib/liveActivity') as typeof import('../lib/liveActivity');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const session = (require('./sessionStore') as typeof import('./sessionStore')).useSessionStore.getState().session;
      la.syncWidget(session);
    } catch {
      /* native modül yoksa (Expo Go) sessizce geç */
    }
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
