import { create } from 'zustand';
import { isIndoorLike } from '../lib/geo';
import { endSessionActivity, refreshSessionActivity, startSessionActivity } from '../lib/liveActivity';
import { captureCurrentPlace } from '../lib/location';
import { cancelSessionAlerts, notifyAutoParked, scheduleSessionAlerts } from '../lib/notifications';
import { scanTariffBoard } from '../lib/ocr';
import { captureSpotPhoto, deleteSpotPhoto } from '../lib/photo';
import type { Tariff } from '../lib/tariffMath';
import { usePremiumStore } from './premiumStore';
import { useSettingsStore } from './settingsStore';

// design.md §7 durum makinesi: idle | parking | active | ending | ended.
// Tek aktif oturum kuralı bağlayıcı; geçişler yalnız tanımlı fazlardan yapılır.
// Kalıcılık: her mutasyon SQLite'a yazılır (src/db/sessionRepo); cold start'ta
// hydrate() aktif oturumu geri yükler.

export type SessionPhase = 'idle' | 'parking' | 'active' | 'ending' | 'ended';
export type LocationState = 'idle' | 'capturing' | 'ok' | 'weak' | 'denied' | 'unavailable';
export type NotificationState = 'idle' | 'granted' | 'denied';
export type CameraState = 'idle' | 'ok' | 'denied';
export type OcrState = 'idle' | 'scanning' | 'not_detected' | 'unavailable' | 'locked' | 'failed';

export interface ParkSession {
  id: string;
  /** Tüm matematiğin kullandığı ETKİN başlangıç (backdate uygulanmış). */
  startedAtMs: number;
  /** Kullanıcının butona bastığı an — backdate bundan türer, değişmez. */
  recordedAtMs: number;
  endedAtMs: number | null;
  floor: string;
  note: string;
  tariff: Tariff | null;
  latitude: number | null;
  longitude: number | null;
  placeName: string | null;
  photoUri: string | null;
  /** Tarifeden bağımsız basit süre hatırlatıcısı (mutlak zaman). */
  reminderAtMs: number | null;
}

interface SessionStore {
  phase: SessionPhase;
  session: ParkSession | null;
  hydrated: boolean;
  locationState: LocationState;
  /** Aynı yere tekrar park edildiğinde önerilen önceki tarife (§7.3 hafıza). */
  suggestedTariff: Tariff | null;
  /**
   * Tarife forma DIŞARIDAN yazıldığında artar (öneri kabulü gibi). Form bunu key
   * olarak kullanıp kendini tazeler; kullanıcı yazarken artmaz, odak kaybolmaz.
   */
  externalTariffVersion: number;
  notificationState: NotificationState;
  cameraState: CameraState;
  ocrState: OcrState;
  hydrate: () => void;
  /** 2 saniye kuralı: dokunulduğu an kayıt biter; konum arkadan işlenir (§7.3). */
  park: () => void;
  setFloor: (floor: string) => void;
  setNote: (note: string) => void;
  setTariff: (tariff: Tariff | null) => void;
  /** Backdate: "X dk önce park ettim" — recordedAtMs'ten türer, birikmez. */
  setBackdateMinutes: (minutes: number) => void;
  /** Basit hatırlatıcı: başlangıçtan X dk sonra; 0 = kapalı. */
  setReminderMinutes: (minutes: number) => void;
  capturePhoto: () => void;
  removePhoto: () => void;
  /** §7.4 tarife panosu taraması; sonuç forma dışarıdan yazılır. */
  scanTariff: () => void;
  /** §7.4b oto-algılama tetiklediğinde çağrılır (premium). */
  autoPark: () => void;
  dismissAutoPark: () => void;
  /** Bu oturum oto-algılamayla mı başladı — yanlış algı geri alma satırı için. */
  autoDetected: boolean;
  acceptSuggestedTariff: () => void;
  dismissSuggestedTariff: () => void;
  confirmDetails: () => void;
  requestEnd: () => void;
  keep: () => void;
  confirmEnd: () => void;
  undoEnd: () => void;
  finish: () => void;
}

// Repo import'u fonksiyon içinde: testler saf mantığa native sqlite olmadan dokunur.
function repo() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('../db/sessionRepo') as typeof import('../db/sessionRepo');
}

function persist(session: ParkSession): void {
  try {
    repo().saveSession(session);
  } catch {
    // Kalıcılık başarısızsa oturum bellekte yaşamaya devam eder; sayaç durmaz.
  }
}

/**
 * Live Activity yaşam döngüsü. PREMIUM özelliktir: kilit kapalıysa hiç başlatılmaz.
 * Payload tamamen tariffMath çıktısından türer (§8 tek kaynak).
 */
