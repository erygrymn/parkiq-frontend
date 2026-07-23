import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryCta } from '../components/Buttons';
import { t, upper } from '../localization';
import { useTheme } from '../theme';
import { spacing } from '../theme/tokens';

// §7.1 — 3 tipografik manifesto posteri.
// POSTER KATMANI: İlke 3 (krem yasağı) ve İlke 6 (tam yüzeyli siyah yasağı)
// istisnaları YALNIZ burada geçerli. App Store screenshot seti bu 3 kareden üretilir.
// Özellik turu YOK; tarife/OCR/LA/paylaşım ilk kullanımda bağlamsal öğretilir.

const CREAM = '#F5F2EB';
const CREAM_DARK = '#131315';
const POSTER_BLACK = '#141416';
const DOT_ON_LIGHT = '#0B7A3E'; // krem üstünde 4.9:1 (accent-fill 2.86:1 kaldığı için yasak)
const DOT_ON_DARK = '#2FE07A';

interface PosterProps {
  width: number;
  background: string;
  title: string;
  titleSize: number;
  titleColor: string;
  dotColor: string;
  body: string;
  bodyColor: string;
  bottomInset: number;
}

function Poster({
  width,
  background,
  title,
  titleSize,
  titleColor,
  dotColor,
  body,
  bodyColor,
  bottomInset,
}: PosterProps) {
  return (
    <View
      style={{
        width,
        flex: 1,
        backgroundColor: background,
        justifyContent: 'center',
        paddingHorizontal: spacing.s24,
        // Alt blok (CTA + noktalar) mutlak konumlu; paragraf onun altına girmesin
        paddingBottom: bottomInset,
      }}
    >
      <View style={{ gap: spacing.s16 }}>
        {/* Poster noktası: §3.3 whitelist'inin "onboarding manifesto noktaları" maddesi */}
        <Text
          style={{
            fontSize: titleSize,
            // Türkçe İ/Ğ gibi harflerin üstü kırpılmasın diye ascender payı bırakılır
            lineHeight: titleSize * 1.16,
            fontWeight: '900',
            letterSpacing: titleSize * -0.03,
            color: titleColor,
          }}
          allowFontScaling={false}
        >
          {upper(title)}
          <Text style={{ color: dotColor }}>.</Text>
        </Text>
        {/* Açıklama cümle düzeninde: manifesto başlığı bağırır, gövde anlatır */}
        <Text
          style={{ fontSize: 17, lineHeight: 25, fontWeight: '400', color: bodyColor, maxWidth: 460 }}
          maxFontSizeMultiplier={1.4}
        >
          {body}
        </Text>
      </View>
    </View>
  );
}

export function Onboarding({ onDone }: { onDone: () => void }) {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get('window');
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // §7.1: girişte 200ms fade/rise. Reduced-motion açıksa hareket yok (§9).
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced) {
        anim.setValue(1);
        return;
      }
      Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }, [anim]);

  const lightBg = scheme === 'dark' ? CREAM_DARK : CREAM;
  const lightInk = scheme === 'dark' ? '#F0F0F2' : colors.ink;
  const lightDot = scheme === 'dark' ? DOT_ON_DARK : DOT_ON_LIGHT;
  const bodyOnLight = scheme === 'dark' ? '#9B9BA4' : '#5A5A64';

  // Alt blok mutlak konumlu: son sayfada CTA + "şimdi değil" + noktalar taşır,
  // diğerlerinde yalnız noktalar. Paragraf ikisinin de altına girmesin.
  const bottomInsetShort = insets.bottom + 72;
  const bottomInsetTall = insets.bottom + 160;

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const requestLocation = () => {
    void Location.requestForegroundPermissionsAsync().finally(onDone);
  };

  return (
    <Animated.View
      style={{
        flex: 1,
        backgroundColor: page === 1 ? POSTER_BLACK : lightBg,
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      }}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={{ flex: 1 }}
      >
        <Poster
          width={width}
          background={lightBg}
          title={t('onbTitle1')}
          titleSize={Math.min(84, width * 0.19)}
          titleColor={lightInk}
          dotColor={lightDot}
          body={t('onbBody1')}
          bodyColor={bodyOnLight}
          bottomInset={bottomInsetShort}
        />

        {/* S2 — her iki temada siyah; İlke 6'nın poster istisnası */}
        <Poster
          width={width}
          background={POSTER_BLACK}
          title={t('onbTitle2')}
          titleSize={Math.min(66, width * 0.155)}
          titleColor="#FFFFFF"
          dotColor={DOT_ON_DARK}
          body={t('onbBody2')}
          bodyColor="#9B9BA4"
          bottomInset={bottomInsetShort}
        />

        <Poster
          width={width}
          background={lightBg}
          title={t('onbTitle3')}
          titleSize={Math.min(72, width * 0.165)}
          titleColor={lightInk}
          dotColor={lightDot}
          body={t('onbBody3')}
          bodyColor={bodyOnLight}
          bottomInset={bottomInsetTall}
        />
      </ScrollView>

      {/* Skip — sağ üst text buton */}
      {page < 2 && (
        <Pressable
          accessibilityRole="button"
          onPress={onDone}
          hitSlop={12}
          style={{ position: 'absolute', top: insets.top + spacing.s12, right: spacing.s20 }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: page === 1 ? '#8A8A93' : lightInk }}>
            {t('skip')}
          </Text>
        </Pressable>
      )}

      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: insets.bottom + spacing.s20,
          paddingHorizontal: spacing.s24,
          gap: spacing.s20,
        }}
      >
        {/* S3: bu ekranın kendisi pre-prompt'tur — ayrı açıklama kartı yok (§7.1) */}
        {page === 2 && (
          <View style={{ gap: spacing.s8 }}>
            <PrimaryCta label={t('enableLocation')} onPress={requestLocation} />
            <Pressable accessibilityRole="button" onPress={onDone} hitSlop={8} style={{ alignSelf: 'center' }}>
              <Text style={{ fontSize: 15, color: scheme === 'dark' ? '#9B9BA4' : '#6E6E78' }}>
                {t('notNow')}
              </Text>
            </Pressable>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: spacing.s8, justifyContent: 'center' }}>
          {/* Pasif noktalar posterin kendi mürekkebinin soluk hali. Sabit rgba
              kullanılınca koyu temada koyu zemin üstünde görünmez oluyordu. */}
          {[0, 1, 2].map((index) => (
            <View
              key={index}
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: page === 1 ? '#FFFFFF' : lightInk,
                opacity: index === page ? 1 : 0.3,
              }}
            />
          ))}
        </View>
      </View>
    </Animated.View>
  );
}
