import { Text, View } from 'react-native';
import { PressScale } from '../components/motion/PressScale';
import { Caption } from '../components/Typography';
import { useUiStore } from '../state/uiStore';
import { useTheme } from '../theme';
import { spacing } from '../theme/tokens';
import { startDemoReel, stopDemoReel } from './demoReel';
import { SCENARIOS } from './scenarios';

/**
 * Ekran görüntüsü sahne listesi — YALNIZ `__DEV__`, Ayarlar > Geliştirici içinde.
 *
 * Kendi Modal'ı YOK, bilerek. Önce ayrı bir `PageSheet` idi ve iki hata üretti:
 * Ayarlar kapanınca çocuk Modal öksüz kalıp bomboş beyaz bir sayfa olarak
 * ekranda asılı kalıyordu, bir de sahne seçilince Ayarlar kapanmadığı için kare
 * panelin arkasında kalıyordu. İç içe Modal'ın zamanlamasıyla uğraşmak yerine iç
 * içelik kaldırıldı — design.md İlke 9 zaten bunu söylüyor.
 *
 * Sahte EKRAN yazılmaz, sahte DURUM yazılır: satıra dokunmak store'lara state
 * basar, kareyi üretimdeki gerçek yüzey çizer.
 */
export function ScreenshotScenes({ onDone }: { onDone: () => void }) {
  const { colors } = useTheme();

  return (
    <View>
      <Caption style={{ paddingTop: spacing.s12, paddingBottom: spacing.s8 }}>
        aso.md §4. Sahne seçilince Ayarlar kapanır; kareyi arkadaki gerçek ekrandan al.
      </Caption>
      <View style={{ borderTopWidth: 1, borderTopColor: colors.gridline }}>
        {[...SCENARIOS]
          .sort((a, b) => (a.frame || 99) - (b.frame || 99))
          .map((scenario) => (
            <PressScale
              key={scenario.key}
              accessibilityRole="button"
              onPress={() => {
                // Her seçim önce çalışan reel'i durdurur: iki zamanlayıcı seti
                // aynı store'u çekiştirirse sahne kendi kendini bozar.
                stopDemoReel();
                if (scenario.key === 'poster') {
                  useUiStore.getState().openPoster();
                } else if (scenario.key === 'demo-reel') {
                  startDemoReel();
                } else {
                  scenario.apply();
                }
                onDone();
              }}
              style={(pressed) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.s16,
                paddingVertical: spacing.s12,
                borderBottomWidth: 1,
                borderBottomColor: colors.gridline,
                backgroundColor: pressed ? colors.inset : 'transparent',
              })}
            >
              <Text
                style={{
                  width: 24,
                  fontSize: 15,
                  fontWeight: '800',
                  color: scenario.frame === 0 ? colors.textTertiary : colors.accentText,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {scenario.frame === 0 ? '—' : scenario.frame}
              </Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: colors.ink }}>{scenario.label}</Text>
                <Caption>{scenario.hint}</Caption>
              </View>
            </PressScale>
          ))}
      </View>
    </View>
  );
}
