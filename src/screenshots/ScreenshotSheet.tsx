import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { PageSheet } from '../components/PageSheet';
import { PressScale } from '../components/motion/PressScale';
import { Caption } from '../components/Typography';
import { useTheme } from '../theme';
import { spacing } from '../theme/tokens';
import { PosterFrame } from './PosterFrame';
import { SCENARIOS } from './scenarios';

/**
 * Ekran görüntüsü sahne seçici — YALNIZ `__DEV__` (Ayarlar > Geliştirici).
 *
 * Bir satıra dokunmak store'lara sahte durumu basar ve sheet'i kapatır; arkada
 * duran GERÇEK yüzey o durumu render eder. Kare numaraları aso.md §4 tablosuyla
 * birebir aynı; orada sıra değişirse burası da değişir.
 */
export function ScreenshotSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const [posterOpen, setPosterOpen] = useState(false);

  return (
    <PageSheet visible={visible} title="Screenshots" onClose={onClose}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.s32 }}>
        <Caption style={{ paddingBottom: spacing.s12 }}>
          aso.md §4. Picking a scene closes this sheet; capture the frame from the real screen behind it.
        </Caption>
        <View style={{ borderTopWidth: 1, borderTopColor: colors.gridline }}>
          {SCENARIOS.map((scenario) => (
            <PressScale
              key={scenario.key}
              accessibilityRole="button"
              onPress={() => {
                if (scenario.key === 'poster') {
                  setPosterOpen(true);
                  return;
                }
                scenario.apply();
                onClose();
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
      </ScrollView>
      <PosterFrame visible={posterOpen} onClose={() => setPosterOpen(false)} />
    </PageSheet>
  );
}
