import { StyleSheet } from "react-native";
import { tokens } from "./theme/tokens";

export const textStyles = StyleSheet.create({
  navTitle: {
    fontSize: tokens.typography.navTitle.fontSize,
    fontWeight: tokens.typography.navTitle.fontWeight as "600",
    letterSpacing: tokens.typography.navTitle.letterSpacing,
    lineHeight: tokens.typography.navTitle.lineHeight,
  },
  title: {
    fontSize: tokens.typography.title.fontSize,
    fontWeight: tokens.typography.title.fontWeight as "700",
    letterSpacing: tokens.typography.title.letterSpacing,
    lineHeight: tokens.typography.title.lineHeight,
  },
  section: {
    fontSize: tokens.typography.section.fontSize,
    fontWeight: tokens.typography.section.fontWeight as "600",
    letterSpacing: tokens.typography.section.letterSpacing,
    lineHeight: tokens.typography.section.lineHeight,
  },
  body: {
    fontSize: tokens.typography.body.fontSize,
    fontWeight: tokens.typography.body.fontWeight as "400",
    lineHeight: tokens.typography.body.lineHeight,
  },
  sub: {
    fontSize: tokens.typography.sub.fontSize,
    fontWeight: tokens.typography.sub.fontWeight as "400",
    lineHeight: tokens.typography.sub.lineHeight,
  },
  caption: {
    fontSize: tokens.typography.caption.fontSize,
    fontWeight: tokens.typography.caption.fontWeight as "500",
    lineHeight: tokens.typography.caption.lineHeight,
  },
  tabLabel: {
    fontSize: tokens.typography.tabLabel.fontSize,
    fontWeight: tokens.typography.tabLabel.fontWeight as "600",
    lineHeight: tokens.typography.tabLabel.lineHeight,
  },
  timer: {
    fontSize: tokens.typography.timer.fontSize,
    fontWeight: tokens.typography.timer.fontWeight as "700",
    letterSpacing: tokens.typography.timer.letterSpacing,
    lineHeight: tokens.typography.timer.lineHeight,
  },
});
