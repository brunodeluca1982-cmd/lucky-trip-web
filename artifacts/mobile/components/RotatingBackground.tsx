/**
 * RotatingBackground.tsx
 *
 * Pure display component — reads pool, indices, and the shared Animated.Value
 * from BackgroundContext. Contains no local state, no timer, no pool fetch.
 *
 * The global timer lives in BackgroundProvider (_layout.tsx). All instances of
 * this component across every screen share the SAME animated values, so they
 * transition in perfect sync and never reset on navigation.
 *
 * Props:
 *   onFirstImageDisplay — optional callback fired once when the first image
 *     loads on THIS component instance. Used by the Home screen to trigger its
 *     editorial overlay fade-in. The global splashGate signal (notifyHeroReady)
 *     is handled separately at provider level via BackgroundProvider.onFirstImage.
 */

import React, { useRef } from "react";
import { Animated, StyleSheet } from "react-native";
import { useBackground } from "@/context/BackgroundContext";

type Props = {
  onFirstImageDisplay?: () => void;
};

export function RotatingBackground({ onFirstImageDisplay }: Props) {
  const { pool, currentIdx, nextIdx, nextOpacity, onImageLoaded } =
    useBackground();

  const firstFiredRef = useRef(false);

  function handleFirstLoad() {
    if (!firstFiredRef.current) {
      firstFiredRef.current = true;
      onImageLoaded();          // propagate global first-image signal (splashGate)
      onFirstImageDisplay?.();  // propagate screen-local signal (overlay animation)
    }
  }

  if (!pool.length) return null;

  return (
    <>
      <Animated.Image
        source={pool[currentIdx]}
        style={styles.fill}
        resizeMode="cover"
        pointerEvents="none"
        onLoad={handleFirstLoad}
      />
      <Animated.Image
        source={pool[nextIdx]}
        style={[styles.fill, { opacity: nextOpacity }]}
        resizeMode="cover"
        pointerEvents="none"
      />
    </>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFillObject },
});
