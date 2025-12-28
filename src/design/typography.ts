/**
 * Typography Stilleri
 * Tema token'larından oluşturulan text stilleri
 */

import { StyleSheet } from "react-native";
import { designTokens } from "./tokens";

export const textStyles = StyleSheet.create({
  navTitle: {
    fontSize: designTokens.typography.navTitle.fontSize,
    fontWeight: designTokens.typography.navTitle.fontWeight,
    letterSpacing: designTokens.typography.navTitle.letterSpacing,
    lineHeight: designTokens.typography.navTitle.lineHeight,
  },
  title: {
    fontSize: designTokens.typography.title.fontSize,
    fontWeight: designTokens.typography.title.fontWeight,
    letterSpacing: designTokens.typography.title.letterSpacing,
    lineHeight: designTokens.typography.title.lineHeight,
  },
  section: {
    fontSize: designTokens.typography.section.fontSize,
    fontWeight: designTokens.typography.section.fontWeight,
    letterSpacing: designTokens.typography.section.letterSpacing,
    lineHeight: designTokens.typography.section.lineHeight,
  },
  body: {
    fontSize: designTokens.typography.body.fontSize,
    fontWeight: designTokens.typography.body.fontWeight,
    lineHeight: designTokens.typography.body.lineHeight,
  },
  sub: {
    fontSize: designTokens.typography.sub.fontSize,
    fontWeight: designTokens.typography.sub.fontWeight,
    lineHeight: designTokens.typography.sub.lineHeight,
  },
  caption: {
    fontSize: designTokens.typography.caption.fontSize,
    fontWeight: designTokens.typography.caption.fontWeight,
    lineHeight: designTokens.typography.caption.lineHeight,
  },
  tabLabel: {
    fontSize: designTokens.typography.tabLabel.fontSize,
    fontWeight: designTokens.typography.tabLabel.fontWeight,
    lineHeight: designTokens.typography.tabLabel.lineHeight,
  },
  timer: {
    fontSize: designTokens.typography.timer.fontSize,
    fontWeight: designTokens.typography.timer.fontWeight,
    letterSpacing: designTokens.typography.timer.letterSpacing,
    lineHeight: designTokens.typography.timer.lineHeight,
  },
});

