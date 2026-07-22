import * as Location from 'expo-location';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { t } from '../localization';
import type { Coords } from '../lib/geo';
import { useTheme } from '../theme';
import { glass, radius, shadow, spacing } from '../theme/tokens';
import { Caption } from './Typography';

// §7.2 "Where to?" — hedefi ara, ORANIN çevresindeki otoparkları gör.
// Geocoding cihazın native motoru (expo-location) — anahtarsız, Google yok.
// Harita üstünde yüzen cam yüzey (§4.4: cam yalnız harita üstünde).

export interface SearchResult {
  label: string;
  coords: Coords;
}

async function geocode(query: string): Promise<SearchResult[]> {
  try {
    const matches = await Location.geocodeAsync(query);
    const results: SearchResult[] = [];
    for (const match of matches.slice(0, 5)) {
      results.push({
        label: query,
        coords: { latitude: match.latitude, longitude: match.longitude },
      });
    }
    // Native geocoder etiket döndürmediği için adı ters geocoding ile zenginleştir.
    return await Promise.all(
      results.map(async (result) => {
        try {
          const [place] = await Location.reverseGeocodeAsync(result.coords);
          const label = [place?.name, place?.district ?? place?.city].filter(Boolean).join(' · ');
          return label ? { ...result, label } : result;
        } catch {
          return result;
        }
      }),
    );
  } catch {
    return [];
  }
}

export function SearchBar({ onPick, onLocate }: { onPick: (result: SearchResult) => void; onLocate: () => void }) {
  const { colors, scheme } = useTheme();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Yazarken 500ms bekle: her tuşta geocode çalıştırmak pil ve doğruluk düşmanı.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      void geocode(trimmed).then((next) => {
        if (cancelled) return;
        setResults(next);
        setSearching(false);
      });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const surface = scheme === 'dark' ? glass.fallbackDark : glass.fallbackLight;

  return (
    <View style={{ gap: spacing.s8 }}>
      <View style={{ flexDirection: 'row', gap: spacing.s8 }}>
        <View
          style={{
            flex: 1,
            height: 44,
            borderRadius: radius.r12,
            backgroundColor: surface,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.s8,
            paddingHorizontal: spacing.s12,
            shadowColor: shadow.s2.ambient.color,
            shadowOffset: { width: 0, height: shadow.s2.ambient.offsetY },
            shadowRadius: shadow.s2.ambient.blur,
            shadowOpacity: scheme === 'dark' ? 0 : 1,
          }}
        >
          <SymbolView name="magnifyingglass" size={15} tintColor={colors.textSecondary} weight="regular" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('whereTo')}
            placeholderTextColor={colors.textSecondary}
            returnKeyType="search"
            style={{ flex: 1, fontSize: 15, color: colors.ink }}
          />
          {searching && <ActivityIndicator size="small" color={colors.textSecondary} />}
          {query.length > 0 && !searching && (
            <Pressable accessibilityRole="button" onPress={() => setQuery('')} hitSlop={8}>
              <SymbolView name="xmark.circle.fill" size={15} tintColor={colors.disabled} weight="regular" />
            </Pressable>
          )}
        </View>

        {/* §5.4 kare cam ikon buton — konuma dön */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('myLocation')}
          onPress={onLocate}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: radius.r12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? colors.insetPressed : surface,
            shadowColor: shadow.s2.ambient.color,
            shadowOffset: { width: 0, height: shadow.s2.ambient.offsetY },
            shadowRadius: shadow.s2.ambient.blur,
            shadowOpacity: scheme === 'dark' ? 0 : 1,
          })}
        >
          <SymbolView name="location.north.fill" size={17} tintColor={colors.ink} weight="light" />
        </Pressable>
      </View>

      {results.length > 0 && (
        <View style={{ backgroundColor: colors.card, borderRadius: radius.r12, overflow: 'hidden' }}>
          {results.map((result, index) => (
            <Pressable
              key={`${result.coords.latitude},${result.coords.longitude},${index}`}
              accessibilityRole="button"
              onPress={() => {
                onPick(result);
                setQuery('');
                setResults([]);
              }}
              style={({ pressed }) => ({
                paddingHorizontal: spacing.s12,
                height: 44,
                justifyContent: 'center',
                backgroundColor: pressed ? colors.insetPressed : 'transparent',
                borderTopWidth: index === 0 ? 0 : 1,
                borderTopColor: colors.gridline,
              })}
            >
              <Text numberOfLines={1} style={{ fontSize: 15, color: colors.ink }}>
                {result.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {query.trim().length >= 3 && !searching && results.length === 0 && (
        <Caption>{t('noResults')}</Caption>
      )}
    </View>
  );
}
