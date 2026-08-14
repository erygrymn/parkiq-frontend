import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isArAvailable, ParkiqArView, type ArStatus } from '../../modules/parkiq-ar';
import { PrimaryCta } from '../components/Buttons';
import { Caption } from '../components/Typography';
import type { Coords } from '../lib/geo';
import { formatDistance } from '../lib/geo';
import { getLocale, t } from '../localization';
import { radius, spacing } from '../theme/tokens';

// §7.6 AR — ARKit dünya takibi üstünde HUD.
//
// Sahne (huzme, zemin okları, taban halkası) RealityKit'te yaşar ve dünyaya
// SABİTLENİR; bu dosya yalnız üstteki okunabilir katmanı çizer. Konum akışı
// FindMyCar'da tektir, buraya prop olarak iner — ikinci bir GPS aboneliği yok.

export { isArAvailable };

export function ArFindMyCar({
  car,
  user,
  distanceM,
  onClose,
  onFound,
}: {
  car: Coords;
  user: Coords | null;
  distanceM: number | null;
  onClose: () => void;
  onFound: () => void;
}) {
  const insets = useSafeAreaInsets();
  const locale = getLocale();
  const [status, setStatus] = useState<ArStatus>('initializing');

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {ParkiqArView !== null && (
        <ParkiqArView
          style={StyleSheet.absoluteFill}
          car={car}
          user={user}
          onStatus={(event) => setStatus(event.nativeEvent.state)}
        />
      )}

      {/* HUD: mesafe + kapat. Kamera üstünde okunabilirlik için koyu kart. */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + spacing.s12,
          left: spacing.s20,
          right: spacing.s20,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.s12,
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(16,16,18,0.72)',
            borderRadius: radius.r16,
            paddingHorizontal: spacing.s16,
            paddingVertical: spacing.s12,
          }}
        >
          <Text style={{ fontSize: 34, fontWeight: '900', color: '#FFFFFF', fontVariant: ['tabular-nums'] }}>
            {distanceM === null ? '—' : formatDistance(distanceM, locale)}
          </Text>
          {/* Takip oturmadan huzme yerleştirilmez; kullanıcıya sebebi söylenir. */}
          <Caption color="#8A8A93">
            {status === 'near'
              ? t('youAreClose')
              : status === 'ready'
                ? t('arHint')
                : status === 'failed'
                  ? t('arFailed')
                  : t('arInitializing')}
          </Caption>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('close')}
          onPress={onClose}
          hitSlop={8}
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.r12,
            backgroundColor: 'rgba(16,16,18,0.72)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <SymbolView name="xmark" size={16} tintColor="#FFFFFF" weight="semibold" />
        </Pressable>
      </View>

      <View
        style={{ position: 'absolute', left: spacing.s20, right: spacing.s20, bottom: insets.bottom + spacing.s20 }}
      >
        <PrimaryCta label={t('foundIt')} onPress={onFound} />
      </View>
    </View>
  );
}
