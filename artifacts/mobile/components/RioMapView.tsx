/**
 * RioMapView — platform-aware interactive map for Rio de Janeiro.
 *
 * Web:    Leaflet.js in an <iframe> (CartoDB Dark tiles, no API key needed)
 * Native: react-native-maps MapView with custom markers
 *
 * Props:
 *   selectedNeighborhood  — name string of currently selected neighborhood (or null)
 *   onNeighborhoodPress   — called with the neighborhood name when a marker is tapped
 *   style                 — optional additional style for the container
 *
 * Visual: dark_all tiles with brightness/contrast CSS filter applied so the
 * map reads as dark-charcoal rather than near-black — lighter and more legible.
 */

import React, { useEffect, useRef } from "react";
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

// ── Neighborhood data ─────────────────────────────────────────────────────────

export type RioNeighborhood = {
  name: string;
  lat: number;
  lng: number;
  clickable: boolean;
};

export const RIO_NEIGHBORHOODS: RioNeighborhood[] = [
  // ── Clickable lodging neighborhoods ──
  { name: "Ipanema",                  lat: -22.9838, lng: -43.2096, clickable: true },
  { name: "Leblon",                   lat: -22.9860, lng: -43.2237, clickable: true },
  { name: "Copacabana",               lat: -22.9711, lng: -43.1823, clickable: true },
  { name: "Arpoador",                 lat: -22.9906, lng: -43.1896, clickable: true },
  { name: "Leme",                     lat: -22.9588, lng: -43.1713, clickable: true },
  { name: "Botafogo",                 lat: -22.9417, lng: -43.1834, clickable: true },
  { name: "Santa Teresa",             lat: -22.9250, lng: -43.1895, clickable: true },
  { name: "Centro",                   lat: -22.9068, lng: -43.1729, clickable: true },
  { name: "São Conrado",              lat: -22.9996, lng: -43.2740, clickable: true },
  { name: "Barra da Tijuca",          lat: -23.0048, lng: -43.3654, clickable: true },
  { name: "Recreio dos Bandeirantes", lat: -23.0100, lng: -43.4700, clickable: true },
  // ── Visual context only ──
  { name: "Cristo Redentor",          lat: -22.9519, lng: -43.2105, clickable: false },
  { name: "Maracanã",                 lat: -22.9121, lng: -43.2302, clickable: false },
  { name: "Lagoa",                    lat: -22.9709, lng: -43.2060, clickable: false },
];

// ── Leaflet HTML generator ────────────────────────────────────────────────────

