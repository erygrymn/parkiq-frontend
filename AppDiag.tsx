import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MapCanvas } from './src/screens/MapCanvas';
import { ThemeProvider, useTheme } from './src/theme';
import { radius, typeScale } from './src/theme/tokens';

// TEŞHİS KABUĞU (EXPO_PUBLIC_DIAG=1): reanimated / worklets / gesture-handler /
// bottom-sheet İMPORT EDİLMEZ. Bu kabuk Expo Go'da açılıyorsa crash o katmandadır;
// bu da açılmıyorsa sorun Expo Go build'inin kendisindedir (iOS 26 PAC).

function DiagShell() {
  const { colors, scheme } = useTheme();
  const [taps, setTaps] = useState(0);
  return (
    <View style={styles.container}>
      <MapCanvas />
      <Text
        style={{
          fontSize: typeScale.displayM.fontSize,
          fontWeight: typeScale.displayM.fontWeight,
          letterSpacing: typeScale.displayM.letterSpacing,
          color: colors.ink,
        }}
      >
        PARKIQ
        <Text style={{ color: colors.accentText }}>.</Text>
      </Text>
      <Pressable
        onPress={() => setTaps((n) => n + 1)}
        style={{
          height: 52,
          minWidth: 200,
          paddingHorizontal: 24,
          borderRadius: radius.rFull,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.ink,
        }}
      >
        <Text style={{ fontSize: 17, fontWeight: '600', color: scheme === 'dark' ? '#141416' : '#FFFFFF' }}>
          JS canlı · {taps}
        </Text>
      </Pressable>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </View>
  );
}

export default function AppDiag() {
  return (
    <ThemeProvider>
      <DiagShell />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
});
