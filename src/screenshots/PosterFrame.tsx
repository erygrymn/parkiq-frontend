import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme/tokens';

// aso.md §4 kare 4 — tipografik manifesto. Ürün ekranı DEĞİL, bu yüzden hiçbir
// gerçek yüzeyden türetilemiyor: design.md §7.1 poster katmanının kurallarıyla
// burada çizilir ve cihazdan tam çözünürlükte fotoğraflanır.
//
// İddia sınırı (aso.md 2026-09-11 kuralı): yalnız reklam/hesap/kayıt yokluğu.
// Veri akışı ("cihazdan çıkmaz", "takip yok") bu kareye GİREMEZ.

const POSTER_BLACK = '#141416';
const DOT_ON_DARK = '#2FE07A';

const LINES: Record<'en' | 'tr', string[]> = {
  en: ['NO ADS.', 'NO ACCOUNT.', 'NO SIGN-UP.'],
  tr: ['REKLAM YOK.', 'HESAP YOK.', 'KAYIT YOK.'],
};

export function PosterFrame({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [lang, setLang] = useState<'en' | 'tr'>('en');
  const lines = LINES[lang];

  return (
    <Modal visible={visible} animationType="fade" presentationStyle="fullScreen">
      <View style={{ flex: 1, backgroundColor: POSTER_BLACK, justifyContent: 'center', paddingHorizontal: spacing.s24 }}>
        {lines.map((line) => (
          <Text
            key={line}
            allowFontScaling={false}
            style={{ fontSize: 52, lineHeight: 60, fontWeight: '900', letterSpacing: -1.6, color: '#FFFFFF' }}
          >
            {line.slice(0, -1)}
            <Text style={{ color: DOT_ON_DARK }}>.</Text>
          </Text>
        ))}

        {/* Kareyi kirletmeyen kontroller: alt kenarda, kadrajın dışında kalacak kadar küçük. */}
        <View
          style={{
            position: 'absolute',
            left: spacing.s24,
            right: spacing.s24,
            bottom: insets.bottom + spacing.s8,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <Pressable accessibilityRole="button" onPress={() => setLang(lang === 'en' ? 'tr' : 'en')} hitSlop={12}>
            <Text style={{ fontSize: 11, color: '#3A3A40' }}>{lang === 'en' ? 'TR' : 'EN'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={12}>
            <Text style={{ fontSize: 11, color: '#3A3A40' }}>close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
