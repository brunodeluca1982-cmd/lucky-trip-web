import React from "react";
import { Image, Platform, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const C = Colors.light;

// Cursive L. symbol only — transparent RGBA, cropped to top 62% (no tagline text)
const LOGO_MARK = require("../assets/images/logo-symbol.png");

interface AppHeaderProps {
  transparent?: boolean;
}

export function AppHeader({ transparent = false }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // Web: CSS filter inverts the black logo to white (invert(1)) then reduces opacity
  // Native (iOS/Android): tintColor paints the transparent RGBA logo white
  const logoStyle =
    Platform.OS === "web"
      ? ([
          styles.logoMark,
          { filter: "invert(1)", opacity: 0.55 } as any,
        ] as const)
      : ([styles.logoMark, { opacity: 0.55 }] as const);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: topPad },
        transparent && styles.transparent,
      ]}
    >
      <View style={styles.inner}>
        {/*
          Cursive L. brand mark rendered as an editorial watermark / signature.
          Web: CSS invert filter turns the black logo white; native: tintColor="white".
          opacity 0.55 keeps it subtle, integrated, non-dominant — like a signature
          on the photographic surface rather than a UI icon.
        */}
        <Image
          source={LOGO_MARK}
          style={logoStyle}
          resizeMode="contain"
          {...(Platform.OS !== "web" ? { tintColor: "#FFFFFF" } : {})}
        />
        <Pressable style={styles.avatarBtn}>
          <Feather name="user" size={18} color={C.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  transparent: {
    backgroundColor: "transparent",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  logoMark: {
    // Cropped symbol PNG: 2622×748 (ratio ~3.5:1) — L. mark only, no tagline
    // Transparent surrounding area means only the actual logo strokes show.
    // height 28px × width 96px preserves exact aspect ratio without distortion.
    height: 28,
    width: 96,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
});
