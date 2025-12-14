import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../theme";

interface SectionProps {
  title?: string;
  children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({ title, children }) => {
  const theme = useTheme();

  const childrenArray = React.Children.toArray(children);
  const childrenWithLastBorderRemoved = React.Children.map(childrenArray, (child, index) => {
    if (React.isValidElement(child) && index === childrenArray.length - 1) {
      return React.cloneElement(child as React.ReactElement<any>, {
        style: [{ borderBottomWidth: 0 }, (child as any).props?.style],
      });
    }
    return child;
  });

  return (
    <View style={styles.container}>
      {title && (
        <Text
          style={[
            styles.title,
            {
              color: theme.colors.textSecondary,
              fontSize: theme.typography.caption.fontSize,
              marginBottom: theme.spacing.sm,
              paddingHorizontal: 0,
            },
          ]}
        >
          {title.toUpperCase()}
        </Text>
      )}
      <View
        style={[
          styles.content,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radii.card,
            borderWidth: 0.5,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {childrenWithLastBorderRemoved}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  content: {
    overflow: "hidden",
  },
});

