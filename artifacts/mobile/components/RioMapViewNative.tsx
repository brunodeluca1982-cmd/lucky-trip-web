/**
 * RioMapViewNative — react-native-maps implementation for iOS/Android.
 * Loaded lazily by RioMapView on non-web platforms.
 */
import React from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import MapView, { Marker, type Region } from "react-native-maps";
import { RIO_NEIGHBORHOODS } from "./RioMapView";
import Colors from "@/constants/colors";

const C = Colors.light;

const RIO_REGION: Region = {
  latitude: -22.9768,
  longitude: -43.2100,
  latitudeDelta: 0.18,
  longitudeDelta: 0.12,
};

type Props = {
  selectedNeighborhood: string | null;
  onNeighborhoodPress: (name: string | null) => void;
  style?: StyleProp<ViewStyle>;
};

export default function RioMapViewNative({ selectedNeighborhood, onNeighborhoodPress, style }: Props) {
  return (
    <MapView
      style={[s.map, style]}
      initialRegion={RIO_REGION}
      onPress={() => onNeighborhoodPress(null)}
    >
      {RIO_NEIGHBORHOODS.map((n) => (
        <Marker
          key={n.name}
          coordinate={{ latitude: n.lat, longitude: n.lng }}
          title={n.name}
          pinColor={
            !n.clickable
              ? "rgba(255,255,255,0.3)"
              : n.name === selectedNeighborhood
              ? C.gold
              : C.terracotta
          }
          onPress={
            n.clickable
              ? () =>
                  onNeighborhoodPress(
                    n.name === selectedNeighborhood ? null : n.name,
                  )
              : undefined
          }
        />
      ))}
    </MapView>
  );
}

const s = StyleSheet.create({
  map: {
    flex: 1,
  },
});
