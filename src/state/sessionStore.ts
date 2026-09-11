import { create } from 'zustand';
import { useDiscoveryStore } from './discoveryStore';
import {
  trackParkEnded,
  trackParkStarted,
  trackTariffScan,
} from '../lib/analytics';
import { computeExitSummary } from '../lib/tariffMath';
import { isIndoorLike } from '../lib/geo';
import {
  clearSessionSurfaces,
  endSessionActivity,
  isLiveActivityRunning,
  refreshSessionActivity,
  startSessionActivity,
  syncWidget,
} from '../lib/liveActivity';
import { captureCurrentPlace, describeCoords } from '../lib/location';
import { askAutoParked, cancelSessionAlerts, scheduleSessionAlerts } from '../lib/notifications';
import { scanTariffBoard } from '../lib/ocr';
import type { ScheduleKind } from '../lib/tariffSchedule';
import { captureSpotPhoto, deleteSpotPhoto } from '../lib/photo';
import type { Tariff } from '../lib/tariffMath';
import {
  fetchPooledTariff,
  makeInstallSalt,
  resolveSpotId,
  submitTariff,
  submitterHash,
  type PooledTariff,
  type TariffSource,
} from '../lib/tariffPool';
import { usePremiumStore } from './premiumStore';
import { useSettingsStore } from './settingsStore';

// design.md §7 durum makinesi: idle | parking | active | ending | ended.
// Tek aktif oturum kuralı bağlayıcı; geçişler yalnız tanımlı fazlardan yapılır.
// Kalıcılık: her mutasyon SQLite'a yazılır (src/db/sessionRepo); cold start'ta
// hydrate() aktif oturumu geri yükler.

/** Haritadan pin bırakmayı kim başlattı — dönüşte o yüzeye geri dönülür. */
export type PickTarget = 'park' | 'filter';

/** Sürenin neye göre sayıldığı — hatırlatıcının anlaşılmamasının asıl sebebi. */
export type ReminderAnchor = 'afterPark' | 'beforeFirstTier' | 'beforeEveryTier';

/** Uyarının nasıl geleceği. */
export type ReminderKind = 'notification' | 'alarm' | 'both';

export interface Reminder {
  anchor: ReminderAnchor;
  /** `afterPark` için park anından SONRA, diğerlerinde artıştan ÖNCE. */
  minutes: number;
  kind: ReminderKind;
}

export type SessionPhase = 'idle' | 'parking' | 'active' | 'finding' | 'ended';
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
  /**
   * Hatırlatıcı. Üç parça, çünkü tek bir "kaç dakika" alanı iki ayrı soruyu
   * temsil ediyordu ve hangisi olduğu ekrandan anlaşılmıyordu: süre park
   * anından mı sayılıyor, yoksa fiyat artışından geriye mi?
   */
  reminder: Reminder | null;
  /**
   * Tarife hangi takvimden okundu (hafta içi/sonu, gündüz/gece). Oturum o
   * takvimin dışına taşarsa fiyat artık geçerli değildir — sessizce yeniden
   * hesaplamak yerine kullanıcıya söylenir.
   */
  tariffSchedule?: ScheduleKind | null;
  /**
   * Kaydın alındığı andaki GPS doğruluğu (metre). Elle işaretlenmişse 0 —
   * kullanıcının haritada gösterdiği nokta elimizdeki en doğru veridir.
   * Find My Car kapalı otopark kararını BUNA bakarak verir: dönüş anındaki
   * canlı doğruluk (açık gökyüzü) kaydın doğruluğunu temsil etmez.
   */
  accuracyM: number | null;
  /**
   * Kullanıcı park formunu "Bitti" ile onayladı mı.
   *
   * Onaylanmamış kayıt soğuk açılışta aktif oturum sayılmamalı: park formunda
   * app kapandığında sayaç eski başlangıçtan işlemeye devam ediyor, kullanıcı
   * "Park Ettim"e basıyor ve hiçbir şey olmuyordu.
   */
  confirmed: boolean;
}

/** Onaylanmamış kayıt bu süreden eskiyse terk edilmiş sayılır ve silinir. */
const ABANDONED_AFTER_MS = 12 * 60 * 60 * 1000;

