/**
 * SplashOverlay.tsx — Branded session splash screen.
 *
 * Logic:
 *   - _sessionShown is a plain module-level boolean.
 *     It is initialised to `false` each time the JS process starts (app launch).
 *     It is never written to disk, so it resets on every cold start.
 *
 *   - First mount  → show splash, wait 1.5 s, fade out 400 ms, unmount.
 *   - Every subsequent mount in the same session → renders nothing immediately.
 *   - Tab / screen navigation never re-mounts this component (it lives in the
 *     root layout), so the flag is only relevant for true process restarts.
 */

import React, { useEffect, useRef, useState } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";

const SPLASH_ASSET = require("../assets/images/splash-branded.jpeg");
const HOLD_MS      = 1500;   // how long the splash stays at full opacity
const FADE_MS      = 400;    // fade-out duration

// Module-level flag — lives in the JS process lifetime only.
// Automatically false on every fresh app launch; never touches AsyncStorage.
let _sessionShown = false;

export function SplashOverlay() {
  // If already shown this session skip immediately — no state change needed.
  const [visible, setVisible] = useState(!_sessionShown);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (_sessionShown) return;    // second mount guard (shouldn't happen but safe)
    _sessionShown = true;         // mark now so any StrictMode double-invoke is ignored

    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_MS,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }, HOLD_MS);

    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="none">
      <View style={styles.bg}>
        <Image source={SPLASH_ASSET} style={styles.image} resizeMode="cover" />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  bg: {
    flex: 1,
    backgroundColor: "#EDEAE3",   // matches the cream background of the image
  },
  image: {
    width:  "100%",
    height: "100%",
  },
});
