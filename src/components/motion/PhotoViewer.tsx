import { Image } from 'expo-image';
import { useEffect, useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUiStore, type PhotoOrigin } from '../../state/uiStore';
import { CROSSFADE_MS, springTo, useReducedMotion } from '../../theme/motion';
import { radius } from '../../theme/tokens';

// design.md §5 Foto: thumbnail dokununca YERİNDE büyür (Modal değil). Kök overlay, thumbnail'in
// ekran merkezinden ölçek + kayma ile ekrana yayılır; scrim 200 ms; dokununca tersi.

/** Ölçüsünü alıp görüntüleyiciyi açan thumbnail sarmalayıcı. */
export function PhotoThumb({
  uri,
  style,
  children,
}: {
  uri: string;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const ref = useRef<View>(null);
  const openPhoto = useUiStore((s) => s.openPhoto);
  return (
    <Pressable
      accessibilityRole="imagebutton"
      onPress={() => {
        ref.current?.measureInWindow((x, y, width, height) => openPhoto(uri, { x, y, width, height }));
      }}
    >
      <View ref={ref} collapsable={false} style={style}>
        {children}
      </View>
    </Pressable>
  );
}

function centerOf(origin: PhotoOrigin) {
  return { x: origin.x + origin.width / 2, y: origin.y + origin.height / 2 };
}

export function PhotoViewer() {
  const photo = useUiStore((s) => s.photo);
  const closePhoto = useUiStore((s) => s.closePhoto);
  const reduced = useReducedMotion();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);
  const originX = useSharedValue(width / 2);
  const originY = useSharedValue(height / 2);

  useEffect(() => {
    if (!photo) return;
    const center = centerOf(photo.origin);
    originX.value = center.x;
    originY.value = center.y;
    progress.value = 0;
    progress.value = springTo(1, reduced);
  }, [photo, reduced, progress, originX, originY]);

  const close = () => {
    progress.value = withTiming(0, { duration: CROSSFADE_MS }, (finished) => {
      'worklet';
      if (finished) runOnJS(closePhoto)();
    });
  };

  const scrim = useAnimatedStyle(() => ({ opacity: progress.value }));
  const frame = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p,
      transform: [
        { translateX: (originX.value - width / 2) * (1 - p) },
        { translateY: (originY.value - height / 2) * (1 - p) },
        { scale: 0.6 + 0.4 * p },
      ],
    };
  });

  if (!photo) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.92)' }, scrim]}>
        <Pressable accessibilityRole="button" onPress={close} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            top: insets.top,
            bottom: insets.bottom,
            justifyContent: 'center',
          },
          frame,
        ]}
      >
        <Image
          source={{ uri: photo.uri }}
          style={{ width: '100%', height: '100%', borderRadius: radius.r16 }}
          contentFit="contain"
          accessibilityIgnoresInvertColors
        />
      </Animated.View>
    </View>
  );
}
