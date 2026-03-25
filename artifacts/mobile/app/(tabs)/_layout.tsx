import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

const C = Colors.light;

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "house", selected: "house.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="destinos">
        <Icon sf={{ default: "map", selected: "map.fill" }} />
        <Label>Destinos</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="viagem">
        <Icon sf={{ default: "airplane", selected: "airplane" }} />
        <Label>Viagem</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="lucky">
        <Icon sf={{ default: "star", selected: "star.fill" }} />
        <Label>Lucky</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="perfil">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Perfil</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.tint,
        tabBarInactiveTintColor: C.warmGray,
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 11,
          marginBottom: 2,
        },
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : C.white,
          borderTopWidth: 0,
          borderTopColor: C.border,
          elevation: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          paddingBottom: isWeb ? 0 : insets.bottom,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={90}
              tint="light"
              style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(255,255,255,0.88)" }]}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: C.white, borderTopWidth: 1, borderTopColor: C.border }]} />
          ) : null,
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
      {/* Destination detail — inside tabs so tab bar stays visible */}
      <Tabs.Screen name="cidade/[id]"    options={{ href: null }} />
      {/* Section list pages from destination — inside tabs so tab bar stays visible */}
      <Tabs.Screen name="comerBem/[id]"  options={{ href: null }} />
      <Tabs.Screen name="ondeFicar/[id]" options={{ href: null }} />
      <Tabs.Screen name="oQueFazer/[id]" options={{ href: null }} />
      <Tabs.Screen name="essencial/[id]" options={{ href: null }} />
      <Tabs.Screen name="agoraNoRio/[id]" options={{ href: null }} />
      <Tabs.Screen name="luckyList/[id]" options={{ href: null }} />
      {/* Itinerary creation + result — inside tabs so tab bar stays visible */}
      <Tabs.Screen name="roteiro/index"  options={{ href: null }} />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
