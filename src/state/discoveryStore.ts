import { create } from 'zustand';
import { distanceMeters, type Coords } from '../lib/geo';
import {
  applyFilter,
  DEFAULT_RADIUS_M,
  fetchNearbyParking,
  type ParkingPoi,
  type PoiFilter,
} from '../lib/parkingPoi';

// §7.2 Keşif: yakındaki otopark/şarj noktaları. Veri OSM Overpass'tan gelir,
// kendi sunucumuza uğramaz. Sonuç bellekte tutulur; merkez değişince tazelenir.

export type DiscoveryState = 'idle' | 'loading' | 'ready' | 'error';

interface DiscoveryStore {
  state: DiscoveryState;
  pois: ParkingPoi[];
  filter: PoiFilter;
  /** Arama yarıçapı (metre) — filtre popup'ından ayarlanır. */
  radiusM: number;
  setRadius: (radiusM: number) => void;
  /** Sonuçların ait olduğu merkez — gereksiz tekrar sorguyu engeller. */
  center: Coords | null;
  /**
   * Kamera niyeti iki ayrı sinyaldir çünkü davranışları zıt:
   * - PIN: sabit bir koordinata git ve orada DUR (arama sonucu). Takibi keser.
   * - FOLLOW: kullanıcıyı takip etmeye dön (konuma dön butonu / ilk açılış).
   * Token'lar her istekte artar; harita bunları izler, `followUserLocation`
   * ile kontrollü zoom'un çakışması yüzünden takip kilitleniyordu.
   */
  pinTarget: Coords | null;
  pinToken: number;
  followToken: number;
  /** Haritada seçili otopark — keşif paneli yerine o kartı gösterir. */
  selectedPoiId: string | null;
  selectPoi: (id: string | null) => void;
  setFilter: (filter: PoiFilter) => void;
  load: (center: Coords) => void;
  /** Sabit koordinata git + orada otopark ara (arama sonucu, POI). */
  pinTo: (center: Coords) => void;
  /** Kullanıcıyı takibe dön (konuma dön butonu). */
  requestFollow: () => void;
  visiblePois: () => ParkingPoi[];
}

/** Merkez bu kadar kaydıysa yeniden sorgula (metre). */
const REFRESH_DISTANCE_M = 400;

let inFlight: AbortController | null = null;

export const useDiscoveryStore = create<DiscoveryStore>((set, get) => ({
  state: 'idle',
  pois: [],
  filter: 'all',
  radiusM: DEFAULT_RADIUS_M,
  center: null,
  pinTarget: null,
  pinToken: 0,
  followToken: 0,
  selectedPoiId: null,

  selectPoi: (id) => set({ selectedPoiId: id }),

  setFilter: (filter) => set({ filter }),

  setRadius: (radiusM) => {
    if (radiusM === get().radiusM) return;
    // Yarıçap değişince eldeki sonuçlar artık soruyu yanıtlamıyor: merkezi
    // koruyup yeniden sor.
    const center = get().center;
    set({ radiusM, center: null });
    if (center) get().load(center);
  },

  pinTo: (center) => {
    set({ pinTarget: center, pinToken: get().pinToken + 1 });
    get().load(center);
  },

  requestFollow: () => set({ followToken: get().followToken + 1 }),

  load: (center) => {
    const { center: previous, state } = get();
    if (state === 'loading') return;
    if (previous && distanceMeters(previous, center) < REFRESH_DISTANCE_M && get().pois.length > 0) {
      return;
    }

    inFlight?.abort();
    inFlight = new AbortController();
    set({ state: 'loading' });

    void fetchNearbyParking(center, get().radiusM, inFlight.signal).then((pois) => {
      if (pois === null) {
        set({ state: 'error' });
        return;
      }
      set({ state: 'ready', pois, center });
    });
  },

  visiblePois: () => applyFilter(get().pois, get().filter),
}));
