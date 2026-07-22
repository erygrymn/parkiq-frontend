import { describe, expect, it, jest, beforeEach } from '@jest/globals';

// Kalıcı katman taklit edilir: hydrate'in bozuk/eski değerleri elemesi test edilir.
const store: Record<string, string> = {};
jest.mock('../../db/sessionRepo', () => ({
  readSetting: (key: string) => store[key] ?? null,
  writeSetting: (key: string, value: string) => {
    store[key] = value;
  },
  deleteAllSessions: () => undefined,
}));

// Cihaz dili sabitlenir: varsayılanlar deterministik olsun (İngilizce cihaz, EUR bölge).
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', currencyCode: 'EUR' }],
}));

import { useSettingsStore } from '../settingsStore';
import { getLocale } from '../../localization';

beforeEach(() => {
  for (const key of Object.keys(store)) delete store[key];
  useSettingsStore.setState({
    themeMode: 'system',
    locale: 'en',
    currency: 'TRY',
    warnThresholdMin: 15,
    hydrated: false,
  });
});

describe('settingsStore — hydrate', () => {
  it('geçerli kayıtlı değerleri yükler ve locale motorunu ayarlar', () => {
    store.themeMode = 'dark';
    store.locale = 'tr';
    store.currency = 'EUR';
    store.warnThresholdMin = '30';

    useSettingsStore.getState().hydrate();

    const s = useSettingsStore.getState();
    expect(s.themeMode).toBe('dark');
    expect(s.locale).toBe('tr');
    expect(s.currency).toBe('EUR');
    expect(s.warnThresholdMin).toBe(30);
    expect(getLocale()).toBe('tr');
  });

  it('bozuk değerleri yok sayar, cihaz varsayılanlarına düşer', () => {
    store.themeMode = 'neon';
    store.locale = 'de';
    store.currency = 'XXX';
    store.warnThresholdMin = 'abc';

    useSettingsStore.getState().hydrate();

    const s = useSettingsStore.getState();
    expect(s.themeMode).toBe('system');
    // Cihaz İngilizce/EUR → kayıtlı bozuk değerler yerine cihaz varsayılanı
    expect(s.locale).toBe('en');
    expect(s.currency).toBe('EUR');
    expect(s.warnThresholdMin).toBe(15);
  });

  it('hiç kayıt yokken cihaz dili/para birimi kullanılır', () => {
    useSettingsStore.getState().hydrate();
    const s = useSettingsStore.getState();
    expect(s.locale).toBe('en');
    expect(s.currency).toBe('EUR');
  });

  it('negatif/sıfır eşik reddedilir (bildirim zamanlaması bozulmasın)', () => {
    store.warnThresholdMin = '0';
    useSettingsStore.getState().hydrate();
    expect(useSettingsStore.getState().warnThresholdMin).toBe(15);
  });

  it('ayar değiştirince kalıcı katmana yazılır', () => {
    useSettingsStore.getState().setWarnThreshold(5);
    useSettingsStore.getState().setCurrency('USD');
    expect(store.warnThresholdMin).toBe('5');
    expect(store.currency).toBe('USD');
  });
});
