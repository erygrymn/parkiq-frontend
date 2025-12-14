import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TABBAR_TOTAL_HEIGHT } from "../ui/theme/tokens";

export const useBottomTabBarHeight = (): number => {
  const insets = useSafeAreaInsets();
  return insets.bottom + TABBAR_TOTAL_HEIGHT;
};
