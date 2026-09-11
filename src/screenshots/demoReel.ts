import { useDiscoveryStore } from '../state/discoveryStore';
import { useSessionStore } from '../state/sessionStore';
import { useUiStore } from '../state/uiStore';
import { DEMO_POIS, demoSession, demoTariff, garagePhotoUri, resetDemoStores } from './scenarios';

/**
 * UGC reklamının yan panelinde akan demo (32 sn). Kendi kendine oynar, dokunuş
 * beklemez — ekran kaydı alırken elin kadraja girmesin diye.
 *
 * Zaman SIKIŞTIRILIR ama matematik sıkıştırılmaz: her tik'te oturumun
 * `startedAtMs`'i geriye itilir, sayaç ve tarife çubuğu bunu GERÇEK geçmiş süre
 * sanar ve `tariffMath`'ten normal yoldan geçer. Sahte bir "ilerleme animasyonu"
 * çizmek design.md İlke 5'i (veri asla yalan söylemez) kırardı; bu yol kırmıyor —
 * çubuk gerçekten 52 dakikalık bir oturumu gösteriyor, yalnız oraya hızlı geliyor.
 */

/** Sayacın koşacağı hedef: ilk dilimin 8 dk berisi, yani amber penceresinin içi. */
const TARGET_ELAPSED_MIN = 52;
/** Sayaç bu sürede 0'dan hedefe koşar. */
const RUN_MS = 6000;
const TICK_MS = 80;
/** Turun toplam uzunluğu; son kareden sonra başa dönene kadar geçen süre dahil. */
const CYCLE_MS = 31_000;

interface Step {
  atMs: number;
  run: () => void;
}

/**
 * Çalışan reel'in durdurucusu MODÜL seviyesinde tutulur, komponentte değil.
 *
 * Önce ScreenshotSheet'in ref'indeydi: Ayarlar kapanınca RN Modal çocuklarını
 * unmount ediyor, cleanup çalışıyor ve reel tam da izlenmeye başlayacağı anda
 * duruyordu. Reel'in sahibi bir ekran değil, uygulamanın kendisi.
 */
let stopCurrent: (() => void) | null = null;

export function stopDemoReel(): void {
  stopCurrent?.();
  stopCurrent = null;
}

export function startDemoReel(): void {
  // Üst üste başlatma yok: iki zamanlayıcı seti aynı store'u çekiştirirdi.
  stopDemoReel();
  let timers: ReturnType<typeof setTimeout>[] = [];
  let ticker: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  function stopClock(): void {
    if (ticker !== null) clearInterval(ticker);
    ticker = null;
  }

  function startClock(startedAtMs: number): void {
    const beganAt = Date.now();
    stopClock();
    ticker = setInterval(() => {
      const progress = Math.min(1, (Date.now() - beganAt) / RUN_MS);
      // Sayaç hedefe doğru hızlanmadan, düz akar: izleyici rakamı okuyabilmeli.
      const elapsedMin = TARGET_ELAPSED_MIN * progress;
      const live = useSessionStore.getState().session;
      if (!live) return;
      useSessionStore.setState({
        session: { ...live, startedAtMs: startedAtMs - elapsedMin * 60_000 },
      });
      if (progress >= 1) stopClock();
    }, TICK_MS);
  }

  const steps: Step[] = [
    // 0:00 — keşif. Harita, arama çubuğu, "I Parked".
    {
      atMs: 0,
      run: () => {
        resetDemoStores();
        useDiscoveryStore.setState({ pois: DEMO_POIS, filter: 'all', state: 'ready' });
      },
    },
    // 0:02 — park kaydı: PARKED. damgası ve araba pini.
    {
      atMs: 2000,
      run: () => {
        const now = Date.now();
        useSessionStore.setState({
          phase: 'parking',
          session: demoSession({ startedAtMs: now, recordedAtMs: now, confirmed: false }),
          locationState: 'ok',
        });
      },
    },
    // 0:05 — tarife girilmiş, oturum başlıyor. Sayaç sıfırdan koşar.
    {
      atMs: 5000,
      run: () => {
        const now = Date.now();
        useSessionStore.setState({
          phase: 'active',
          session: demoSession({
            startedAtMs: now,
            recordedAtMs: now,
            tariff: demoTariff(),
            confirmed: true,
          }),
        });
        startClock(now);
      },
    },
    // 0:11 — amber penceresinde bekle: "Now $5 · Next $10" okunacak kadar dursun.
    // (Replik 0:08–0:15 burayı anlatıyor; 0:15–0:19 kilit ekranı bu reel'den
    // ÇIKMAZ, Live Activity OS yüzeyi olduğu için gerçek cihazda ayrı çekilir.)
    { atMs: 11_000, run: stopClock },
    // 0:19 — Arabamı Bul: kapalı otopark kartı. accuracyM yüksek olduğu için ekran
    // pusulaya değil foto + kat kartına düşer; replik tam bunu anlatıyor.
    {
      atMs: 19_000,
      run: () => {
        const live = useSessionStore.getState().session;
        if (!live) return;
        useSessionStore.setState({
          phase: 'finding',
          session: {
            ...live,
            floor: '3',
            note: 'Blue pillar, left of the elevator',
            photoUri: garagePhotoUri(),
            accuracyM: 65,
          },
        });
      },
    },
    // 0:25 — çıkış. Kutlama kapağı: SAVED $5.
    {
      atMs: 25_000,
      run: () => {
        const live = useSessionStore.getState().session;
        if (!live) return;
        useSessionStore.setState({
          phase: 'ended',
          session: { ...live, endedAtMs: Date.now() },
        });
      },
    },
  ];

  /**
   * Bütün tur yeniden ZAMANLANIR, yalnız ilk adım tekrar çağrılmaz.
   *
   * Önce 31. saniyede `steps[0].run()` çağrılıyordu: ekran keşfe dönüyor ama geri
   * kalan zamanlayıcılar çoktan ateşlenmiş olduğu için bir daha hiç akmıyordu —
   * yani reel tek sefer oynayıp donuyordu. Kayıt döngü halinde alınacaksa turun
   * kendisi tekrar kurulmalı.
   */
  function scheduleCycle(): void {
    if (stopped) return;
    timers = [];
    for (const step of steps) timers.push(setTimeout(step.run, step.atMs));
    timers.push(setTimeout(scheduleCycle, CYCLE_MS));
  }

  scheduleCycle();

  stopCurrent = () => {
    stopped = true;
    stopClock();
    for (const timer of timers) clearTimeout(timer);
    timers = [];
    resetDemoStores();
    useUiStore.setState({ locationInviteDismissed: true });
  };
}
