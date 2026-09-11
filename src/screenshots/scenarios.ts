import { Image } from 'react-native';
import type { ParkingPoi } from '../lib/parkingPoi';
import type { Tariff } from '../lib/tariffMath';
import { useDiscoveryStore } from '../state/discoveryStore';
import { useSessionStore, type ParkSession } from '../state/sessionStore';
import { useSettingsStore } from '../state/settingsStore';
import { useUiStore } from '../state/uiStore';

/**
 * App Store ekran görüntüsü sahneleri (aso.md §4'ün 7 karesi).
 *
 * YALNIZ `__DEV__`. Sahte veri shipping'e giremez — bu dosya `screenshots`
 * dalında yaşar ve main'e birleştirilmez (CLAUDE.md placeholder yasağı).
 *
 * Sahte EKRAN yazılmaz, sahte DURUM yazılır: store'lara doğrudan state basılır ve
 * gerçek yüzeyler render eder. İkinci bir "screenshot sürümü" komponent yazmak
 * gerçek UI'ın değiştiğinde sessizce eskiyen bir yalan üretirdi.
 */

const MIN = 60_000;

/**
 * Sahne tarifesi. Rakamlar aso.md §4'ün altyazılarıyla birebir: EN'de
 * "Leave now $5. Stay and it's $10", TR'de "Şimdi çık ₺50. Kalırsan ₺100".
 * `assets/tariff-board-en.png` ve `-tr.png` panoları da aynı rakamları taşır —
 * biri değişirse öteki de değişmeli, yoksa set kendi içinde yalan söyler.
 */
const TARIFF_STEPS: Record<'USD' | 'TRY', number> = { USD: 5, TRY: 50 };

function tariffFor(currency: string): Tariff {
  const step = TARIFF_STEPS[currency === 'TRY' ? 'TRY' : 'USD'];
  return {
    type: 'tiered',
    currency: currency === 'TRY' ? 'TRY' : 'USD',
    tiers: [
      { endMin: 60, cumulativePrice: step },
      { endMin: 120, cumulativePrice: step * 2 },
      { endMin: 180, cumulativePrice: step * 3 },
    ],
    dailyMax: step * 6,
  };
}

/** Sahneler app'in o anki para biriminde kurulur; EN seti için USD'de bırak. */
export function demoTariff(): Tariff {
  return tariffFor(useSettingsStore.getState().currency);
}

/** Metro dev sunucusundan servis edilen paket içi foto — `expo-image` bunu açar. */
export function garagePhotoUri(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return Image.resolveAssetSource(require('./assets/garage.png') as number).uri ?? null;
  } catch {
    return null;
  }
}

export function demoSession(overrides: Partial<ParkSession>): ParkSession {
  return {
    id: 'ss-session',
    startedAtMs: Date.now(),
    recordedAtMs: Date.now(),
    endedAtMs: null,
    floor: '',
    note: '',
    tariff: null,
    latitude: 41.8827,
    longitude: -87.6294,
    placeName: 'Dearborn Garage',
    photoUri: null,
    reminder: null,
    accuracyM: 8,
    confirmed: true,
    ...overrides,
  };
}

/**
 * Sahte otoparklar. Adlar sokak adından türetildi: marka adı kullanmak 5.2.1
 * (üçüncü parti ticari marka) kapısına girer, sokak adı girmez.
 */
export const DEMO_POIS: ParkingPoi[] = [
  { id: 'way/1', kind: 'parking', name: 'Dearborn Garage', latitude: 41.8831, longitude: -87.6292, covered: true, hasCharging: true, distanceM: 90 },
  { id: 'way/2', kind: 'parking', name: 'Franklin Street Parking', latitude: 41.8804, longitude: -87.6351, covered: true, hasCharging: true, distanceM: 340 },
  { id: 'way/3', kind: 'parking', name: 'Riverside Lot', latitude: 41.8869, longitude: -87.6318, covered: false, hasCharging: true, distanceM: 520 },
  { id: 'node/4', kind: 'charging', name: 'Adams St Chargers', latitude: 41.8796, longitude: -87.6265, covered: null, hasCharging: true, distanceM: 210 },
  { id: 'node/5', kind: 'charging', name: 'Wacker Drive Charging', latitude: 41.8873, longitude: -87.6355, covered: null, hasCharging: true, distanceM: 610 },
];

