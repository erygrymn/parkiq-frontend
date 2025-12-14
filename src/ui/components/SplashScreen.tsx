import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme/theme";
import { textStyles } from "../typography";

const { width, height } = Dimensions.get("window");

// Animated loading dots component
const AnimatedLoadingDots: React.FC<{ theme: any }> = ({ theme }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    animateDot(dot1, 0).start();
    animateDot(dot2, 200).start();
    animateDot(dot3, 400).start();
  }, []);

  const opacity1 = dot1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });
  const opacity2 = dot2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });
  const opacity3 = dot3.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <View style={styles.loadingContainer}>
      <Animated.View
        style={[
          styles.loadingDot,
          {
            backgroundColor: theme.colors.accent,
            opacity: opacity1,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.loadingDot,
          {
            backgroundColor: theme.colors.accent,
            opacity: opacity2,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.loadingDot,
          {
            backgroundColor: theme.colors.accent,
            opacity: opacity3,
          },
        ]}
      />
    </View>
  );
};

export const SplashScreen: React.FC = () => {
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoRotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Logo rotation animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoRotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotateAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse animation for accent circle
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const logoRotation = logoRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "15deg"],
  });

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.bg,
        },
      ]}
    >
      {/* Background gradient circles */}
      <Animated.View
        style={[
          styles.circle1,
          {
            backgroundColor: theme.isDark
              ? "rgba(48, 209, 88, 0.08)"
              : "rgba(48, 209, 88, 0.12)",
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.circle2,
          {
            backgroundColor: theme.isDark
              ? "rgba(48, 209, 88, 0.05)"
              : "rgba(48, 209, 88, 0.08)",
          },
        ]}
      />

      {/* Main content */}
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Logo container with rotation */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ rotate: logoRotation }],
            },
          ]}
        >
          <View
            style={[
              styles.logoCircle,
              {
                backgroundColor: theme.colors.accent,
                shadowColor: theme.colors.accent,
              },
            ]}
          >
            <Ionicons name="car" size={64} color="#FFFFFF" />
          </View>
        </Animated.View>

        {/* App name */}
        <Text
          style={[
            textStyles.title,
            {
              color: theme.colors.textPrimary,
              fontSize: 36,
              fontWeight: "700",
              marginTop: theme.spacing.s24,
              letterSpacing: -0.5,
            },
          ]}
        >
          ParkIQ
        </Text>

        {/* Tagline */}
        <Text
          style={[
            textStyles.body,
            {
              color: theme.colors.textSecondary,
              marginTop: theme.spacing.s8,
              fontSize: 16,
            },
          ]}
        >
          Smart Parking Made Simple
        </Text>

        {/* Loading indicator with animation */}
        <AnimatedLoadingDots theme={theme} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  circle1: {
    position: "absolute",
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    top: -width * 0.3,
    right: -width * 0.2,
  },
  circle2: {
    position: "absolute",
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: width * 0.75,
    bottom: -width * 0.4,
    left: -width * 0.3,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  logoContainer: {
    marginBottom: 8,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowOpacity: 0.4,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {
        elevation: 12,
      },
    }),
  },
  loadingContainer: {
    flexDirection: "row",
    marginTop: 32,
    gap: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
});

