// design.md §2–§4 token seti. Kapalı küme: component'lerde ham değer yasak,
// her renk/boşluk/radius buradan tüketilir (CLAUDE.md "Yapılmayacaklar").

export interface ColorTokens {
  ink: string;
  bg: string;
  card: string;
  elevated: string;
  inset: string;
  la: string;
  mapCanvas: string;
  accentFill: string;
  accentText: string;
  warnFill: string;
  warnText: string;
  textSecondary: string;
  textTertiary: string;
  disabled: string;
  ctaPressed: string;
  insetPressed: string;
  alertBgMoney: string;
  alertBgWarn: string;
  chartNeutral: string;
  track: string;
  gridline: string;
  hairlineDark: string;
  scrim: string;
  locationDot: string;
}

export const lightColors: ColorTokens = {
  ink: '#141416',
  bg: '#F6F6F4',
  card: '#FFFFFF',
  elevated: '#FFFFFF',
  inset: '#F4F4F1',
  la: '#101012',
  mapCanvas: '#F5F2EB',
  accentFill: '#00A650',
  accentText: '#0B7A3E',
  warnFill: '#C77700',
  warnText: '#B45309',
  textSecondary: '#6E6E78',
  textTertiary: '#71717A',
  disabled: '#9A9AA2',
  ctaPressed: '#232326',
  insetPressed: '#ECECEA',
  alertBgMoney: '#F2FBF5',
  alertBgWarn: '#FFF8E6',
  chartNeutral: '#D0D0CB',
  track: '#E9E9E2',
  gridline: '#E8E8E2',
  hairlineDark: 'transparent', // yalnız koyu temada var (§2.1)
  scrim: 'rgba(24,20,12,0.08)',
  locationDot: '#0A84FF',
};

export const darkColors: ColorTokens = {
  ink: '#F0F0F2',
  bg: '#131315',
  card: '#1C1C1F',
  elevated: '#232327',
  inset: '#232327',
  la: '#101012',
  mapCanvas: '#161618',
  accentFill: '#2FE07A',
  accentText: '#2FE07A',
  warnFill: '#FFB300',
  warnText: '#FFB300',
  textSecondary: '#9B9BA4',
  textTertiary: '#8A8A93',
  disabled: '#6E6E78',
  ctaPressed: '#D8D8DC',
  insetPressed: '#2A2A2F',
  alertBgMoney: 'rgba(47,224,122,0.12)',
  alertBgWarn: 'rgba(255,179,0,0.12)',
  chartNeutral: '#3A3A3E',
  track: '#26262B',
  gridline: '#2C2C2A',
  hairlineDark: 'rgba(255,255,255,0.07)',
  scrim: 'rgba(0,0,0,0.25)',
  locationDot: '#0A84FF',
};

// §3.1 kapalı tip skalası. letterSpacing RN'de pt cinsindendir: em × fontSize.
// Ağırlık durakları yalnız 400/600/800/900 (§3.1); 900 yalnız uppercase display.
export interface TypeToken {
  fontSize: number;
  fontWeight: '400' | '600' | '800' | '900';
  letterSpacing: number;
  uppercase: boolean;
  tabular: boolean;
}

export const typeScale: Record<
  'overline' | 'caption' | 'body' | 'headline' | 'title' | 'displayS' | 'displayM' | 'displayXL',
  TypeToken
> = {
  overline: { fontSize: 11, fontWeight: '800', letterSpacing: 11 * 0.14, uppercase: true, tabular: true },
  caption: { fontSize: 13, fontWeight: '400', letterSpacing: 0, uppercase: false, tabular: false },
  body: { fontSize: 15, fontWeight: '400', letterSpacing: 0, uppercase: false, tabular: false },
  headline: { fontSize: 17, fontWeight: '600', letterSpacing: 0, uppercase: false, tabular: false },
  title: { fontSize: 22, fontWeight: '900', letterSpacing: 22 * -0.02, uppercase: true, tabular: false },
  displayS: { fontSize: 28, fontWeight: '900', letterSpacing: 28 * -0.02, uppercase: true, tabular: false },
  displayM: { fontSize: 34, fontWeight: '900', letterSpacing: 34 * -0.03, uppercase: true, tabular: false },
  displayXL: { fontSize: 64, fontWeight: '900', letterSpacing: 64 * -0.03, uppercase: false, tabular: true },
};

// §4.1 spacing — izinli kapalı set
export const spacing = { s4: 4, s8: 8, s12: 12, s16: 16, s20: 20, s24: 24, s32: 32, s40: 40 } as const;

// §4.2 radius — ara değer yasak, dairesel FAB yasak
export const radius = { r8: 8, r12: 12, r16: 16, r24: 24, rFull: 999 } as const;

// §4.3 elevation — sıcak-ink gölge çiftleri (temas + ortam), max alfa .18.
// iOS'ta view başına tek gölge: temas iç view'a, ortam wrapper'a uygulanır.
export interface ShadowPair {
  contact: { color: string; offsetY: number; blur: number };
  ambient: { color: string; offsetY: number; blur: number };
}

export const shadow: Record<'s1' | 's2' | 's3' | 's4', ShadowPair> = {
  s1: {
    contact: { color: 'rgba(24,20,12,0.18)', offsetY: 1, blur: 2 },
    ambient: { color: 'rgba(24,20,12,0.14)', offsetY: 4, blur: 10 },
  },
  s2: {
    contact: { color: 'rgba(24,20,12,0.06)', offsetY: 1, blur: 2 },
    ambient: { color: 'rgba(24,20,12,0.10)', offsetY: 8, blur: 20 },
  },
  s3: {
    contact: { color: 'rgba(24,20,12,0.05)', offsetY: 1, blur: 2 },
    ambient: { color: 'rgba(24,20,12,0.12)', offsetY: 16, blur: 40 },
  },
  s4: {
    contact: { color: 'rgba(24,20,12,0.06)', offsetY: 2, blur: 4 },
    ambient: { color: 'rgba(24,20,12,0.16)', offsetY: 24, blur: 64 },
  },
};

// §4.4 cam malzeme — yalnız harita üstünde yüzen öğelerde, ekran başına ≤3 BlurView
export const glass = {
  light: { bg: 'rgba(255,255,255,0.72)', blurIntensity: 75, innerHairline: 'rgba(255,255,255,0.55)', outerHairline: 'rgba(24,20,12,0.05)' },
  dark: { bg: 'rgba(24,24,27,0.66)', blurIntensity: 75, innerHairline: 'rgba(255,255,255,0.10)', outerHairline: 'transparent' },
  fallbackLight: 'rgba(255,255,255,0.92)',
  fallbackDark: 'rgba(28,28,31,0.92)',
} as const;
