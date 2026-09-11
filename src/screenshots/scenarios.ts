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

/** Kare 1 ve 3'ün tarifesi: 0–1s ₺50 · 1–2s ₺100 · 2–3s ₺150, günlük tavan ₺300. */
const TARIFF: Tariff = {
  type: 'tiered',
  currency: 'TRY',
  tiers: [
    { endMin: 60, cumulativePrice: 50 },
    { endMin: 120, cumulativePrice: 100 },
    { endMin: 180, cumulativePrice: 150 },
  ],
  dailyMax: 300,
};

/** Metro dev sunucusundan servis edilen paket içi foto — `expo-image` bunu açar. */
function garagePhotoUri(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return Image.resolveAssetSource(require('./assets/garage.png') as number).uri ?? null;
  } catch {
    return null;
  }
}

function session(overrides: Partial<ParkSession>): ParkSession {
  return {
    id: 'ss-session',
    startedAtMs: Date.now(),
    recordedAtMs: Date.now(),
    endedAtMs: null,
    floor: '',
    note: '',
    tariff: null,
    latitude: 41.0766,
    longitude: 29.0203,
    placeName: 'Kanyon AVM',
    photoUri: null,
    reminder: null,
    accuracyM: 8,
    confirmed: true,
    ...overrides,
  };
}

const POIS: ParkingPoi[] = [
  { id: 'way/1', kind: 'parking', name: 'Kanyon Otopark', latitude: 41.0768, longitude: 29.0205, covered: true, hasCharging: true, distanceM: 90 },
  { id: 'way/2', kind: 'parking', name: 'Zorlu Center P2', latitude: 41.0672, longitude: 29.0165, covered: true, hasCharging: true, distanceM: 340 },
  { id: 'way/3', kind: 'parking', name: 'Levent Meydan', latitude: 41.0801, longitude: 29.0121, covered: false, hasCharging: true, distanceM: 520 },
  { id: 'node/4', kind: 'charging', name: 'Eşarj Levent', latitude: 41.0744, longitude: 29.0247, covered: null, hasCharging: true, distanceM: 210 },
  { id: 'node/5', kind: 'charging', name: 'ZES Büyükdere', latitude: 41.0812, longitude: 29.0188, covered: null, hasCharging: true, distanceM: 610 },
];

function resetStores(): void {
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
    label: 'Active session · amber',
    hint: 'Bar in amber, "Now ₺50 · Next ₺100"',
    apply: () => {
      resetStores();
      useSettingsStore.setState({ currency: 'TRY', warnThresholdMin: 15 });
      // Dilim sonuna 8 dk: amber eşiğinin içinde, para kutusu iki rakamı da taşıyor.
      const started = Date.now() - 52 * MIN;
      useSessionStore.setState({
        phase: 'active',
        session: session({ startedAtMs: started, recordedAtMs: started, tariff: TARIFF, floor: '3' }),
      });
    },
  },
  {
    key: 'celebration',
    frame: 3,
    label: 'Celebration · SAVED',
    hint: '"SAVED ₺50." + monthly total',
    apply: () => {
      resetStores();
      useSettingsStore.setState({ currency: 'TRY' });
      const started = Date.now() - 58 * MIN;
      useSessionStore.setState({
        phase: 'ended',
        session: session({ startedAtMs: started, recordedAtMs: started, endedAtMs: Date.now(), tariff: TARIFF }),
      });
    },
  },
  {
    key: 'finding-indoor',
    frame: 5,
    label: 'Find My Car · indoor',
    hint: 'Level 3 + photo card (not the compass)',
    apply: () => {
      resetStores();
      const started = Date.now() - 95 * MIN;
      useSessionStore.setState({
        phase: 'finding',
        // accuracyM yüksek = kapalı otopark: ekran pusula yerine foto+kat kartını seçer.
        session: session({
          startedAtMs: started,
          recordedAtMs: started,
          tariff: TARIFF,
          floor: '3',
          note: 'Mavi kolon, asansörün solu',
          photoUri: garagePhotoUri(),
          accuracyM: 65,
        }),
      });
    },
  },
  {
    key: 'poster',
    frame: 4,
    label: 'Typographic frame',
    hint: 'Not a product screen — full-screen poster (EN/TR)',
    // Poster ayrı bir tam ekran katman; ScreenshotSheet bu anahtarı özel ele alır.
    apply: () => undefined,
  },
  {
    key: 'tariff-scanned',
    frame: 6,
    label: 'Tariff · scan result',
    hint: 'Tiers read off the board, filled into the form',
    apply: () => {
      resetStores();
      useSettingsStore.setState({ currency: 'TRY' });
      const started = Date.now() - 3 * MIN;
      useSessionStore.setState({
        phase: 'parking',
        session: session({ startedAtMs: started, recordedAtMs: started, tariff: TARIFF, confirmed: false }),
        ocrState: 'idle',
      });
    },
  },
  {
    key: 'map-charging',
    frame: 7,
    label: 'Map · charging filter',
    hint: 'Charging filter on, pins visible',
    apply: () => {
      resetStores();
      useDiscoveryStore.setState({ pois: POIS, filter: 'charging', state: 'ready', radiusM: 1000 });
    },
  },
  {
    key: 'reset',
    frame: 0,
    label: 'Reset',
    hint: 'Clear the fake state, back to discovery',
    apply: resetStores,
  },
];
