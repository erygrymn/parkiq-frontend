import { create } from 'zustand';

// Geçici yüzey durumu (kalıcı değil): kök seviyede çizilen overlay'ler ve `finding` fazının
// canlı konumu. design.md İlke 9: foto ve AR, Modal değil kök overlay'dir; içerik sheet'ten
// bağımsız olarak tam ekranı kaplar.

export interface PhotoOrigin {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HistorySpot {
  id: string;
  latitude: number;
  longitude: number;
}

export interface UserFix {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

interface UiStore {
  /** Tam ekran foto: thumbnail'in ekran konumundan büyür. */
  photo: { uri: string; origin: PhotoOrigin } | null;
  openPhoto: (uri: string, origin: PhotoOrigin) => void;
  closePhoto: () => void;
  /** AR kamera overlay'i (yalnız `finding` fazında açılır). */
  arOpen: boolean;
  openAr: () => void;
  closeAr: () => void;
  /** `finding` fazında kullanıcının son GPS düzeltmesi. FindingSheet yazar; harita çizgisi ve AR okur. */
  userFix: UserFix | null;
  setUserFix: (fix: UserFix | null) => void;
  /** Panelin ekrandaki üst kenarı (px). Mapbox imzası bunun hemen üstüne oturur. */
  sheetTop: number;
  setSheetTop: (top: number) => void;
  /** §7.9 Geçmiş: kök sheet sahnesi. Noktalar haritada; seçili oturuma kamera uçar. */
  historyOpen: boolean;
  historySelectedId: string | null;
  historySpots: HistorySpot[];
  openHistory: () => void;
  closeHistory: () => void;
  selectHistory: (id: string | null) => void;
  setHistorySpots: (spots: HistorySpot[]) => void;
  /** Satın alma başarısı: paywall kapanır, geldiği ekranda `PRO.` damgası (§7.11). */
  proStampAt: number | null;
  showProStamp: () => void;
  clearProStamp: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
  photo: null,
  openPhoto: (uri, origin) => set({ photo: { uri, origin } }),
  closePhoto: () => set({ photo: null }),
  arOpen: false,
  openAr: () => set({ arOpen: true }),
  closeAr: () => set({ arOpen: false }),
  userFix: null,
  setUserFix: (fix) => set({ userFix: fix }),
  sheetTop: 0,
  setSheetTop: (top) => set({ sheetTop: top }),
  historyOpen: false,
  historySelectedId: null,
  historySpots: [],
  openHistory: () => set({ historyOpen: true, historySelectedId: null }),
  closeHistory: () => set({ historyOpen: false, historySelectedId: null }),
  selectHistory: (id) => set({ historySelectedId: id }),
  setHistorySpots: (spots) => set({ historySpots: spots }),
  proStampAt: null,
  showProStamp: () => set({ proStampAt: Date.now() }),
  clearProStamp: () => set({ proStampAt: null }),
}));
