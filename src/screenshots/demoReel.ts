import { useDiscoveryStore } from '../state/discoveryStore';
import { useSessionStore } from '../state/sessionStore';
import { useUiStore } from '../state/uiStore';
import { DEMO_POIS, demoSession, demoTariff, resetDemoStores } from './scenarios';

/**
 * UGC reklamının yan panelinde akan demo (28 sn). Kendi kendine oynar, dokunuş
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

interface Step {
  atMs: number;
  run: () => void;
}

export function startDemoReel(): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];
  let ticker: ReturnType<typeof setInterval> | null = null;

  const at = (atMs: number, run: () => void) => timers.push(setTimeout(run, atMs));

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
    // 0:05 — tarife girilmiş, oturum başlıyor. Sayaç sıfırdan.
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
    // 0:13 — amber penceresinde bekle: "Now $5 · Next $10" okunacak kadar dursun.
    { atMs: 13_000, run: () => stopClock() },
    // 0:18 — çıkış. Kutlama kapağı: SAVED $5.
    {
      atMs: 18_000,
      run: () => {
        const live = useSessionStore.getState().session;
        if (!live) return;
        useSessionStore.setState({
          phase: 'ended',
          session: { ...live, endedAtMs: Date.now() },
        });
      },
    },
    // 0:26 — başa dön; kayıt döngü halinde alınabilsin.
    { atMs: 26_000, run: () => steps[0].run() },
  ];

  function startClock(startedAtMs: number): void {
    const beganAt = Date.now();
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

  function stopClock(): void {
    if (ticker !== null) clearInterval(ticker);
    ticker = null;
  }

  for (const step of steps) at(step.atMs, step.run);

  return () => {
    stopClock();
    for (const timer of timers) clearTimeout(timer);
    resetDemoStores();
    useUiStore.setState({ locationInviteDismissed: true });
  };
}
