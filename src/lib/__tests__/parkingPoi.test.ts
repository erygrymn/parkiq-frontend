import { describe, expect, it } from '@jest/globals';
import { applyFilter, parseOverpass, walkMinutes, type ParkingPoi } from '../parkingPoi';

const CENTER = { latitude: 41.0082, longitude: 28.9784 };

const overpassSample = {
  elements: [
    // Düğüm olarak açık otopark
    {
      type: 'node',
      id: 1,
      lat: 41.009,
      lon: 28.979,
      tags: { amenity: 'parking', name: 'Meydan Otopark', parking: 'surface' },
    },
    // Alan (way) olarak kapalı otopark — koordinat `center` alanından gelir
    {
      type: 'way',
      id: 2,
      center: { lat: 41.0095, lon: 28.9795 },
      tags: { amenity: 'parking', parking: 'multi-storey', operator: 'İSPARK' },
    },
    // Şarj istasyonu
    {
      type: 'node',
      id: 3,
      lat: 41.0088,
      lon: 28.9788,
      tags: { amenity: 'charging_station', name: 'Şarj Noktası' },
    },
    // Koordinatsız öğe — elenmeli
    { type: 'relation', id: 4, tags: { amenity: 'parking' } },
  ],
};

describe('parseOverpass', () => {
  const pois = parseOverpass(overpassSample, CENTER);

  it('koordinatsız öğeleri eler', () => {
    expect(pois).toHaveLength(3);
  });

  it('way merkezinden koordinat çıkarır', () => {
    const way = pois.find((p) => p.id === 'way/2');
    expect(way?.latitude).toBeCloseTo(41.0095);
    expect(way?.longitude).toBeCloseTo(28.9795);
  });

  it('adı yoksa operatöre düşer', () => {
    expect(pois.find((p) => p.id === 'way/2')?.name).toBe('İSPARK');
  });

  it('kapalılık etiketten çıkarılır', () => {
    expect(pois.find((p) => p.id === 'way/2')?.covered).toBe(true);
    expect(pois.find((p) => p.id === 'node/1')?.covered).toBe(false);
  });

  it('şarj istasyonu ayrı tür olarak işaretlenir', () => {
    const charging = pois.find((p) => p.id === 'node/3');
    expect(charging?.kind).toBe('charging');
    expect(charging?.covered).toBeNull();
  });

  it('mesafeye göre sıralar (en yakın önce)', () => {
    const distances = pois.map((p) => p.distanceM);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it('bozuk/boş yanıtta çökmez', () => {
    expect(parseOverpass({}, CENTER)).toEqual([]);
    expect(parseOverpass({ elements: [] }, CENTER)).toEqual([]);
    expect(parseOverpass(null, CENTER)).toEqual([]);
  });

  it('aynı öğe iki kez gelirse tekilleştirir', () => {
    const dup = { elements: [overpassSample.elements[0], overpassSample.elements[0]] };
    expect(parseOverpass(dup, CENTER)).toHaveLength(1);
  });
});

describe('applyFilter', () => {
  const pois: ParkingPoi[] = [
    { id: 'a', kind: 'parking', name: null, latitude: 0, longitude: 0, covered: true, distanceM: 10 },
    { id: 'b', kind: 'parking', name: null, latitude: 0, longitude: 0, covered: false, distanceM: 20 },
    { id: 'c', kind: 'parking', name: null, latitude: 0, longitude: 0, covered: null, distanceM: 30 },
    { id: 'd', kind: 'charging', name: null, latitude: 0, longitude: 0, covered: null, distanceM: 40 },
  ];

  it('all → hepsi', () => {
    expect(applyFilter(pois, 'all')).toHaveLength(4);
  });

  it('charging → yalnız şarj', () => {
    expect(applyFilter(pois, 'charging').map((p) => p.id)).toEqual(['d']);
  });

  it('covered → yalnız kapalılığı KESİN olanlar (bilinmeyen dahil değil)', () => {
    expect(applyFilter(pois, 'covered').map((p) => p.id)).toEqual(['a']);
  });
});

describe('walkMinutes', () => {
  it('80 m/dk üzerinden yuvarlar', () => {
    expect(walkMinutes(160)).toBe(2);
    expect(walkMinutes(400)).toBe(5);
  });

  it('çok yakında bile en az 1 dk', () => {
    expect(walkMinutes(5)).toBe(1);
    expect(walkMinutes(0)).toBe(1);
  });
});