interface SessionStore {
  phase: SessionPhase;
  session: ParkSession | null;
  hydrated: boolean;
  locationState: LocationState;
  /** Aynı yere tekrar park edildiğinde önerilen önceki tarife (§7.3 hafıza). */
  suggestedTariff: Tariff | null;
  /** Aynı yerdeki son oturumun katı; park anı kat sorusunda ilk çip. */
  suggestedFloor: string | null;
  /**
   * Havuzdan gelen öneri: bu otoparka park etmiş sürücülerin en çok girdiği tarife
   * (§ tarife havuzu). Veri yoksa null kalır ve öneri satırı hiç çıkmaz.
   */
  pooledTariff: PooledTariff | null;
  /** Otoparkın havuzdaki kimliği; hem öneriyi sormak hem gönderim için aynı değer. */
  spotId: string | null;
  /** Tarifenin nereden geldiği — panelde "elle mi, taramadan mı, öneriden mi" ayrımı. */
  tariffSource: TariffSource;
  /**
   * Tarife forma DIŞARIDAN yazıldığında artar (öneri kabulü gibi). Form bunu key
   * olarak kullanıp kendini tazeler; kullanıcı yazarken artmaz, odak kaybolmaz.
   */
  externalTariffVersion: number;
  notificationState: NotificationState;
  cameraState: CameraState;
  ocrState: OcrState;
  /** OCR birden fazla tarifeli panoda hangisini seçti — kullanıcıya söylenir. */
  ocrSchedule: ScheduleKind | null;
  /** Tarife satırına benzeyen bazı satırlar okunamadıysa true — kullanıcı kontrol etsin. */
  ocrPartial: boolean;
  hydrate: () => void;
  /** 2 saniye kuralı: dokunulduğu an kayıt biter; konum arkadan işlenir (§7.3). */
  park: () => void;
  setFloor: (floor: string) => void;
  setNote: (note: string) => void;
  /**
   * Park konumunu elle değiştirir. Sayaç başlatılırken kullanıcı başka yerde
   * olabiliyor ("arabayı bıraktım, yürüdüm, sonra başlattım"); varsayılan hâlâ
   * o anki konumdur ama başlatmadan önce düzeltilebilir.
   */
  setParkLocation: (place: { latitude: number; longitude: number; placeName: string | null }) => void;
  /** "Konumumu kullan" — gecikmeli sonucun daha yeni bir düzeltmeyi ezmemesi için store'da. */
  useMyLocationForPark: () => void;
  /**
   * Kullanıcı konumu kendi belirledi mi. Park anında başlatılan GPS yakalaması
   * saniyeler sonra dönüyor; o sırada kullanıcı pini arabanın üstüne taşımışsa
   * geciken sonuç düzeltmeyi SESSİZCE geri alıyordu. Yavaş fix tam olarak
   * kapalı otoparkta oluyor — yani düzeltmenin en çok gerektiği yerde.
   */
  locationPinnedByUser: boolean;
  /** Her kullanıcı düzeltmesinde artar; gecikmeli işler buna bakıp vazgeçer. */
  locationEditSeq: number;
  /**
   * Haritadan pin bırakma modu — harita ortasındaki artı işareti konumu belirler.
   * Değer aynı zamanda AÇANI söyler: seçim bitince o popup geri açılır.
   */
  pickingLocation: PickTarget | null;
  /** Pin modundayken haritanın o anki merkezi. */
  pickedCenter: { latitude: number; longitude: number } | null;
  /** Seçim bitti: bu popup yeniden açılmalı. Tek kullanımlık işaret. */
  reopenAfterPick: PickTarget | null;
  clearReopenAfterPick: () => void;
  startPickingLocation: (target?: PickTarget) => void;
  setPickedCenter: (coords: { latitude: number; longitude: number }) => void;
  cancelPickingLocation: () => void;
  confirmPickedLocation: () => void;
  setTariff: (tariff: Tariff | null) => void;
  /** Backdate: "X dk önce park ettim" — recordedAtMs'ten türer, birikmez. */
  setBackdateMinutes: (minutes: number) => void;
  /** Hatırlatıcıyı kurar; null = kapalı. */
  setReminder: (reminder: Reminder | null) => void;
  capturePhoto: () => void;
  removePhoto: () => void;
  /** §7.4 tarife panosu taraması; sonuç forma dışarıdan yazılır. */
  scanTariff: () => void;
  /** §7.4b oto-algılama tetiklediğinde çağrılır (premium): yalnız sorar. */
  autoPark: () => void;
  /** Bildirimden gelen onay: kopuş anının konumu ve zamanıyla oturumu başlatır. */
  parkAt: (place: { latitude: number; longitude: number; atMs: number }) => void;
  dismissAutoPark: () => void;
  /** Park formundan çıkış: kayıt silinir, keşfe dönülür. */
  cancelPark: () => void;
  /** Bu oturum oto-algılamayla mı başladı — yanlış algı geri alma satırı için. */
  autoDetected: boolean;
  acceptSuggestedTariff: () => void;
  /** Havuzdan gelen öneriyi tarife olarak uygular. */
  acceptPooledTariff: () => void;
  dismissSuggestedTariff: () => void;
  confirmDetails: () => void;
  /** §7.6 Arabamı Bul bir sheet fazıdır: active ↔ finding. */
  startFinding: () => void;
  stopFinding: () => void;
  /**
   * Tek dokunuşla biter (active|finding → ended); geri alma kutlama kapağındaki Undo (§7.8).
   * `endedAtMs`: kilit ekranı düğmesinden gelen bitiş anı — app sonradan açılsa da süre doğru kalır.
   */
  endSession: (endedAtMs?: number) => void;
  undoEnd: () => void;
  /** Ön plana dönüşte kilit ekranı kartını yaşayan duruma getirir. */
  resumeLiveActivity: () => void;
  finish: () => void;
  /** Geçmişten tek kaydı siler (fotoğrafıyla birlikte). */
  deleteEndedSession: (id: string) => void;
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
 * Live Activity yaşam döngüsü. Payload tamamen tariffMath çıktısından türer
 * (§8 tek kaynak); görünen metinler liveActivity.ts'te dile çevrilir.
 */
function syncLiveActivity(action: 'start' | 'refresh' | 'end'): void {
  const session = useSessionStore.getState().session;
  if (!session) return;
  // §4.10: Live Activity / Dynamic Island / widget işletim sistemi yetenekleridir,
  // paywall arkasına ALINMAZ — sayaç ve dilim uyarıları gibi herkese açıktır.

  const threshold = useSettingsStore.getState().warnThresholdMin;
  if (action === 'end') {
    endSessionActivity(session);
    return;
  }
  if (action === 'start') startSessionActivity(session, threshold);
  else refreshSessionActivity(session, threshold);
}

/**
 * Oturum yaşarken yapılan her düzenleme (kat, not, tarife, geri tarihleme, konum)
 * kilit ekranı kartına ve widget'a anında yansır. Eskiden yalnız 60 sn'lik ön plan
 * turunda güncelleniyordu; kullanıcı katı girip telefonu kilitleyince kart boş kalıyordu.
 */
function refreshActivityIfLive(): void {
  const phase = useSessionStore.getState().phase;
  if (phase === 'active' || phase === 'finding') syncLiveActivity('refresh');
}

/**
 * Tarife havuzuna gönderim (§ tarife havuzu).
 *
 * Yalnız oturum GERÇEKTEN başlarken, yalnız elde bir tarife ve bir otopark kimliği
 * varken çalışır. Kurulum tuzu cihazda kalır; sunucuya giden değer ondan ve otopark
 * kimliğinden türetilmiş kısa bir özettir, iki farklı otoparktaki gönderimi
 * birbirine bağlamaya yetmez.
 */
function submitToPool(session: ParkSession, spotId: string | null, source: TariffSource): void {
  if (!useSettingsStore.getState().tariffPoolEnabled) return;
  if (!session.tariff || !spotId || session.latitude === null || session.longitude === null) return;
  let salt = '';
  try {
    salt = repo().readSetting('poolSalt') ?? '';
    if (salt === '') {
      salt = makeInstallSalt();
      repo().writeSetting('poolSalt', salt);
    }
  } catch {
    return; // Tuz okunamıyorsa gönderme: sayaç şişer.
  }
  void submitTariff({
    spotId,
    name: session.placeName,
    coords: { latitude: session.latitude, longitude: session.longitude },
    tariff: session.tariff,
    source,
    submitter: submitterHash(salt, spotId),
  });
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
  if (!session || session.endedAtMs !== null || (!session.tariff && session.reminder === null)) {
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
  suggestedFloor: null,
  pooledTariff: null,
  spotId: null,
  tariffSource: 'manual',
  externalTariffVersion: 0,
  notificationState: 'idle',
  cameraState: 'idle',
  ocrState: 'idle',
  ocrSchedule: null,
  ocrPartial: false,
  pickingLocation: null,
  pickedCenter: null,
  reopenAfterPick: null,
  autoDetected: false,
  locationPinnedByUser: false,
  locationEditSeq: 0,

  hydrate: () => {
    if (get().hydrated) return;
    let active: ParkSession | null = null;
    try {
      /* Aynı anda TEK aktif oturum kuralı: birden fazla açık kayıt ancak bir yazım
         hatasından doğar (eski sürümlerde bitiş anı NaN olunca kayıt açık kalıyordu).
         En yenisi tutulur, geri kalan yetimler silinir — yoksa her açılışta sırayla
         geri gelip "park bitmiyor" gibi görünüyorlar. */
      const open = repo().listOpenSessions();
      active = open.length > 0 ? open[0] : null;
      for (const orphan of open.slice(1)) {
        if (orphan.photoUri) deleteSpotPhoto(orphan.photoUri);
        repo().deleteSession(orphan.id);
      }
    } catch {
      active = null;
    }

    // Onaylanmamış kayıt: kullanıcı formu bitirmeden çıkmış. Çok eskiyse terk
    // edilmiştir — sessizce silinir, yoksa bir daha hiç açılmayan bir sayaç
    // olarak geri geliyor. Yeniyse form kaldığı yerden açılır.
    if (active && !active.confirmed && Date.now() - active.recordedAtMs > ABANDONED_AFTER_MS) {
      try {
        if (active.photoUri) deleteSpotPhoto(active.photoUri);
        repo().deleteSession(active.id);
      } catch {
        /* silinemezse aşağıdaki dal onu forma alır */
      }
      active = null;
    }

    // Aktif oturum yoksa hayalet alarm, hayalet kilit ekranı kartı ve hayalet widget
    // sayacı da olmamalı: app öldürülmüşken oturum silinmiş ya da bitmiş olabilir.
    if (!active) {
      void cancelSessionAlerts();
      clearSessionSurfaces();
    }

    set(
      active
        ? {
            hydrated: true,
            // Onaylanmamışsa sayaç ekranı DEĞİL, form açılır: kullanıcı ya
            // tamamlar ya paneli aşağı çekip kaydı siler.
            phase: active.confirmed ? 'active' : 'parking',
            session: active,
            // Kaydın kendi doğruluğu geri yüklenir: soğuk açılış 'weak' işaretini
            // eskiden siliyordu ve oturum sonuna kadar bir daha görünmüyordu.
            locationState:
              active.latitude === null ? 'unavailable' : isIndoorLike(active.accuracyM) ? 'weak' : 'ok',
          }
        : { hydrated: true },
    );
    if (active) {
      // Soğuk açılışta uyarıları tazele ama izin sorma — kullanıcı app'i yeni açtı.
      syncAlerts(active, false, set);
      // Widget/Live Activity'yi gerçek duruma getir: app yeniden açıldığında (veya
      // ilk widget yerleştirildiğinde) paylaşılan kutu boşsa widget "park edilmemiş"
      // kalıyordu. `start` idempotent (mevcut LA'yı kapatıp yeniden kurar) ve
      // paylaşılan kutuya da yazar — bu yüzden refresh değil start.
      syncLiveActivity('start');
    } else {
      // Oturum yokken de kutuyu tazele: widget dil metinlerini ve aylık
      // tasarrufu buradan alır, aksi halde ilk kurulumda İngilizce kalır.
      syncWidget(null);
    }
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
      reminder: null,
      tariffSchedule: null,
      accuracyM: null,
      confirmed: false,
    };
    persist(session);
    set({
      phase: 'parking',
      session,
      locationState: 'capturing',
      suggestedTariff: null,
      suggestedFloor: null,
      pooledTariff: null,
      spotId: null,
      tariffSource: 'manual',
      locationPinnedByUser: false,
    });
    trackParkStarted(get().autoDetected ? 'auto' : 'manual');

    // Konum yakalama kaydı BLOKLAMAZ; sonuç geldiğinde oturuma işlenir.
    void captureCurrentPlace().then((outcome) => {
      const current = get().session;
      if (!current || current.id !== session.id) return; // oturum bitmiş/değişmiş
      // Kullanıcı bu arada konumu kendi belirlediyse geciken GPS onu EZMEZ.
      if (get().locationPinnedByUser) return;
      if (outcome.status !== 'ok') {
        set({ locationState: outcome.status });
        return;
      }
      const next: ParkSession = {
        ...current,
        latitude: outcome.place.latitude,
        longitude: outcome.place.longitude,
        placeName: outcome.place.placeName,
        accuracyM: outcome.place.accuracyM,
      };
      persist(next);

      let remembered: Tariff | null = null;
      let rememberedFloor: string | null = null;
      try {
        if (!next.tariff) remembered = repo().findRememberedTariff(outcome.place.latitude, outcome.place.longitude);
        if (!next.floor) rememberedFloor = repo().findRememberedFloor(outcome.place.latitude, outcome.place.longitude);
      } catch {
        remembered = null;
        rememberedFloor = null;
      }
      // Doğruluk kötüyse kapalı otopark sinyali: kullanıcıyı kat/foto eklemeye yönlendir.
      set({
        session: next,
        locationState: isIndoorLike(outcome.place.accuracyM) ? 'weak' : 'ok',
        suggestedTariff: remembered,
        suggestedFloor: rememberedFloor,
      });

      // Havuz: otoparkı OSM kimliğiyle eşle, o kimlik için en çok girilen tarifeyi sor.
      // Ağ beklenmez — cevap gelirse soru ekranında bir çip daha belirir, gelmezse hiçbir şey.
      // Kapatan kullanıcıya hiç sorulmaz: ne gönderir ne öneri görür.
      if (!useSettingsStore.getState().tariffPoolEnabled) return;
      const spot = resolveSpotId(outcome.place, useDiscoveryStore.getState().pois);
      set({ spotId: spot.id });
      const currency = useSettingsStore.getState().currency;
      void fetchPooledTariff(spot.id, currency).then((pooled) => {
        const live = get().session;
        if (!live || live.id !== session.id || get().phase !== 'parking') return;
        // Kullanıcı bu arada kendi tarifesini girdiyse öneri araya girmez.
        if (live.tariff) return;
        set({ pooledTariff: pooled });
      });
    });
  },

  setFloor: (floor) => {
    const { session } = get();
    if (!session) return;
    const next = { ...session, floor };
    persist(next);
    set({ session: next });
    refreshActivityIfLive();
  },

  setNote: (note) => {
    const { session } = get();
    if (!session) return;
    const next = { ...session, note };
    persist(next);
    set({ session: next });
    refreshActivityIfLive();
  },

  setTariff: (tariff) => {
    const { session } = get();
    if (!session) return;
    const next = { ...session, tariff };
    persist(next);
    // Elle girilen tarife öneriyi geçersiz kılar: kullanıcı panoyu okumuş demektir.
    set({ session: next, suggestedTariff: null, pooledTariff: null, tariffSource: 'manual' });
    refreshActivityIfLive();
    syncAlerts(next, false, set); // izin, kullanıcı Done'a basınca istenir
  },

  setBackdateMinutes: (minutes) => {
    const { session } = get();
    if (!session) return;
    // Her zaman kayıt anından türer → tekrar seçimde birikmez. Hatırlatıcı artık
    // mutlak zaman değil kural olduğu için başlangıç kaymasıyla kendiliğinden taşınır.
    const startedAtMs = session.recordedAtMs - Math.max(0, minutes) * 60_000;
    const next = { ...session, startedAtMs };
    persist(next);
    set({ session: next });
    refreshActivityIfLive();
    syncAlerts(next, false, set); // sınırlar kaydı → uyarılar yeniden kurulur
  },

  setReminder: (reminder) => {
    const { session } = get();
    if (!session) return;
    const next = { ...session, reminder };
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

  /**
   * §7.4b: CarPlay bağlantısı koptu. Oturum AÇILMAZ — kopuş noktası bildirimle
   * sorulur. Böylece yanlış algı geriye hayalet kayıt bırakmaz ve kullanıcı
   * "ben park etmedim" demek için hiçbir şey temizlemek zorunda kalmaz.
   */
  autoPark: () => {
    if (get().phase !== 'idle') return; // tek oturum kuralı
    const atMs = Date.now();
    void captureCurrentPlace().then((outcome) => {
      if (outcome.status !== 'ok') return;
      void askAutoParked({
        latitude: outcome.place.latitude,
        longitude: outcome.place.longitude,
        atMs,
      });
    });
  },

  parkAt: ({ latitude, longitude, atMs }) => {
    if (get().phase !== 'idle') return;
    get().park();
    const session = get().session;
    if (!session) return;
    // Kayıt anı kopuş anıdır: kullanıcı bildirime dakikalar sonra dokunmuş
    // olabilir ve sayaç arabayı bıraktığı andan itibaren saymalı.
    const next: ParkSession = {
      ...session,
      startedAtMs: atMs,
      recordedAtMs: atMs,
      latitude,
      longitude,
      accuracyM: 0,
    };
    persist(next);
    set({
      session: next,
      autoDetected: true,
      locationState: 'ok',
      // Konum bildirimle geldi: park()'ın gecikmeli yakalaması bunu ezmesin.
      locationPinnedByUser: true,
    });
    void describeCoords({ latitude, longitude }).then((place) => {
      if (place.placeName) get().setParkLocation(place);
    });
  },

  /** §7.4b yanlış algı: kullanıcı "ben park etmedim" derse kayıt tamamen silinir. */
  dismissAutoPark: () => {
    if (!get().autoDetected) return;
    get().cancelPark();
  },

  /**
   * Park formundan geri çıkış — kayıt tamamen silinir ve keşfe dönülür.
   * Yalnız `parking` fazında geçerli: oturum bir kez başladıktan (active) sonra
   * çıkış yolu "Bitir"dir, sessizce silmek geçmişi bozar.
   */
  cancelPark: () => {
    const { session, phase } = get();
    if (!session || phase !== 'parking') return;
    if (session.photoUri) deleteSpotPhoto(session.photoUri);
    try {
      repo().deleteSession(session.id);
    } catch {
      /* silinemezse bellek durumu yine sıfırlanır */
    }
    void cancelSessionAlerts();
    set({
      phase: 'idle',
      session: null,
      autoDetected: false,
      suggestedTariff: null,
      ocrState: 'idle',
      locationState: 'idle',
      locationPinnedByUser: false,
    });
  },

  scanTariff: () => {
    const { session, phase } = get();
    if (!session || phase === 'ended') return;
    // Tarife panosu tarama premium (ürün kararı): kilitliyse paywall köprüsü.
    if (!usePremiumStore.getState().isPremium) {
      set({ ocrState: 'locked' });
      return;
    }

    set({ ocrState: 'scanning', ocrSchedule: null, ocrPartial: false });
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
        // Yalnız gerçek okuma sonuçları ölçülür; izin reddi/iptal kullanıcı
        // kararıdır, OCR kalitesi hakkında bir şey söylemez.
        if (outcome.status === 'not_detected' || outcome.status === 'failed') {
          trackTariffScan(outcome.status);
        }
        set({ ocrState: outcome.status });
        return;
      }
      trackTariffScan(outcome.partial ? 'partial' : 'ok');

      const next = { ...current, tariff: outcome.tariff, tariffSchedule: outcome.schedule };
      persist(next);
      set({
        session: next,
        ocrState: 'idle',
        ocrSchedule: outcome.schedule,
        ocrPartial: outcome.partial,
        tariffSource: 'ocr',
        pooledTariff: null,
        suggestedTariff: null,
        externalTariffVersion: get().externalTariffVersion + 1,
      });
      syncAlerts(next, false, set);
    });
  },

  setParkLocation: ({ latitude, longitude, placeName }) => {
    const { session, phase } = get();
    // Sayaç başladıktan SONRA da düzeltilebilir: pinin yanlış olduğu çoğu zaman
    // saatler sonra, arabaya dönerken anlaşılıyor. Yalnız konum değişir —
    // startedAtMs, recordedAtMs ve geçmiş dokunulmaz.
    if (!session || (phase !== 'parking' && phase !== 'active')) return;
    // Elle belirlenen nokta en doğru veridir: doğruluk yarıçapı yok.
    const next = { ...session, latitude, longitude, placeName, accuracyM: 0 };
    persist(next);

    // Tarife hafızası yalnız park formunda tazelenir; oturum başladıktan sonra
    // tarife çoktan girilmiş olabilir ve altını oymak yanlış olur.
    let remembered: Tariff | null = null;
    if (phase === 'parking' && !next.tariff) {
      try {
        remembered = repo().findRememberedTariff(latitude, longitude);
      } catch {
        remembered = null;
      }
    }
    set({
      session: next,
      locationState: 'ok',
      suggestedTariff: phase === 'parking' ? remembered : get().suggestedTariff,
      locationPinnedByUser: true,
      locationEditSeq: get().locationEditSeq + 1,
    });
    refreshActivityIfLive();
  },

  useMyLocationForPark: () => {
    const { session, phase } = get();
    if (!session || (phase !== 'parking' && phase !== 'active')) return;
    const seq = get().locationEditSeq;
    set({ locationState: 'capturing' });
    void captureCurrentPlace().then((outcome) => {
      // Bekleme sırasında kullanıcı haritadan pin attıysa o karar daha yenidir.
      if (get().locationEditSeq !== seq) return;
      const current = get().session;
      if (!current || current.id !== session.id) return;
      if (outcome.status !== 'ok') {
        set({ locationState: outcome.status });
        return;
      }
      const next = {
        ...current,
        latitude: outcome.place.latitude,
        longitude: outcome.place.longitude,
        placeName: outcome.place.placeName,
        accuracyM: outcome.place.accuracyM,
      };
      persist(next);
      set({
        session: next,
        locationState: isIndoorLike(outcome.place.accuracyM) ? 'weak' : 'ok',
        locationPinnedByUser: true,
        locationEditSeq: get().locationEditSeq + 1,
      });
    });
  },

  clearReopenAfterPick: () => set({ reopenAfterPick: null }),

  startPickingLocation: (target = 'park') => {
    const { phase, session } = get();
    if (target === 'park' && phase !== 'parking' && phase !== 'active') return;
    // Haritaya hiç dokunulmazsa onaylanacak değer başlangıç noktasıdır:
    // park için arabanın bilinen yeri, filtre için aramanın mevcut merkezi.
    const current =
      target === 'park'
        ? session?.latitude != null && session.longitude != null
          ? { latitude: session.latitude, longitude: session.longitude }
          : null
        : useDiscoveryStore.getState().center;
    set({ pickingLocation: target, pickedCenter: current, reopenAfterPick: null });
  },

  setPickedCenter: (coords) => {
    if (!get().pickingLocation) return;
    set({ pickedCenter: coords });
  },

  // Vazgeçmek de popup'ı geri açar: kullanıcı onu kapatmadı, biz geçici olarak
  // çekildik. Eli boş haritada bırakmak akışı koparıyordu.
  cancelPickingLocation: () =>
    set({ reopenAfterPick: get().pickingLocation, pickingLocation: null, pickedCenter: null }),

  confirmPickedLocation: () => {
    const { pickedCenter, pickingLocation: target } = get();
    set({ reopenAfterPick: target, pickingLocation: null, pickedCenter: null });
    if (!pickedCenter) return;

    if (target === 'filter') {
      // Filtre için işaretlenen nokta aramanın yeni merkezidir.
      useDiscoveryStore.getState().pinTo(pickedCenter);
      return;
    }
    // Ters geocoding beklenmez: konum hemen uygulanır, ad gelince tazelenir.
    get().setParkLocation({ ...pickedCenter, placeName: null });
    void describeCoords(pickedCenter).then((place) => {
      if (place.placeName) get().setParkLocation(place);
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

  acceptPooledTariff: () => {
    const { session, pooledTariff, externalTariffVersion } = get();
    if (!session || !pooledTariff) return;
    const next = { ...session, tariff: pooledTariff.tariff };
    persist(next);
    set({
      session: next,
      pooledTariff: null,
      suggestedTariff: null,
      tariffSource: 'pool',
      externalTariffVersion: externalTariffVersion + 1,
    });
    syncAlerts(next, false, set);
  },

  confirmDetails: () => {
    const { phase, session } = get();
    if (phase !== 'parking' || !session) return;
    const next = { ...session, confirmed: true };
    persist(next);
    set({ phase: 'active', session: next });
    submitToPool(next, get().spotId, get().tariffSource);
    // Kullanıcı hatırlatıcısını burada onaylamış olur → izin tam bu anda istenir.
    syncAlerts(get().session, true, set);
    syncLiveActivity('start');
  },

  startFinding: () => {
    if (get().phase === 'active') set({ phase: 'finding' });
  },

  stopFinding: () => {
    if (get().phase === 'finding') set({ phase: 'active' });
  },

  endSession: (endedAtMs) => {
    const { phase, session } = get();
    if ((phase !== 'active' && phase !== 'finding') || !session) return;
    // Doğrudan `onPress={endSession}` yazılırsa React basma olayını argüman olarak geçer ve
    // bitiş anı NaN olurdu: SQLite yazımı patlar, kayıt açık kalır, sayaç yeniden açılışta
    // devam ederdi. Sayı olmayan her şey "şimdi" sayılır.
    const at =
      typeof endedAtMs === 'number' && Number.isFinite(endedAtMs) ? Math.max(session.startedAtMs, endedAtMs) : Date.now();
    const next = { ...session, endedAtMs: at };
    persist(next);
    // Kapanış AYRICA hedefli bir UPDATE ile yazılır ve okunarak doğrulanır: "bitirdim ama
    // uygulamayı açınca park sürüyor" tam olarak bu yazımın sessizce düşmesiydi.
    try {
      repo().closeSession(next.id, at);
      const stillOpen = repo().getActiveSession();
      if (stillOpen && stillOpen.id === next.id) {
        // Kayıt hâlâ açık: satırı komple yeniden yaz, o da olmazsa sil — yeniden açılışta
        // hayalet bir sayaçla dönmesindense kaybolması iyidir.
        repo().saveSession(next);
        const check = repo().getActiveSession();
        if (check && check.id === next.id) repo().deleteSession(next.id);
      }
    } catch {
      /* depo yoksa bellek durumu yine doğru; sonraki açılışta süpürme devreye girer */
    }
    set({ phase: 'ended', session: next });
    void cancelSessionAlerts(); // §8.4: oturum bitince zamanlanmış uyarılar iptal
    syncLiveActivity('end');

    const exit = computeExitSummary(next.tariff, next.startedAtMs, next.endedAtMs ?? Date.now());
    trackParkEnded({
      durationMin: ((next.endedAtMs ?? Date.now()) - next.startedAtMs) / 60_000,
      hadTariff: next.tariff !== null,
      savedAmount: exit.saved,
      currency: next.tariff ? next.tariff.currency : null,
      tariffSource: next.tariff ? get().tariffSource : 'none',
    });
  },

  undoEnd: () => {
    const { phase, session } = get();
    if (phase !== 'ended' || !session) return;
    const next = { ...session, endedAtMs: null };
    persist(next);
    set({ phase: 'active', session: next });
    syncAlerts(next, false, set); // Undo → uyarılar geri kurulur
    // endSession aktiviteyi kapatmıştı; geri alınca kilit ekranı da geri gelir.
    syncLiveActivity('start');
  },

  /**
   * Ön plana dönüş: Live Activity'yi yaşayan duruma getirir.
   *
   * iOS aktiviteyi ~8 saatte kendisi bitiriyor (gece boyu / havaalanı parkı) ve
   * geri getirmenin tek yolu ön planda yeniden `request` etmek. Var olanı
   * yeniden kurmak kartı söndürüp yakacağı için önce varlığı sorulur.
   */
  resumeLiveActivity: () => {
    const { phase, session } = get();
    if ((phase !== 'active' && phase !== 'finding') || !session) return;
    syncLiveActivity(isLiveActivityRunning() ? 'refresh' : 'start');
  },

  finish: () => {
    // Kayıt geçmişte kalır (endedAtMs dolu); yalnız bellek durumu sıfırlanır.
    if (get().phase !== 'ended') return;
    // Bitiş akışı kilit ekranını zaten kapatıyor; burada bir kez daha süpürülür çünkü
    // "bitirdim ama kilit ekranı saymaya devam ediyor" tam olarak bunun kaçtığı durum.
    clearSessionSurfaces();
    set({
      phase: 'idle',
      session: null,
      locationState: 'idle',
      suggestedTariff: null,
      notificationState: 'idle',
      locationPinnedByUser: false,
    });
    void cancelSessionAlerts();
  },

  deleteEndedSession: (id) => {
    try {
      const uri = repo().getSessionPhotoUri(id);
      if (uri) deleteSpotPhoto(uri);
      repo().deleteSession(id);
    } catch {
      // Silinemezse liste bir sonraki açılışta kaydı yine gösterir.
    }
  },
}));
