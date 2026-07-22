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

export const isLiveActivityAvailable = native !== null && (native?.isSupported() ?? false);

export async function startLiveActivity(payload: LiveActivityPayload): Promise<void> {
  try {
    await native?.start(payload);
  } catch {
    // Live Activity başarısızsa oturum normal çalışmaya devam eder.
  }
}

export async function updateLiveActivity(payload: LiveActivityPayload): Promise<void> {
  try {
    await native?.update(payload);
  } catch {
    /* yoksay */
  }
}

export async function endLiveActivity(payload: LiveActivityPayload | null): Promise<void> {
  try {
    await native?.end(payload ?? ({} as Record<string, never>));
  } catch {
    /* yoksay */
  }
}

export function setWidgetData(payload: WidgetPayload): void {
  try {
    native?.setWidgetData(payload);
  } catch {
    /* yoksay */
  }
}
