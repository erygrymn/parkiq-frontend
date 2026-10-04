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
  /**
   * Yalnız ARAMA sonucu artar. `pinToken` bunun için kullanılamıyor: listeden bir
   * otoparka dokunmak da pin atıyor ve orada panelin yükselmesi istenmiyor —
   * kullanıcı o an kartı ve haritayı görmek istiyor.
   */
  searchToken: number;
  /** Haritada seçili otopark — keşif paneli yerine o kartı gösterir. */
  selectedPoiId: string | null;
  selectPoi: (id: string | null) => void;
  setFilter: (filter: PoiFilter) => void;
  load: (center: Coords, force?: boolean) => void;
  /** Sabit koordinata git + orada otopark ara (liste satırı, POI seçimi). `force`: arama. */
  pinTo: (center: Coords, force?: boolean) => void;
  /** Arama sonucuna git: pin + oranın otoparkları + panel yarı açık. */
  pinToSearch: (center: Coords) => void;
  /** Harita elle kaydırıldı: yeni merkezin otoparklarını getir. */
  panTo: (center: Coords) => void;
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
  searchToken: 0,
  selectedPoiId: null,

  selectPoi: (id) => set({ selectedPoiId: id }),

  setFilter: (filter) => set({ filter }),

  setRadius: (radiusM) => {
    if (radiusM === get().radiusM) return;
    // Yarıçap değişince eldeki sonuçlar artık soruyu yanıtlamıyor. `force`
    // şart: sürmekte olan bir sorgu varsa normal `load` sessizce vazgeçiyor ve
    // yeni yarıçap hiç sorulmuyordu.
    const center = get().center;
    set({ radiusM, center: null });
    if (center) get().load(center, true);
  },

  pinTo: (center, force = false) => {
    set({ pinTarget: center, pinToken: get().pinToken + 1 });
    get().load(center, force);
  },

  pinToSearch: (center) => {
    set({ pinTarget: center, pinToken: get().pinToken + 1, searchToken: get().searchToken + 1 });
    // `force`: aranan yer eldeki merkeze yakınsa `load` sessizce vazgeçiyor ve
    // kullanıcı "aradım ama bir şey çıkmadı" görüyordu. Arama her zaman sorar.
    get().load(center, true);
  },

  /**
   * Haritayı elle kaydırmak da bir arama niyetidir — kullanıcı oraya bakıyor.
   * Önceden yalnız kullanıcının KENDİ konumu ve arama sonucu sorgu tetikliyordu,
   * bu yüzden haritayı bir semte kaydırınca orası boş kalıyordu.
   */
  panTo: (center) => {
    const { center: previous, pois } = get();
    // Yakın kaydırma eldeki sonuçlarla zaten kaplı (sorgu yarıçapı 1 km).
    if (previous && distanceMeters(previous, center) < REFRESH_DISTANCE_M && pois.length > 0) return;
    // Elle kaydırma EN SON niyettir: süren bir sorgu (açılıştaki konum sorgusu gibi) varsa
    // iptal edilip buraya sorulur. Normal `load` sürende vazgeçiyordu ve kaydırılan yer boş kalıyordu.
    get().load(center, true);
  },

  requestFollow: () => set({ followToken: get().followToken + 1 }),

  load: (center, force = false) => {
    const { center: previous, state } = get();
    if (state === 'loading' && !force) return;
    // `force` (arama) yakın mesafe atlamasını da geçer: mesafeler yeni merkeze göre yeniden
    // hesaplanmalı, aranan yerin çevresi en yakından sıralanmalı.
    if (!force && previous && distanceMeters(previous, center) < REFRESH_DISTANCE_M && get().pois.length > 0) {
      return;
    }

    inFlight?.abort();
    const controller = new AbortController();
    inFlight = controller;
    set({ state: 'loading' });

    void fetchNearbyParking(center, get().radiusM, controller.signal).then((pois) => {
      // Yerine yenisi başlatılmış (iptal edilmiş) istek sonuç yazmaz: iptalin `null`ı
      // 'error' diye yazılıyordu ve yeni sorgu sürerken "yüklenemedi" satırı çıkıyordu.
      if (inFlight !== controller) return;
      inFlight = null;
      if (pois === null) {
        set({ state: 'error' });
        return;
      }
      // Seçili otopark yeni sonuçlarda yoksa seçim düşer: kart sebepsiz kaybolup sonra
      // kendiliğinden geri gelmesin.
      const selected = get().selectedPoiId;
      set({
        state: 'ready',
        pois,
        center,
        ...(selected !== null && !pois.some((poi) => poi.id === selected) ? { selectedPoiId: null } : null),
      });
    });
  },

  visiblePois: () => applyFilter(get().pois, get().filter, get().radiusM),
}));