function buildLeafletHTML(
  selected: string | null,
  neighborhoods: RioNeighborhood[],
): string {
  const neighborhoodsJSON = JSON.stringify(
    neighborhoods.map((n) => ({
      name: n.name,
      lat: n.lat,
      lng: n.lng,
      clickable: n.clickable,
    })),
  );

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #E8E2D8; }

    /*
     * voyager_nolabels tiles: natural cartographic colors (blue water, green parks,
     * warm beige roads) with zero built-in text labels — our custom markers are
     * the only labels on the map.
     *
     * Subtle filter: slightly reduce saturation for a premium editorial tone,
     * very gentle contrast reduction to soften the tile rendering.
     * No heavy overlay; no dark wash.
     */
    .leaflet-layer {
      filter: saturate(0.78) contrast(0.92) brightness(1.04);
    }

    .neigh-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
    }

    /* Dots — terracotta with a white halo so they pop on the light map */
    .neigh-dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      background: #C4704A;
      border: 2px solid #fff;
      box-shadow: 0 1px 4px rgba(0,0,0,0.30);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .neigh-dot.selected {
      background: #C4704A;
      border-color: #fff;
      box-shadow: 0 0 0 4px rgba(196,112,74,0.30), 0 1px 6px rgba(0,0,0,0.35);
      transform: scale(1.45);
    }
    /* Visual-only landmarks: smaller, muted dot */
    .neigh-dot.visual {
      width: 7px; height: 7px;
      background: rgba(100,85,70,0.45);
      border: 1.5px solid rgba(100,85,70,0.55);
      box-shadow: none;
    }

    /* Labels — dark text on light map, white halo for legibility */
    .neigh-label {
      margin-top: 4px;
      font-family: -apple-system, 'Inter', sans-serif;
      font-size: 10px;
      font-weight: 600;
      color: rgba(30,18,10,0.88);
      white-space: nowrap;
      letter-spacing: 0.15px;
      text-shadow:
        0 0 4px rgba(255,255,255,0.95),
        0 0 8px rgba(255,255,255,0.80),
        1px 1px 0 rgba(255,255,255,0.70),
        -1px -1px 0 rgba(255,255,255,0.70);
      pointer-events: none;
    }
    .neigh-label.selected {
      color: #9E3D1A;
      font-weight: 700;
    }
    /* Landmark labels — italic, smaller, muted brown */
    .neigh-label.visual {
      font-size: 9px;
      font-weight: 400;
      font-style: italic;
      color: rgba(60,45,30,0.60);
      text-shadow:
        0 0 4px rgba(255,255,255,0.90),
        0 0 8px rgba(255,255,255,0.70);
    }

    /* Leaflet chrome — clean white buttons to match the light map */
    .leaflet-control-attribution { font-size: 8px; opacity: 0.28; }
    .leaflet-bar a {
      background: rgba(255,255,255,0.88);
      color: rgba(40,28,18,0.80);
      border-color: rgba(180,160,140,0.40);
    }
    .leaflet-bar a:hover { background: rgba(255,255,255,1); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var NEIGHBORHOODS = ${neighborhoodsJSON};
    var SELECTED = ${JSON.stringify(selected)};

    var map = L.map('map', {
      center: [-22.9768, -43.2100],
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    /*
     * voyager_nolabels — CartoDB Voyager style with NO built-in text labels.
     * All map text you see comes exclusively from our custom markers below.
     * Natural colors: blue Atlantic, green Tijuca forest, warm beige city fabric.
     */
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://openstreetmap.org/copyright">OSM</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Add neighborhood markers
    NEIGHBORHOODS.forEach(function(n) {
      var isSelected = n.name === SELECTED;
      var dotClass   = 'neigh-dot'   + (isSelected ? ' selected' : '') + (!n.clickable ? ' visual' : '');
      var labelClass = 'neigh-label' + (isSelected ? ' selected' : '') + (!n.clickable ? ' visual' : '');

      var icon = L.divIcon({
        className: 'neigh-marker',
        html: '<div class="' + dotClass + '"></div><div class="' + labelClass + '">' + n.name + '</div>',
        iconAnchor: [0, 5],
        iconSize: null,
        popupAnchor: [0, -15],
      });

      var marker = L.marker([n.lat, n.lng], { icon: icon });

      if (n.clickable) {
        marker.on('click', function(e) {
          L.DomEvent.stopPropagation(e);
          window.parent.postMessage(
            { type: 'neighborhoodClick', name: n.name },
            '*'
          );
        });
      }

      marker.addTo(map);
    });

    // Tap on map background deselects
    map.on('click', function() {
      window.parent.postMessage({ type: 'neighborhoodClick', name: null }, '*');
    });
  </script>
</body>
</html>`;
}

// ── Web component ─────────────────────────────────────────────────────────────

type MapProps = {
  selectedNeighborhood: string | null;
  onNeighborhoodPress: (name: string | null) => void;
  style?: StyleProp<ViewStyle>;
};

function RioMapViewWeb({ selectedNeighborhood, onNeighborhoodPress, style }: MapProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const html = buildLeafletHTML(selectedNeighborhood, RIO_NEIGHBORHOODS);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handler(e: MessageEvent) {
      if (e.data && e.data.type === "neighborhoodClick") {
        onNeighborhoodPress(e.data.name ?? null);
      }
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onNeighborhoodPress]);

  // @ts-ignore — <iframe> and srcDoc are web-only; valid in Expo web
  return (
    <View style={[s.container, style]}>
      <iframe
        key={selectedNeighborhood}
        ref={iframeRef as any}
        srcDoc={html}
        style={{ width: "100%", height: "100%", border: "none", background: "#E8E2D8" } as any}
        title="Mapa do Rio de Janeiro"
      />
    </View>
  );
}

// ── Native component ──────────────────────────────────────────────────────────

let NativeMapView: React.ComponentType<MapProps> | null = null;

function RioMapViewNative({ selectedNeighborhood, onNeighborhoodPress, style }: MapProps) {
  if (!NativeMapView) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { default: Impl } = require("./RioMapViewNative");
    NativeMapView = Impl;
  }
  const Comp = NativeMapView!;
  return (
    <Comp
      selectedNeighborhood={selectedNeighborhood}
      onNeighborhoodPress={onNeighborhoodPress}
      style={style}
    />
  );
}

// ── Exported component ────────────────────────────────────────────────────────

export default function RioMapView(props: MapProps) {
  if (Platform.OS === "web") {
    return <RioMapViewWeb {...props} />;
  }
  return <RioMapViewNative {...props} />;
}

const s = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "#12100E",
  },
});
