import { describe, expect, it } from '@jest/globals';
import { PREMIUM_ENTITLEMENT } from '../premium';
import { wasRestored } from '../purchases';

// "Tekrar satın aldım ama kart bilgisi sorulmadı, panele yine gelir olarak düştü" hatasının testi.
//
// Uygulamayı silip kuran biri satın al'a bastığında App Store ödeme istemez: ürün zaten onundur,
// işlem sessizce geri yüklenir. Ayıran tek işaret yetkinin SON ödeme anıdır.

function info(paidAtMs: number | null) {
  return {
    entitlements: {
      active: paidAtMs === null ? {} : { [PREMIUM_ENTITLEMENT]: { latestPurchaseDateMillis: paidAtMs } },
    },
  };
}

const now = 1_700_000_000_000;

describe('geri yükleme, satın almadan ayrılır', () => {
  it('ödeme anı istekten eskiyse geri yüklemedir — gelir sayılmaz', () => {
    expect(wasRestored(info(now - 90 * 24 * 3600_000), now)).toBe(true);
  });

  it('ödeme anı istekle aynıysa gerçek satın almadır', () => {
    expect(wasRestored(info(now + 1_200), now)).toBe(false);
  });

  it('cihaz saati birkaç saniye geriyse yine satın almadır', () => {
    expect(wasRestored(info(now - 5_000), now)).toBe(false);
  });

  it('ISO tarih de okunur', () => {
    const iso = { entitlements: { active: { [PREMIUM_ENTITLEMENT]: { latestPurchaseDate: new Date(now - 3600_000).toISOString() } } } };
    expect(wasRestored(iso, now)).toBe(true);
  });

  it('yetki yoksa geri yükleme de yok', () => {
    expect(wasRestored(info(null), now)).toBe(false);
  });
});
