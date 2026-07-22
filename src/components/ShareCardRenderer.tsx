import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { CARD_HEIGHT, CARD_WIDTH, SavingsCard, type SavingsCardData } from './SavingsCard';

// Kartı ekran DIŞINDA tam çözünürlükte render edip görsel olarak yakalar.
// Kullanıcı kartı hiç "ekranda" görmez; doğrudan paylaşım sayfası açılır.
// Kart app koordinat uzayı dışındadır (§11.1) — bu yüzden ölçek burada verilir.

const PREVIEW_SCALE = 0.001; // görünmez ama layout hesaplansın diye sıfır değil

export function ShareCardRenderer({
  data,
  onDone,
}: {
  data: SavingsCardData | null;
  onDone: () => void;
}) {
  const cardRef = useRef<View>(null);
  const [mounted, setMounted] = useState(false);

  // İlk kare çizildikten sonra yakala: aksi halde boş görsel çıkar.
  useEffect(() => {
    if (!data) return;
    setMounted(true);
  }, [data]);

  useEffect(() => {
    if (!data || !mounted) return;
    let cancelled = false;

    const timer = setTimeout(() => {
      void (async () => {
        try {
          const uri = await captureRef(cardRef, {
            format: 'png',
            quality: 1,
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
          });
          if (cancelled) return;
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
          }
        } catch {
          // Yakalama başarısızsa sessizce geç: kutlama ekranı bozulmasın.
        } finally {
          if (!cancelled) onDone();
        }
      })();
    }, 80);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [data, mounted, onDone]);

  if (!data) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: -CARD_WIDTH * 2,
        top: 0,
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        opacity: PREVIEW_SCALE,
      }}
    >
      <View ref={cardRef} collapsable={false}>
        <SavingsCard data={data} />
      </View>
    </View>
  );
}
