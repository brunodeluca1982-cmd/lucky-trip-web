/**
 * RioMapViewNative — WebView-based Leaflet map for iOS/Android.
 * Renders the EXACT same styled map as the web iframe version.
 * Loaded lazily by RioMapView on non-web platforms.
 *
 * buildLeafletHTML uses window.parent.postMessage() for marker clicks.
 * In a WebView there is no parent frame, so we shim window.parent before
 * the page script runs, forwarding every postMessage call to the React
 * Native bridge via window.ReactNativeWebView.postMessage(JSON.stringify).
 */
import React from "react";
import { View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { WebView } from "react-native-webview";
import { buildLeafletHTML, RIO_NEIGHBORHOODS } from "./RioMapView";

type Props = {
  selectedNeighborhood: string | null;
  onNeighborhoodPress: (name: string | null) => void;
  style?: StyleProp<ViewStyle>;
};

const PARENT_SHIM = `
  (function() {
    window.parent = {
      postMessage: function(data) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        }
      }
    };
  })();
  true;
`;

export default function RioMapViewNative({ selectedNeighborhood, onNeighborhoodPress, style }: Props) {
  const html = buildLeafletHTML(selectedNeighborhood, RIO_NEIGHBORHOODS);

  return (
    <View style={[styles.container, style]}>
      <WebView
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        injectedJavaScriptBeforeContentLoaded={PARENT_SHIM}
        onMessage={(event) => {
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === "neighborhoodClick") {
              onNeighborhoodPress(data.name ?? null);
            }
          } catch {}
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  webview: { flex: 1 },
});
