import { Tabs } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PaywallModal from "@/components/PaywallModal";

const GOLD   = "#D4AF37";
const GRAY   = "#888888";
const TAB_BG = "#FFFFFF";
const BORDER = "rgba(0,0,0,0.08)";

export default function TabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const insets = useSafeAreaInsets();

  const bottomInset = isIOS ? insets.bottom : 0;
  const TAB_HEIGHT  = 49 + bottomInset;

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          sceneStyle: { backgroundColor: "#000000" },
          tabBarActiveTintColor: GOLD,
          tabBarInactiveTintColor: GRAY,
          tabBarLabelStyle: {
            fontFamily: "Inter_500Medium",
            fontSize: 11,
            marginBottom: 0,
          },
          tabBarStyle: {
            position: "absolute",
            backgroundColor: TAB_BG,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: BORDER,
            elevation: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -1 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
            paddingBottom: isWeb ? 4 : bottomInset,
            paddingTop: 6,
            height: isWeb ? 60 : TAB_HEIGHT,
            zIndex: 100,
          },
          tabBarBackground: () => (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: TAB_BG,
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: BORDER,
                },
              ]}
            />
          ),
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Início",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="house" tintColor={color} size={22} />
              ) : (
                <Feather name="home" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="destinos"
          options={{
            title: "Destinos",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="map" tintColor={color} size={22} />
              ) : (
                <Feather name="map" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="viagem"
          options={{
            title: "Viagem",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="airplane" tintColor={color} size={22} />
              ) : (
                <Ionicons name="airplane-outline" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="lucky"
          options={{
            title: "Lucky",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="star" tintColor={color} size={22} />
              ) : (
                <Feather name="star" size={22} color={color} />
              ),
          }}
        />
        <Tabs.Screen
          name="perfil"
          options={{
            title: "Perfil",
            tabBarIcon: ({ color }) =>
              isIOS ? (
                <SymbolView name="person" tintColor={color} size={22} />
              ) : (
                <Feather name="user" size={22} color={color} />
              ),
          }}
        />
        {/* Hidden tab screens — keep tab bar visible on all these pages */}
        <Tabs.Screen name="cidade/[id]"      options={{ href: null }} />
        <Tabs.Screen name="comerBem/[id]"    options={{ href: null }} />
        <Tabs.Screen name="ondeFicar/[id]"   options={{ href: null }} />
        <Tabs.Screen name="oQueFazer/[id]"   options={{ href: null }} />
        <Tabs.Screen name="essencial/[id]"   options={{ href: null }} />
        <Tabs.Screen name="agoraNoRio/[id]"  options={{ href: null }} />
        <Tabs.Screen name="luckyList/[id]"   options={{ href: null }} />
        <Tabs.Screen name="roteiro/index"    options={{ href: null }} />
        <Tabs.Screen name="roteiro/[id]"     options={{ href: null }} />
        <Tabs.Screen name="subscription"     options={{ href: null }} />
        <Tabs.Screen name="post-purchase"    options={{ href: null }} />
      </Tabs>

      {/* Global paywall modal — rendered above all tabs */}
      <PaywallModal />
    </>
  );
}
