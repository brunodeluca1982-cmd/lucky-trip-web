import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";

const C = Colors.light;

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  uppercase?: boolean;
}

export function SectionHeader({ title, subtitle, uppercase = false }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={[styles.title, uppercase && styles.titleUppercase]}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 4,
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 24,
    color: C.darkBrown,
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  titleUppercase: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: C.terracotta,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: C.warmGray,
    lineHeight: 20,
  },
});
