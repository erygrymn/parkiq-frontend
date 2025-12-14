import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Animated,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { PrimaryButton } from "../../ui/components/Button";
import { useTheme } from "../../ui/theme/theme";
import { textStyles } from "../../ui/typography";
import { t } from "../../localization";
import * as SecureStore from "expo-secure-store";

const { width } = Dimensions.get("window");

interface OnboardingSlide {
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: string;
  descriptionKey: string;
  color: string;
}

const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    icon: "map-outline",
    titleKey: "onboarding.slide1Title",
    descriptionKey: "onboarding.slide1Description",
    color: "#30D158",
  },
  {
    icon: "time-outline",
    titleKey: "onboarding.slide2Title",
    descriptionKey: "onboarding.slide2Description",
    color: "#007AFF",
  },
  {
    icon: "cash-outline",
    titleKey: "onboarding.slide3Title",
    descriptionKey: "onboarding.slide3Description",
    color: "#FF9500",
  },
  {
    icon: "car-outline",
    titleKey: "onboarding.slide4Title",
    descriptionKey: "onboarding.slide4Description",
    color: "#30D158",
  },
];

const HAS_SEEN_ONBOARDING_KEY = "parkiq_has_seen_onboarding";

export const OnboardingScreen: React.FC<{
  onComplete: () => void;
}> = ({ onComplete }) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      scrollViewRef.current?.scrollTo({
        x: nextIndex * width,
        animated: true,
      });
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      await SecureStore.setItemAsync(HAS_SEEN_ONBOARDING_KEY, "true");
      onComplete();
    } catch (error) {
      console.error("Failed to save onboarding status", error);
      onComplete();
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const handleMomentumScrollEnd = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.bg,
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {/* Skip button */}
      {currentIndex < ONBOARDING_SLIDES.length - 1 && (
        <View style={styles.skipContainer}>
        <PrimaryButton
          title={t("onboarding.skip")}
          onPress={handleSkip}
          fullWidth={false}
          style={{
            backgroundColor: "transparent",
            paddingHorizontal: 20,
            height: 40,
          }}
        />
        </View>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
      >
        {ONBOARDING_SLIDES.map((slide, index) => (
          <View key={index} style={[styles.slide, { width }]}>
            <View style={styles.slideContent}>
              {/* Icon */}
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: `${slide.color}15`,
                  },
                ]}
              >
                <Ionicons
                  name={slide.icon}
                  size={80}
                  color={slide.color}
                />
              </View>

              {/* Title */}
              <Text
                style={[
                  textStyles.title,
                  {
                    color: theme.colors.textPrimary,
                    fontSize: 28,
                    fontWeight: "700",
                    marginTop: theme.spacing.s32,
                    marginBottom: theme.spacing.s16,
                    textAlign: "center",
                  },
                ]}
              >
                {t(slide.titleKey)}
              </Text>

              {/* Description */}
              <Text
                style={[
                  textStyles.body,
                  {
                    color: theme.colors.textSecondary,
                    fontSize: 16,
                    textAlign: "center",
                    paddingHorizontal: theme.spacing.s32,
                    lineHeight: 24,
                  },
                ]}
              >
                {t(slide.descriptionKey)}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Pagination dots */}
      <View style={styles.pagination}>
        {ONBOARDING_SLIDES.map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ];
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 24, 8],
            extrapolate: "clamp",
          });
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: "clamp",
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  width: dotWidth,
                  opacity,
                  backgroundColor: theme.colors.accent,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Next/Get Started button */}
      <View style={styles.buttonContainer}>
        <PrimaryButton
          title={currentIndex === ONBOARDING_SLIDES.length - 1 ? t("onboarding.getStarted") : t("onboarding.next")}
          onPress={handleNext}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipContainer: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
  },
  slide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  slideContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 8,
      },
    }),
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
});

// Check if user has seen onboarding
export const hasSeenOnboarding = async (): Promise<boolean> => {
  try {
    const value = await SecureStore.getItemAsync(HAS_SEEN_ONBOARDING_KEY);
    return value === "true";
  } catch {
    return false;
  }
};

