// design.md §6 — krem editöryal harita stili. Mapbox Streets v8 kaynağı üstüne kendi
// katmanlarımız: az renk, beyaz yollar, hafif bina blokları, semt adları uppercase + harf aralıklı.
// POI etiketi yok: otopark/şarj pinlerini uygulama kendi çizer (§5 pinler). Stil JSON olarak
// gömülüdür — Studio hesabına bağımlılık yok; `config.ts`'te URL verilirse o kazanır.

export interface MapPalette {
  land: string;
  road: string;
  park: string;
  building: string;
  water: string;
  labelPoi: string;
  labelDistrict: string;
}

export const MAP_PALETTE: Record<'light' | 'dark', MapPalette> = {
  light: {
    land: '#F5F2EB',
    road: '#FFFFFF',
    park: '#DCE8CD',
    building: '#ECE7DC',
    water: '#D9E3E8',
    labelPoi: '#6E6E78',
    labelDistrict: '#141416',
  },
  dark: {
    land: '#161618',
    road: '#232327',
    park: '#1E241F',
    building: '#1C1C1F',
    water: '#14181C',
    labelPoi: '#8A8A93',
    labelDistrict: '#F0F0F2',
  },
};

const FONT_MEDIUM = ['DIN Pro Medium', 'Arial Unicode MS Regular'];
const FONT_BOLD = ['DIN Pro Bold', 'Arial Unicode MS Bold'];

function roadLayer(id: string, classes: string[], p: MapPalette, widths: [number, number, number]) {
  return {
    id,
    type: 'line',
    source: 'composite',
    'source-layer': 'road',
    filter: ['all', ['match', ['get', 'class'], classes, true, false], ['!=', ['get', 'structure'], 'tunnel']],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': p.road,
      'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 12, widths[0], 16, widths[1], 19, widths[2]],
    },
  };
}

export function buildMapStyle(scheme: 'light' | 'dark'): string {
  const p = MAP_PALETTE[scheme];
  const style = {
    version: 8,
    name: `parkiq-${scheme}`,
    sources: { composite: { type: 'vector', url: 'mapbox://mapbox.mapbox-streets-v8' } },
    glyphs: 'mapbox://fonts/mapbox/{fontstack}/{range}.pbf',
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': p.land } },
      {
        id: 'landuse-green',
        type: 'fill',
        source: 'composite',
        'source-layer': 'landuse',
        filter: ['match', ['get', 'class'], ['park', 'grass', 'pitch', 'cemetery', 'wood', 'scrub', 'garden'], true, false],
        paint: { 'fill-color': p.park },
      },
      { id: 'water', type: 'fill', source: 'composite', 'source-layer': 'water', paint: { 'fill-color': p.water } },
      {
        id: 'building',
        type: 'fill',
        source: 'composite',
        'source-layer': 'building',
        minzoom: 13,
        paint: {
          'fill-color': p.building,
          'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 14.5, 1],
        },
      },
      roadLayer('road-minor', ['street', 'street_limited', 'service', 'track', 'path', 'pedestrian', 'living_street'], p, [0.6, 3, 12]),
      roadLayer('road-secondary', ['secondary', 'tertiary', 'secondary_link', 'tertiary_link'], p, [1.2, 5, 18]),
      roadLayer('road-primary', ['primary', 'trunk', 'motorway', 'primary_link', 'trunk_link', 'motorway_link'], p, [1.6, 7, 24]),
      {
        id: 'road-label',
        type: 'symbol',
        source: 'composite',
        'source-layer': 'road',
        minzoom: 15,
        filter: ['match', ['get', 'class'], ['primary', 'secondary', 'tertiary', 'street', 'trunk'], true, false],
        layout: {
          'symbol-placement': 'line',
          'text-field': ['get', 'name'],
          'text-font': FONT_MEDIUM,
          'text-size': 11,
          'text-letter-spacing': 0.02,
        },
        paint: { 'text-color': p.labelPoi, 'text-halo-color': p.land, 'text-halo-width': 1 },
      },
      {
        id: 'place-neighbourhood',
        type: 'symbol',
        source: 'composite',
        'source-layer': 'place_label',
        minzoom: 12,
        filter: ['match', ['get', 'type'], ['suburb', 'neighbourhood', 'quarter'], true, false],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': FONT_BOLD,
          'text-size': 11,
          'text-letter-spacing': 0.14,
          'text-transform': 'uppercase',
          'text-padding': 12,
        },
        paint: { 'text-color': p.labelDistrict, 'text-halo-color': p.land, 'text-halo-width': 1.2 },
      },
      {
        id: 'place-city',
        type: 'symbol',
        source: 'composite',
        'source-layer': 'place_label',
        maxzoom: 14,
        filter: ['match', ['get', 'type'], ['city', 'town', 'village'], true, false],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': FONT_BOLD,
          'text-size': ['interpolate', ['linear'], ['zoom'], 8, 12, 13, 15],
          'text-letter-spacing': 0.04,
        },
        paint: { 'text-color': p.labelDistrict, 'text-halo-color': p.land, 'text-halo-width': 1.2 },
      },
    ],
  };
  return JSON.stringify(style);
}
