import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { hapticStamp } from '../../lib/haptics';
import { useUiStore } from '../../state/uiStore';
import { useTheme } from '../../theme';
import { CROSSFADE_MS } from '../../theme/motion';
import { radius, shadow, spacing } from '../../theme/tokens';
import { Stamp } from './Stamp';

// design.md §7.11 başarı durumu: paywall kapanır, geldiği ekranda "PRO." damgası (ink nokta:
// satın alma para/şarj/canlı değildir) + notificationSuccess. Kart 1.6 s sonra kendi çekilir.

const SHOW_MS = 1600;

export function ProStamp() {
  const { colors, scheme } = useTheme();
  const shownAt = useUiStore((s) => s.proStampAt);
  const clear = useUiStore((s) => s.clearProStamp);

  useEffect(() => {
    if (shownAt === null) return;
    const id = setTimeout(clear, SHOW_MS);
    return () => clearTimeout(id);
  }, [shownAt, clear]);

  if (shownAt === null) return null;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      <Animated.View
        entering={FadeIn.duration(CROSSFADE_MS)}
        exiting={FadeOut.duration(CROSSFADE_MS)}
        style={{
          paddingHorizontal: spacing.s32,
          paddingVertical: spacing.s24,
          borderRadius: radius.r24,
          borderCurve: 'continuous',
          backgroundColor: colors.card,
          shadowColor: shadow.s4.ambient.color,
          shadowOffset: { width: 0, height: shadow.s4.ambient.offsetY },
          shadowRadius: shadow.s4.ambient.blur,
          shadowOpacity: scheme === 'dark' ? 0 : 1,
        }}
      >
        <Stamp key={shownAt} text="PRO" dotColor={colors.ink} size="S" onLanded={hapticStamp} />
      </Animated.View>
    </View>
  );
}
