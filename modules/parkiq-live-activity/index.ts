import { requireNativeModule } from 'expo-modules-core';

// Live Activity köprüsü. Native modül yalnız `expo run:ios` build'inde var;
// Expo Go'da hepsi no-op olur ve app çalışmaya devam eder.

export interface LiveActivitySegment {
  widthPct: number;
  cumulativePriceText: string;
  passed: boolean;
  active: boolean;
}

export interface LiveActivityPayload {
  startedAtMs: number;
  placeName?: string | null;
  floor?: string | null;
  nextBoundaryAtMs?: number | null;
  barTone?: string;
  segments?: LiveActivitySegment[];
  knobPct?: number | null;
  nowPriceText?: string | null;
  nextPriceText?: string | null;
  /** §8.5 bitiş karesi damgası; yalnız end() çağrısında doldurulur. */
  finalStampText?: string | null;
}

export interface WidgetPayload {
  startedAtMs?: number | null;
  placeName?: string | null;
  monthlySavedText?: string | null;
}

interface NativeLiveActivity {
  isSupported(): boolean;
  start(payload: LiveActivityPayload): Promise<string | null>;
  update(payload: LiveActivityPayload): Promise<void>;
  end(payload: LiveActivityPayload | Record<string, never>): Promise<void>;
  setWidgetData(payload: WidgetPayload): void;
}

let native: NativeLiveActivity | null = null;
try {
  native = requireNativeModule<NativeLiveActivity>('ParkiqLiveActivity');
} catch {
  native = null;
}

/**
 * Sessiz yutulan hatalar yüzünden "Live Activity hiç gelmedi" durumunu teşhis
 * etmek imkânsızdı: modül bulunamasa da, ActivityKit reddetse de aynı sonuç
 * görünüyordu. Artık sebep loga düşer — app yine çalışmaya devam eder.
 */
function warn(stage: string, error?: unknown): void {
  console.warn(`[LiveActivity] ${stage}`, error ?? '');
}

if (native === null) {
  warn('native module ParkiqLiveActivity not found — running without Live Activity');
}

export const isLiveActivityAvailable = native !== null && (native?.isSupported() ?? false);

if (native !== null && !isLiveActivityAvailable) {
  warn('ActivityKit reports Live Activities disabled (Settings > ParkIQ > Live Activities)');
}

export async function startLiveActivity(payload: LiveActivityPayload): Promise<void> {
  if (!native) return;
  try {
    const id = await native.start(payload);
    if (id === null) warn('start returned null — Activity.request was rejected');
  } catch (error) {
    warn('start failed', error);
  }
}

export async function updateLiveActivity(payload: LiveActivityPayload): Promise<void> {
  try {
    await native?.update(payload);
  } catch (error) {
    warn('update failed', error);
  }
}

export async function endLiveActivity(payload: LiveActivityPayload | null): Promise<void> {
  try {
    await native?.end(payload ?? ({} as Record<string, never>));
  } catch (error) {
    warn('end failed', error);
  }
}

export function setWidgetData(payload: WidgetPayload): void {
  try {
    native?.setWidgetData(payload);
  } catch (error) {
    warn('setWidgetData failed', error);
  }
}
