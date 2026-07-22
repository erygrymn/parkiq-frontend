import { create } from 'zustand';
import { distanceMeters, type Coords } from '../lib/geo';
import { applyFilter, fetchNearbyParking, type ParkingPoi, type PoiFilter } from '../lib/parkingPoi';

// §7.2 Keşif: yakındaki otopark/şarj noktaları. Veri OSM Overpass'tan gelir,
// kendi sunucumuza uğramaz. Sonuç bellekte tutulur; merkez değişince tazelenir.

export type DiscoveryState = 'idle' | 'loading' | 'ready' | 'error';

interface DiscoveryStore {
  state: DiscoveryState;
  pois: ParkingPoi[];
  filter: PoiFilter;
  /** Sonuçların ait olduğu merkez — gereksiz tekrar sorguyu engeller. */
  center: Coords | null;
  setFilter: (filter: PoiFilter) => void;
  load: (center: Coords) => void;
  visiblePois: () => ParkingPoi[];
}

/** Merkez bu kadar kaydıysa yeniden sorgula (metre). */
const REFRESH_DISTANCE_M = 400;

let inFlight: AbortController | null = null;

export const useDiscoveryStore = create<DiscoveryStore>((set, get) => ({
  state: 'idle',
  pois: [],
  filter: 'all',
  center: null,

  setFilter: (filter) => set({ filter }),

  load: (center) => {
    const { center: previous, state } = get();
    if (state === 'loading') return;
    if (previous && distanceMeters(previous, center) < REFRESH_DISTANCE_M && get().pois.length > 0) {
      return;
    }

    inFlight?.abort();
    inFlight = new AbortController();
    set({ state: 'loading' });

    void fetchNearbyParking(center, undefined, inFlight.signal).then((pois) => {
      if (pois === null) {
        set({ state: 'error' });
        return;
      }
      set({ state: 'ready', pois, center });
    });
  },

  visiblePois: () => applyFilter(get().pois, get().filter),
}));
