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
  /**
   * Bitirme onayı (§7.8). Tek dokunuşla bitirmek yanlışlıkla basıldığında sayacı
   * sessizce kapatıyordu; onay panelin İÇİNDE bir blok olarak açılır, ayrı ekran yok.
   * AR'dan "buldum" da buraya düşer.
   */
  endConfirm: boolean;
  askEnd: () => void;
  cancelEnd: () => void;
  /** §7.9 Geçmiş: kök sheet sahnesi. Noktalar haritada; seçili oturuma kamera uçar. */
  historyOpen: boolean;
  historySelectedId: string | null;
  historySpots: HistorySpot[];
  openHistory: () => void;
  closeHistory: () => void;
  selectHistory: (id: string | null) => void;
  setHistorySpots: (spots: HistorySpot[]) => void;
  /**
   * Konum izni daveti bu OTURUMDA kapatıldı mı (§7.2).
   *
   * Kalıcı değil: kapatan kullanıcı uygulamayı bir daha açtığında davet geri
   * gelir. Kalıcı olsaydı bir kazara dokunuş izni sonsuza kadar gömerdi; her
   * açılışta ısrar etmek de ayrı bir sorun, o yüzden oturum ömrü.
   */
  locationInviteDismissed: boolean;
  dismissLocationInvite: () => void;
  /** Ekran görüntüsü posteri (§7.1 poster katmanı) — kök overlay, Modal değil. */
  posterOpen: boolean;
  openPoster: () => void;
  closePoster: () => void;
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
  endConfirm: false,
  askEnd: () => set({ endConfirm: true }),
  cancelEnd: () => set({ endConfirm: false }),
  historyOpen: false,
  historySelectedId: null,
  historySpots: [],
  openHistory: () => set({ historyOpen: true, historySelectedId: null }),
  closeHistory: () => set({ historyOpen: false, historySelectedId: null }),
  selectHistory: (id) => set({ historySelectedId: id }),
  setHistorySpots: (spots) => set({ historySpots: spots }),
  locationInviteDismissed: false,
  dismissLocationInvite: () => set({ locationInviteDismissed: true }),
  posterOpen: false,
  openPoster: () => set({ posterOpen: true }),
  closePoster: () => set({ posterOpen: false }),
  proStampAt: null,
  showProStamp: () => set({ proStampAt: Date.now() }),
  clearProStamp: () => set({ proStampAt: null }),
}));
