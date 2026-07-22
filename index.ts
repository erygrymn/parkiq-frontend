import { registerRootComponent } from 'expo';

// EXPO_PUBLIC_DIAG=1 → reanimated/bottom-sheet içermeyen teşhis kabuğu (AppDiag).
// Koşullu require: yalnız seçilen dal ÇALIŞTIRILIR — reanimated import'u
// modül yükleme anında native tarafı başlattığı için import burada ayrışmak zorunda.
const App =
  process.env.EXPO_PUBLIC_DIAG === '1'
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./AppDiag').default
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('./App').default;

registerRootComponent(App);
