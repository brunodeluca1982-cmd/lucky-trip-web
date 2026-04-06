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
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GuiaProvider } from "@/context/GuiaContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Warm root color — ensures every frame from the very first paint is amber/dark,
// never the jarring cold black that causes the flash before screen gradients render.
const ROOT_BG = "#1A0E04";

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
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const el = document.createElement("style");
    el.id = "lucky-no-select";
    el.textContent = `
      html, body, #root {
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

  if (!fontsLoaded && !fontError) return null;

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