function syncLiveActivity(action: 'start' | 'refresh' | 'end'): void {
  const session = useSessionStore.getState().session;
  if (!session) return;
  // §4.10: Live Activity / Dynamic Island / widget işletim sistemi yetenekleridir,
  // paywall arkasına ALINMAZ — sayaç ve dilim uyarıları gibi herkese açıktır.

  const threshold = useSettingsStore.getState().warnThresholdMin;
  if (action === 'end') {
    endSessionActivity(session, null);
    return;
  }
  if (action === 'start') startSessionActivity(session, threshold);
  else refreshSessionActivity(session, threshold);
}

/**
 * Dilim uyarılarını oturumun güncel haline göre yeniden kurar.
 * Tarife yoksa uyarı da yoktur — bu yüzden izin de İSTENMEZ (bağlamsal izin kuralı).
 */
function syncAlerts(
  session: ParkSession | null,
  prompt: boolean,
  set: (partial: Partial<SessionStore>) => void,
): void {
  // Uyarı kaynağı: tarife dilimleri VEYA basit süre hatırlatıcısı. İkisi de yoksa
  // kurulacak bir şey yok → izin de istenmez (bağlamsal izin kuralı).
  if (!session || session.endedAtMs !== null || (!session.tariff && session.reminderAtMs === null)) {
    void cancelSessionAlerts();
    return;
  }
  const threshold = useSettingsStore.getState().warnThresholdMin;
  void scheduleSessionAlerts(session, threshold, { prompt }).then((permission) => {
    set({ notificationState: permission === 'granted' ? 'granted' : 'denied' });
  });
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  phase: 'idle',
  session: null,
  hydrated: false,
  locationState: 'idle',
  suggestedTariff: null,
  externalTariffVersion: 0,
  notificationState: 'idle',
  cameraState: 'idle',
  ocrState: 'idle',
  autoDetected: false,

  hydrate: () => {
    if (get().hydrated) return;
    let active: ParkSession | null = null;
    try {
      active = repo().getActiveSession();
    } catch {
      active = null;
    }
    set(
      active
        ? { hydrated: true, phase: 'active', session: active, locationState: active.latitude === null ? 'idle' : 'ok' }
        : { hydrated: true },
    );
    // Soğuk açılışta uyarıları tazele ama izin sorma — kullanıcı app'i yeni açtı.
    if (active) syncAlerts(active, false, set);
  },

  park: () => {
    if (get().phase !== 'idle') return;
    const startedAtMs = Date.now();
    const session: ParkSession = {
      id: `p${startedAtMs}`,
      startedAtMs,
      recordedAtMs: startedAtMs,
      endedAtMs: null,
      floor: '',
      note: '',
      tariff: null,
      latitude: null,
      longitude: null,
      placeName: null,
      photoUri: null,
      reminderAtMs: null,
    };
    persist(session);
    set({ phase: 'parking', session, locationState: 'capturing', suggestedTariff: null });

    // Konum yakalama kaydı BLOKLAMAZ; sonuç geldiğinde oturuma işlenir.
    void captureCurrentPlace().then((outcome) => {
      const current = get().session;
      if (!current || current.id !== session.id) return; // oturum bitmiş/değişmiş
      if (outcome.status !== 'ok') {
        set({ locationState: outcome.status });
        return;
      }
      const next: ParkSession = {
        ...current,
        latitude: outcome.place.latitude,
        longitude: outcome.place.longitude,
        placeName: outcome.place.placeName,
      };
      persist(next);

      let remembered: Tariff | null = null;
      if (!next.tariff) {
        try {
          remembered = repo().findRememberedTariff(outcome.place.latitude, outcome.place.longitude);
        } catch {
          remembered = null;
        }
      }
      // Doğruluk kötüyse kapalı otopark sinyali: kullanıcıyı kat/foto eklemeye yönlendir.
      set({
        session: next,
        locationState: isIndoorLike(outcome.place.accuracyM) ? 'weak' : 'ok',
        suggestedTariff: remembered,
      });
    });
  },

  setFloor: (floor) => {
    const { session } = get();
    if (!session) return;
    const next = { ...session, floor };
    persist(next);
    set({ session: next });
  },

  setNote: (note) => {
    const { session } = get();
    if (!session) return;
    const next = { ...session, note };
    persist(next);
    set({ session: next });
  },

  setTariff: (tariff) => {
    const { session } = get();
    if (!session) return;
    const next = { ...session, tariff };
    persist(next);
    set({ session: next, suggestedTariff: null });
    syncAlerts(next, false, set); // izin, kullanıcı Done'a basınca istenir
  },

  setBackdateMinutes: (minutes) => {
    const { session } = get();
    if (!session) return;
    // Her zaman kayıt anından türer → tekrar seçimde birikmez.
    const startedAtMs = session.recordedAtMs - Math.max(0, minutes) * 60_000;
    const reminderAtMs =
      session.reminderAtMs === null
        ? null
        : startedAtMs + (session.reminderAtMs - session.startedAtMs);
    const next = { ...session, startedAtMs, reminderAtMs };
    persist(next);
    set({ session: next });
    syncAlerts(next, false, set); // sınırlar kaydı → uyarılar yeniden kurulur
  },

  setReminderMinutes: (minutes) => {
    const { session } = get();
    if (!session) return;
    const reminderAtMs = minutes <= 0 ? null : session.startedAtMs + minutes * 60_000;
    const next = { ...session, reminderAtMs };
    persist(next);
    set({ session: next });
    syncAlerts(next, false, set);
  },

  capturePhoto: () => {
    const { session } = get();
    if (!session) return;
    void captureSpotPhoto(session.id).then((outcome) => {
      const current = get().session;
      if (!current || current.id !== session.id) return;
      if (outcome.status === 'denied') {
        set({ cameraState: 'denied' });
        return;
      }
      if (outcome.status !== 'ok') return;
      const next = { ...current, photoUri: outcome.uri };
      persist(next);
      set({ session: next, cameraState: 'ok' });
    });
  },

  removePhoto: () => {
    const { session } = get();
    if (!session?.photoUri) return;
    deleteSpotPhoto(session.photoUri);
    const next = { ...session, photoUri: null };
    persist(next);
    set({ session: next });
  },

  /** §7.4b: araç bağlantısı koptu → konum kaydedilir, kullanıcıya sorulur. */
  autoPark: () => {
    if (get().phase !== 'idle') return; // tek oturum kuralı
    get().park();
    set({ autoDetected: true });
    void notifyAutoParked();
  },

  /** §7.4b yanlış algı: kullanıcı "ben park etmedim" derse kayıt tamamen silinir. */
  dismissAutoPark: () => {
    const { session, autoDetected } = get();
    if (!session || !autoDetected) return;
    if (session.photoUri) deleteSpotPhoto(session.photoUri);
    try {
      repo().deleteSession(session.id);
    } catch {
      /* silinemezse bellek durumu yine sıfırlanır */
    }
    void cancelSessionAlerts();
    set({ phase: 'idle', session: null, autoDetected: false, suggestedTariff: null });
  },

  scanTariff: () => {
    const { session, phase } = get();
    if (!session || phase === 'ended') return;
    // Tarife panosu tarama premium (ürün kararı): kilitliyse paywall köprüsü.
    if (!usePremiumStore.getState().isPremium) {
      set({ ocrState: 'locked' });
      return;
    }

    set({ ocrState: 'scanning' });
    void scanTariffBoard(useSettingsStore.getState().currency).then((outcome) => {
      const current = get().session;
      if (!current || current.id !== session.id) return;

      if (outcome.status === 'denied') {
        set({ ocrState: 'idle', cameraState: 'denied' });
        return;
      }
      if (outcome.status === 'canceled') {
        set({ ocrState: 'idle' });
        return;
      }
      if (outcome.status !== 'ok') {
        set({ ocrState: outcome.status });
        return;
      }

      const next = { ...current, tariff: outcome.tariff };
      persist(next);
      set({
        session: next,
        ocrState: 'idle',
        suggestedTariff: null,
        externalTariffVersion: get().externalTariffVersion + 1,
      });
      syncAlerts(next, false, set);
    });
  },

  acceptSuggestedTariff: () => {
    const { session, suggestedTariff, externalTariffVersion } = get();
    if (!session || !suggestedTariff) return;
    const next = { ...session, tariff: suggestedTariff };
    persist(next);
    set({ session: next, suggestedTariff: null, externalTariffVersion: externalTariffVersion + 1 });
    syncAlerts(next, false, set);
  },

  dismissSuggestedTariff: () => set({ suggestedTariff: null }),

  confirmDetails: () => {
    if (get().phase !== 'parking') return;
    set({ phase: 'active' });
    // Kullanıcı hatırlatıcısını burada onaylamış olur → izin tam bu anda istenir.
    syncAlerts(get().session, true, set);
    syncLiveActivity('start');
  },

  requestEnd: () => {
    if (get().phase === 'active') set({ phase: 'ending' });
  },

  keep: () => {
    if (get().phase === 'ending') set({ phase: 'active' });
  },

  confirmEnd: () => {
    const { phase, session } = get();
    if (phase !== 'ending' || !session) return;
    const next = { ...session, endedAtMs: Date.now() };
    persist(next);
    set({ phase: 'ended', session: next });
    void cancelSessionAlerts(); // §8.4: oturum bitince zamanlanmış uyarılar iptal
    syncLiveActivity('end');
  },

  undoEnd: () => {
    const { phase, session } = get();
    if (phase !== 'ended' || !session) return;
    const next = { ...session, endedAtMs: null };
    persist(next);
    set({ phase: 'active', session: next });
    syncAlerts(next, false, set); // Undo → uyarılar geri kurulur
  },

  finish: () => {
    // Kayıt geçmişte kalır (endedAtMs dolu); yalnız bellek durumu sıfırlanır.
    if (get().phase !== 'ended') return;
    set({
      phase: 'idle',
      session: null,
      locationState: 'idle',
      suggestedTariff: null,
      notificationState: 'idle',
    });
    void cancelSessionAlerts();
  },
}));
