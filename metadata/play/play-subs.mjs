// Play abonelikleri — `play-iap.mjs` yalnız tek seferlik ürünleri biliyor, abonelikler
// ayrı bir uçta yaşıyor (`monetization/subscriptions`) ve iki katmanlı: ÜRÜN + BASE PLAN.
//
//   node metadata/play/play-subs.mjs create   # ürün + base plan (taslak)
//   node metadata/play/play-subs.mjs activate # base plan'ı yayına al
//   node metadata/play/play-subs.mjs list
//
// `legacyCompatible: true` şart: RevenueCat eski Play Billing akışını kullanıyor,
// bayrak olmadan ürünler SDK'ya hiç görünmüyor (play-iap.mjs'teki tuzakla aynısı).

import fs from 'fs';
// Skill scriptinin yolu ortamdan gelir; repo o dizine bağımlı olmasın diye sabit yazılmıyor.
// PLAY_API=<.../twice-store/scripts/play-api.mjs> ile çalıştır.
const { api, APP_BASE, token } = await import(process.env.PLAY_API ?? '');

const cmd = process.argv[2];
const HERE = 'metadata/play';
const subs = JSON.parse(fs.readFileSync(`${HERE}/subscriptions.json`, 'utf8'));
const prices = JSON.parse(fs.readFileSync(`${HERE}/prices-subs.json`, 'utf8'));

async function put(url, body) {
  const t = await token();
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, ok: r.ok, text: await r.text() };
}

if (cmd === 'create') {
  for (const s of subs) {
    const conv = prices[s.price];
    const body = {
      packageName: process.env.PLAY_PKG,
      productId: s.productId,
      listings: Object.entries(s.listings).map(([languageCode, l]) => ({
        languageCode,
        title: l.title,
        benefits: l.benefits,
      })),
      basePlans: [
        {
          basePlanId: s.basePlanId,
          state: 'DRAFT',
          autoRenewingBasePlanType: {
            billingPeriodDuration: s.period,
            gracePeriodDuration: 'P7D',
            resubscribeState: 'RESUBSCRIBE_STATE_ACTIVE',
            // RevenueCat eski akışı kullanıyor; bayraksız ürün SDK'ya görünmüyor.
            legacyCompatible: true,
            accountHoldDuration: 'P30D',
          },
          regionalConfigs: Object.entries(conv.convertedRegionPrices).map(([regionCode, v]) => ({
            regionCode,
            newSubscriberAvailability: true,
            price: v.price,
          })),
          otherRegionsConfig: {
            usdPrice: conv.convertedOtherRegionsPrice.usdPrice,
            eurPrice: conv.convertedOtherRegionsPrice.eurPrice,
            newSubscriberAvailability: true,
          },
        },
      ],
    };
    const url =
      `${APP_BASE}/subscriptions/${s.productId}` +
      `?updateMask=listings,basePlans&allowMissing=true` +
      `&regionsVersion.version=${encodeURIComponent(conv.regionVersion.version)}`;
    const r = await put(url, body);
    console.log(`${s.productId.padEnd(34)} ${r.status} ${r.ok ? 'OK' : r.text.slice(0, 300)}`);
    await new Promise((s2) => setTimeout(s2, 400));
  }
}

if (cmd === 'activate') {
  for (const s of subs) {
    const r = await api(
      `/subscriptions/${s.productId}/basePlans/${s.basePlanId}:activate`,
      { method: 'POST', body: JSON.stringify({ packageName: process.env.PLAY_PKG, productId: s.productId, basePlanId: s.basePlanId }) },
    );
    console.log(`${s.productId.padEnd(34)} ${r.status} ${r.ok ? 'AKTIF' : JSON.stringify(r.data).slice(0, 250)}`);
    await new Promise((s2) => setTimeout(s2, 400));
  }
}

if (cmd === 'list') {
  const r = await api('/subscriptions');
  for (const s of r.data?.subscriptions || []) {
    const bp = (s.basePlans || [])[0] || {};
    const us = (bp.regionalConfigs || []).find((c) => c.regionCode === 'US');
    const price = us?.price ? `${us.price.units}.${String(us.price.nanos || 0).padStart(9, '0').slice(0, 2)} ${us.price.currencyCode}` : '?';
    console.log(`  ${s.productId.padEnd(34)} | ${String(bp.state).padEnd(7)} | ${bp.basePlanId} | US ${price.padEnd(10)} | bolge:${(bp.regionalConfigs || []).length} | legacy:${bp.autoRenewingBasePlanType?.legacyCompatible}`);
  }
}
