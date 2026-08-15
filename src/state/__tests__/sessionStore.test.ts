import { describe, expect, it } from '@jest/globals';
import { useSessionStore, type ParkSession } from '../sessionStore';

// Tarife hafızası sözleşmesi: öneri KABULÜ dışarıdan yazımdır ve formun kendini
// tazelemesi gerekir (externalTariffVersion artar); kullanıcı elle yazarken
// artmamalıdır, yoksa her tuşta input remount olup odak kaybolur.

const baseSession: ParkSession = {
  id: 'p1',
  startedAtMs: 1_700_000_000_000,
  recordedAtMs: 1_700_000_000_000,
  endedAtMs: null,
  floor: '',
  note: '',
  tariff: null,
  latitude: 41.0,
  longitude: 29.0,
  placeName: 'Test',
  photoUri: null,
  reminderAtMs: null,
  accuracyM: null,
  confirmed: true,
};

describe('sessionStore — tarife önerisi', () => {
  it('öneri kabul edilince tarife oturuma yazılır ve form sürümü artar', () => {
    useSessionStore.setState({
      phase: 'parking',
      session: { ...baseSession },
      suggestedTariff: { type: 'hourly', currency: 'TRY', price: 50 },
      externalTariffVersion: 0,
    });

    useSessionStore.getState().acceptSuggestedTariff();

    const s = useSessionStore.getState();
    expect(s.session?.tariff).toEqual({ type: 'hourly', currency: 'TRY', price: 50 });
    expect(s.suggestedTariff).toBeNull();
    expect(s.externalTariffVersion).toBe(1);
  });

  it('kullanıcı elle tarife girince form sürümü artmaz', () => {
    useSessionStore.setState({
      phase: 'parking',
      session: { ...baseSession },
      suggestedTariff: null,
      externalTariffVersion: 5,
    });

    useSessionStore.getState().setTariff({ type: 'flat', currency: 'TRY', price: 80 });

    const s = useSessionStore.getState();
    expect(s.session?.tariff?.price).toBe(80);
    expect(s.externalTariffVersion).toBe(5);
  });

  it('backdate kayıt anından türer — tekrar seçimde birikmez', () => {
    const recorded = baseSession.recordedAtMs;
    useSessionStore.setState({ phase: 'parking', session: { ...baseSession } });

    useSessionStore.getState().setBackdateMinutes(10);
    expect(useSessionStore.getState().session?.startedAtMs).toBe(recorded - 10 * 60_000);

    // İkinci seçim öncekinin üstüne EKLENMEZ, kayıt anından yeniden hesaplanır
    useSessionStore.getState().setBackdateMinutes(5);
    expect(useSessionStore.getState().session?.startedAtMs).toBe(recorded - 5 * 60_000);

    useSessionStore.getState().setBackdateMinutes(0);
    expect(useSessionStore.getState().session?.startedAtMs).toBe(recorded);
  });

  it('backdate hatırlatıcıyı da kaydırır (süre farkı korunur)', () => {
    const recorded = baseSession.recordedAtMs;
    useSessionStore.setState({
      phase: 'parking',
      session: { ...baseSession, reminderAtMs: recorded + 60 * 60_000 },
    });

    useSessionStore.getState().setBackdateMinutes(15);

    const s = useSessionStore.getState().session!;
    expect(s.startedAtMs).toBe(recorded - 15 * 60_000);
    // Hatırlatıcı hâlâ başlangıçtan 60 dk sonra
    expect(s.reminderAtMs! - s.startedAtMs).toBe(60 * 60_000);
  });

  it('hatırlatıcı 0 seçilince kapanır', () => {
    useSessionStore.setState({ phase: 'parking', session: { ...baseSession } });

    useSessionStore.getState().setReminderMinutes(120);
    expect(useSessionStore.getState().session?.reminderAtMs).toBe(baseSession.startedAtMs + 120 * 60_000);

    useSessionStore.getState().setReminderMinutes(0);
    expect(useSessionStore.getState().session?.reminderAtMs).toBeNull();
  });

  it('oturum yokken öneri kabulü hiçbir şey bozmaz', () => {
    useSessionStore.setState({
      phase: 'idle',
      session: null,
      suggestedTariff: { type: 'hourly', currency: 'TRY', price: 50 },
      externalTariffVersion: 0,
    });

    useSessionStore.getState().acceptSuggestedTariff();

    expect(useSessionStore.getState().session).toBeNull();
    expect(useSessionStore.getState().externalTariffVersion).toBe(0);
  });
});

describe('konum düzeltmesi', () => {
  const pinned = { latitude: 41.5, longitude: 29.5, placeName: 'Otopark' };

  it('kullanıcı pin attıktan sonra geciken GPS onu ezemez', () => {
    useSessionStore.setState({
      phase: 'parking',
      session: { ...baseSession },
      locationPinnedByUser: false,
      locationEditSeq: 0,
    });

    useSessionStore.getState().setParkLocation(pinned);
    expect(useSessionStore.getState().locationPinnedByUser).toBe(true);

    // park() içindeki gecikmeli yakalama bu bayrağa bakıp vazgeçer.
    expect(useSessionStore.getState().session?.latitude).toBe(41.5);
  });

  it('elle işaretlenen nokta doğruluk yarıçapı taşımaz', () => {
    useSessionStore.setState({ phase: 'parking', session: { ...baseSession, accuracyM: 180 } });
    useSessionStore.getState().setParkLocation(pinned);
    expect(useSessionStore.getState().session?.accuracyM).toBe(0);
  });

  it('sayaç başladıktan sonra da düzeltilebilir', () => {
    useSessionStore.setState({ phase: 'active', session: { ...baseSession } });
    useSessionStore.getState().setParkLocation(pinned);
    expect(useSessionStore.getState().session?.longitude).toBe(29.5);
  });

  it('oturum bittiyse konum artık değişmez', () => {
    useSessionStore.setState({ phase: 'ended', session: { ...baseSession } });
    useSessionStore.getState().setParkLocation(pinned);
    expect(useSessionStore.getState().session?.latitude).toBe(baseSession.latitude);
  });
});

describe('onaylanmamış oturum', () => {
  it('onaylanınca kalıcı olarak işaretlenir', () => {
    useSessionStore.setState({ phase: 'parking', session: { ...baseSession, confirmed: false } });
    useSessionStore.getState().confirmDetails();
    expect(useSessionStore.getState().session?.confirmed).toBe(true);
    expect(useSessionStore.getState().phase).toBe('active');
  });

  it('park() yeni kaydı onaysız açar', () => {
    useSessionStore.setState({ phase: 'idle', session: null, hydrated: true });
    useSessionStore.getState().park();
    expect(useSessionStore.getState().session?.confirmed).toBe(false);
    expect(useSessionStore.getState().phase).toBe('parking');
  });
});
