import { CameraView, useCameraPermissions } from 'expo-camera';
import { DeviceMotion } from 'expo-sensors';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryCta } from '../components/Buttons';
import { openAppSettings, StatusLine } from '../components/StatusLine';
import { Caption } from '../components/Typography';
import { formatDistance } from '../lib/geo';
import { getLocale, t } from '../localization';
import { radius, spacing } from '../theme/tokens';

// §7.6 AR katmanı — kamera görüntüsü üstünde arabanın yönü.
//
// DÜRÜSTLÜK NOTU: bu ARKit DEĞİLDİR. Işın dünyaya sabitlenmez; yatay konumu
// pusuladan (bakış yönü ile arabaya olan açı farkı), dikey konumu cihazın
// eğiminden gelir. Telefonu çevirince ışın doğru yönde kalır, ama yürürken
// zeminde "duran" bir nokta gibi kilitlenmez. Gerçek dünya sabitleme için
// ar-find-my-car.md'deki RealityKit planı gerekir.
//
// Yalan söylememek için: ışın yalnız araba görüş açısındayken çizilir; dışarıda
// kalınca yerine kenarda yön oku gösterilir.

/** iPhone ana kamerasının yaklaşık yatay görüş açısı (derece). */
const CAMERA_FOV = 66;

const BEAM_COLOR = '#2FE07A';

/** Zemin okları: yakından uzağa küçülerek ışına doğru daralır (NFS hissi). */
const CHEVRONS = [0, 1, 2, 3, 4];

function useDevicePitch(active: boolean): number {
  const [pitch, setPitch] = useState(0);
  useEffect(() => {
    if (!active) return;
    DeviceMotion.setUpdateInterval(120);
    const sub = DeviceMotion.addListener(({ rotation }) => {
      if (rotation) setPitch(rotation.beta);
    });
    return () => sub.remove();
  }, [active]);
  return pitch;
}

export function ArFindMyCar({
  visible,
  relativeBearingDeg,
  distanceM,
  onClose,
  onFound,
}: {
  visible: boolean;
  /** Arabanın bakış yönüne göre açısı: 0 = tam karşıda, + sağ, − sol. */
  relativeBearingDeg: number | null;
  distanceM: number | null;
  onClose: () => void;
  onFound: () => void;
}) {
  const insets = useSafeAreaInsets();
  const locale = getLocale();
  const { width, height } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const pitch = useDevicePitch(visible);

  useEffect(() => {
    if (visible && permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [visible, permission, requestPermission]);

  if (!visible) return null;

  // Telefon dikken (beta ≈ π/2) ufuk ekranın ortasındadır; aşağı eğdikçe
  // zemin yukarı kayar. Aralık kısıtlanır ki ışın ekrandan fırlamasın.
  const horizon = Math.max(0.25, Math.min(0.75, 0.5 + (pitch - Math.PI / 2) * 0.5));
  const beamBaseY = height * horizon;

  const inView = relativeBearingDeg !== null && Math.abs(relativeBearingDeg) <= CAMERA_FOV / 2;
  const beamX =
    relativeBearingDeg === null ? width / 2 : width / 2 + (relativeBearingDeg / (CAMERA_FOV / 2)) * (width / 2);
  const turnRight = (relativeBearingDeg ?? 0) > 0;

  const granted = permission?.granted === true;

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {granted && <CameraView style={{ position: 'absolute', inset: 0 }} facing="back" />}

      {!granted && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.s24 }}>
          <StatusLine label={t('cameraOff')} onPress={openAppSettings} />
        </View>
      )}

      {granted && (
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
          {inView ? (
            <>
              {/* Zeminden göğe yükselen ışın */}
              <View
                style={{
                  position: 'absolute',
                  left: beamX - 3,
                  top: 0,
                  width: 6,
                  height: beamBaseY,
                  backgroundColor: BEAM_COLOR,
                  opacity: 0.9,
                  borderRadius: 3,
                }}
              />
              {/* Işığın halesi — tek renkli çizgiyi hacimlendirir */}
              <View
                style={{
                  position: 'absolute',
                  left: beamX - 11,
                  top: 0,
                  width: 22,
                  height: beamBaseY,
                  backgroundColor: BEAM_COLOR,
                  opacity: 0.16,
                  borderRadius: 11,
                }}
              />
              {/* Tabandaki halka: arabanın durduğu nokta */}
              <View
                style={{
                  position: 'absolute',
                  left: beamX - 26,
                  top: beamBaseY - 9,
                  width: 52,
                  height: 18,
                  borderRadius: 26,
                  borderWidth: 3,
                  borderColor: BEAM_COLOR,
                  opacity: 0.85,
                }}
              />

              {/* Zemin okları: alt kenardan ışının tabanına doğru daralır */}
              {CHEVRONS.map((step) => {
                const progress = (step + 1) / (CHEVRONS.length + 1);
                const y = height - insets.bottom - 140 - progress * (height - insets.bottom - 140 - beamBaseY);
                const x = width / 2 + (beamX - width / 2) * progress;
                const size = 34 * (1 - progress * 0.55);
                return (
                  <View
                    key={step}
                    style={{
                      position: 'absolute',
                      left: x - size / 2,
                      top: y,
                      width: size,
                      height: size,
                      borderTopWidth: 4,
                      borderRightWidth: 4,
                      borderColor: BEAM_COLOR,
                      opacity: 0.25 + progress * 0.5,
                      transform: [{ rotate: '-45deg' }],
                    }}
                  />
                );
              })}
            </>
          ) : (
            // Araba görüş açısı dışında: nereye döneceğini söyle.
            <View
              style={{
                position: 'absolute',
                top: height / 2 - 40,
                [turnRight ? 'right' : 'left']: spacing.s24,
                alignItems: 'center',
                gap: spacing.s8,
              }}
            >
              <SymbolView
                name={turnRight ? 'arrow.right.circle.fill' : 'arrow.left.circle.fill'}
                size={72}
                tintColor={BEAM_COLOR}
                weight="regular"
              />
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#FFFFFF' }}>{t('arTurn')}</Text>
            </View>
          )}
        </View>
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
          <Text
            style={{
              fontSize: 34,
              fontWeight: '900',
              color: '#FFFFFF',
              fontVariant: ['tabular-nums'],
            }}
          >
            {distanceM === null ? '—' : formatDistance(distanceM, locale)}
          </Text>
          <Caption color="#8A8A93">{t('arHint')}</Caption>
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
        style={{
          position: 'absolute',
          left: spacing.s20,
          right: spacing.s20,
          bottom: insets.bottom + spacing.s20,
        }}
      >
        <PrimaryCta label={t('foundIt')} onPress={onFound} />
      </View>
    </View>
  );
}
