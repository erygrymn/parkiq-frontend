import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ParkSession } from '../sessionStore';

// "Parkı bitirdim ama uygulamayı açınca sürüyor" hatasının testi.
//
// İki ayrı kök sebep vardı ve ikisi de yalnız DEPO üzerinden görülüyor:
//   1. Bitiş yazımı sessizce düşünce kayıt açık kalıyordu (bellekte bitmiş görünüyordu).
//   2. Eski sürümlerden kalan açık kayıtlar her açılışta sırayla geri geliyordu.
// Bu yüzden depo taklit edilir ve SATIRLARIN son hâline bakılır.

interface Row {
  id: string;
  startedAtMs: number;
  endedAtMs: number | null;
}

const rows: Row[] = [];

jest.mock('../../db/sessionRepo', () => ({
  saveSession: (s: ParkSession) => {
    const i = rows.findIndex((r) => r.id === s.id);
    const row = { id: s.id, startedAtMs: s.startedAtMs, endedAtMs: s.endedAtMs };
    if (i >= 0) rows[i] = row;
    else rows.push(row);
  },
  closeSession: (id: string, endedAtMs: number) => {
    const row = rows.find((r) => r.id === id && r.endedAtMs === null);
    if (row) row.endedAtMs = endedAtMs;
  },
  listOpenSessions: () =>
    rows
      .filter((r) => r.endedAtMs === null)
      .sort((a, b) => b.startedAtMs - a.startedAtMs)
      .map((r) => ({ ...base, id: r.id, startedAtMs: r.startedAtMs, endedAtMs: null })),
  getActiveSession: () => {
    const open = rows.filter((r) => r.endedAtMs === null).sort((a, b) => b.startedAtMs - a.startedAtMs)[0];
    return open ? { ...base, id: open.id, startedAtMs: open.startedAtMs, endedAtMs: null } : null;
  },
  deleteSession: (id: string) => {
    const i = rows.findIndex((r) => r.id === id);
    if (i >= 0) rows.splice(i, 1);
  },
  listEndedSessions: () => [],
  getSessionPhotoUri: () => null,
  readSetting: () => null,
  writeSetting: () => undefined,
  findRememberedTariff: () => null,
  findRememberedFloor: () => null,
}));

const base: ParkSession = {
  id: 'p1',
  startedAtMs: 1_700_000_000_000,
  recordedAtMs: 1_700_000_000_000,
  endedAtMs: null,
  floor: '',
  note: '',
  tariff: null,
  latitude: 41,
  longitude: 29,
  placeName: 'Test',
  photoUri: null,
  reminder: null,
  accuracyM: null,
  confirmed: true,
};

// Store depo taklidinden SONRA yüklenmeli.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useSessionStore } = require('../sessionStore') as typeof import('../sessionStore');

describe('oturum bitişi kalıcıdır', () => {
  beforeEach(() => {
    rows.length = 0;
    useSessionStore.setState({ hydrated: false, phase: 'idle', session: null });
  });

  it('bitirince satır kapanır ve yeniden açılışta aktif oturum kalmaz', () => {
    rows.push({ id: 'p1', startedAtMs: base.startedAtMs, endedAtMs: null });
    useSessionStore.setState({ phase: 'active', session: { ...base } });

    useSessionStore.getState().endSession();

    expect(rows[0].endedAtMs).not.toBeNull();
    useSessionStore.setState({ hydrated: false, phase: 'idle', session: null });
    useSessionStore.getState().hydrate();
    expect(useSessionStore.getState().phase).toBe('idle');
    expect(useSessionStore.getState().session).toBeNull();
  });

  it('bitiş anı geçersizse "şimdi" yazılır — kayıt asla açık kalmaz', () => {
    rows.push({ id: 'p1', startedAtMs: base.startedAtMs, endedAtMs: null });
    useSessionStore.setState({ phase: 'active', session: { ...base } });

    // Doğrudan onPress'e bağlanınca gelen basma olayı bu yoldan giriyordu.
    (useSessionStore.getState().endSession as (v: unknown) => void)({ nativeEvent: {} });

    expect(typeof rows[0].endedAtMs).toBe('number');
    expect(Number.isFinite(rows[0].endedAtMs)).toBe(true);
  });

  it('eski sürümlerden kalan açık kayıtlar açılışta süpürülür', () => {
    rows.push({ id: 'eski1', startedAtMs: base.startedAtMs - 200_000, endedAtMs: null });
    rows.push({ id: 'eski2', startedAtMs: base.startedAtMs - 100_000, endedAtMs: null });
    rows.push({ id: 'guncel', startedAtMs: base.startedAtMs, endedAtMs: null });

    useSessionStore.getState().hydrate();

    expect(useSessionStore.getState().session?.id).toBe('guncel');
    expect(rows.map((r) => r.id)).toEqual(['guncel']);
  });
});