export function resetDemoStores(): void {
  // Mock veri İNGİLİZCE ve USD: EN birincil mağaza dili, TR seti para birimini
  // Ayarlar'dan çevirerek çekilir (tarife de o birimden kurulur).
  useSettingsStore.setState({ currency: 'USD' });
  useUiStore.setState({ historyOpen: false, arOpen: false, photo: null, endConfirm: false, locationInviteDismissed: true });
  useSessionStore.setState({
    phase: 'idle',
    session: null,
    pickingLocation: null,
    suggestedTariff: null,
    pooledTariff: null,
    locationState: 'ok',
    ocrState: 'idle',
  });
  useDiscoveryStore.setState({ pois: [], filter: 'all', selectedPoiId: null, state: 'ready' });
}

export interface Scenario {
  key: string;
  /** aso.md §4 kare numarası; sıraya göre listelenir. */
  frame: number;
  label: string;
  /** Kare hazırlandıktan sonra ekranda ne beklenmeli — listede alt satır. */
  hint: string;
  apply: () => void;
}

export const SCENARIOS: Scenario[] = [
  {
    key: 'active-amber',
    frame: 1,
    label: 'Aktif oturum · amber',
    hint: 'Çubuk amber, para kutusu iki rakamı da taşıyor',
    apply: () => {
      resetDemoStores();
      useSettingsStore.setState({ warnThresholdMin: 15 });
      // Dilim sonuna 8 dk: amber eşiğinin içinde, para kutusu iki rakamı da taşıyor.
      const started = Date.now() - 52 * MIN;
      useSessionStore.setState({
        phase: 'active',
        session: demoSession({ startedAtMs: started, recordedAtMs: started, tariff: demoTariff(), floor: '3' }),
      });
    },
  },
  {
    key: 'celebration',
    frame: 3,
    label: 'Kutlama · SAVED',
    hint: 'Tasarruf damgası + aylık toplam',
    apply: () => {
      resetDemoStores();
      const started = Date.now() - 58 * MIN;
      useSessionStore.setState({
        phase: 'ended',
        session: demoSession({ startedAtMs: started, recordedAtMs: started, endedAtMs: Date.now(), tariff: demoTariff() }),
      });
    },
  },
  {
    key: 'finding-indoor',
    frame: 5,
    label: 'Arabamı Bul · kapalı alan',
    hint: 'Kat 3 + foto kartı (pusula değil)',
    apply: () => {
      resetDemoStores();
      const started = Date.now() - 95 * MIN;
      useSessionStore.setState({
        phase: 'finding',
        // accuracyM yüksek = kapalı otopark: ekran pusula yerine foto+kat kartını seçer.
        session: demoSession({
          startedAtMs: started,
          recordedAtMs: started,
          tariff: demoTariff(),
          floor: '3',
          note: 'Blue pillar, left of the elevator',
          photoUri: garagePhotoUri(),
          accuracyM: 65,
        }),
      });
    },
  },
  {
    key: 'poster',
    frame: 4,
    label: 'Tipografik kare',
    hint: 'Ürün ekranı değil — tam ekran poster (EN/TR)',
    // Poster ayrı bir tam ekran katman; ScreenshotSheet bu anahtarı özel ele alır.
    apply: () => undefined,
  },
  {
    key: 'tariff-scanned',
    frame: 6,
    label: 'Tarife · tarama sonucu',
    hint: 'Panodan okunmuş dilimler formda',
    apply: () => {
      resetDemoStores();
      const started = Date.now() - 3 * MIN;
      useSessionStore.setState({
        phase: 'parking',
        session: demoSession({ startedAtMs: started, recordedAtMs: started, tariff: demoTariff(), confirmed: false }),
        ocrState: 'idle',
      });
    },
  },
  {
    key: 'map-charging',
    frame: 7,
    label: 'Harita · şarj filtresi',
    hint: '⚡ filtresi açık, pinler görünür',
    apply: () => {
      resetDemoStores();
      useDiscoveryStore.setState({ pois: DEMO_POIS, filter: 'charging', state: 'ready', radiusM: 1000 });
    },
  },
  {
    key: 'demo-reel',
    frame: 0,
    label: 'UGC demo · kendi akar (28 sn)',
    hint: 'Park → sayaç → amber → SAVED, döngüde. Ekran kaydı için.',
    // Reel'i ScreenshotSheet başlatır: durdurma fonksiyonunu tutması gerekiyor.
    apply: () => undefined,
  },
  {
    key: 'reset',
    frame: 0,
    label: 'Sıfırla',
    hint: 'Sahte durumu temizle, keşfe dön',
    apply: resetDemoStores,
  },
];
