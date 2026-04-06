import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { notifyFontsReady } from "@/lib/splashGate";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GuiaProvider } from "@/context/GuiaContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Warm root color — the single source of truth for the app's base background.
// Every wrapper, screen container, and navigator defaults to this so there is
// never a cold-black frame between navigations or on first paint.
const ROOT_BG = "#1A0E04";

// ── Web: set body/html background synchronously at module load ──────────────
// This runs BEFORE the first React render, so the HTML body never flashes
// the browser's default background (which is dark/black in dark mode).
if (Platform.OS === "web" && typeof document !== "undefined") {
  document.documentElement.style.backgroundColor = ROOT_BG;
  document.body.style.backgroundColor = ROOT_BG;
}

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: ROOT_BG,
  },
};

function RootLayoutNav() {
  return (
    <ThemeProvider value={AppTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: ROOT_BG },
          animation: "none",
        }}
      >
        <Stack.Screen name="(tabs)"              options={{ headerShown: false, contentStyle: { backgroundColor: ROOT_BG } }} />
        <Stack.Screen name="auth/callback"       options={{ headerShown: false, contentStyle: { backgroundColor: ROOT_BG }, animation: "fade" }} />
        <Stack.Screen name="friend/[slug]"       options={{ headerShown: false, contentStyle: { backgroundColor: ROOT_BG }, animation: "slide_from_right" }} />
        <Stack.Screen name="friend/guide/[slug]" options={{ headerShown: false, contentStyle: { backgroundColor: ROOT_BG }, animation: "slide_from_right" }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // splashGate waits for both fonts AND first hero bg before hiding.
      // A 1-second safety timer in splashGate ensures we never block forever.
      notifyFontsReady();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const el = document.createElement("style");
    el.id = "lucky-no-select";
    el.textContent = `
      html, body, #root {
        background-color: ${ROOT_BG};
        -webkit-tap-highlight-color: transparent;
      }
      * {
        -webkit-tap-highlight-color: transparent;
        -webkit-user-select:         none !important;
        user-select:                 none !important;
        -webkit-touch-callout:       none !important;
      }
      input, textarea, [contenteditable] {
        -webkit-user-select: text !important;
        user-select:         text !important;
      }
    `;
    document.head.appendChild(el);
    return () => { document.getElementById("lucky-no-select")?.remove(); };
  }, []);

  // Show warm background during font loading instead of null.
  // On native, the splash screen overlays this anyway.
  // On web, this prevents the browser body from showing through.
  if (!fontsLoaded && !fontError) {
    return <View style={styles.warmBlock} />;
  }

  return (
    <SafeAreaProvider style={{ backgroundColor: ROOT_BG }}>
      <ErrorBoundary>
        <GuiaProvider>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1, backgroundColor: ROOT_BG }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </GuiaProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  warmBlock: {
    flex: 1,
    backgroundColor: ROOT_BG,
  },
});
