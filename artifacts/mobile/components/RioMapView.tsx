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
    html, body { width: 100%; height: 100%; background: #0C0804; }
    #map { width: 100%; height: 100%; }

    /*
     * Tile layer: voyager_nolabels — natural cartographic colors, zero built-in
     * text labels. Subtle filter: desaturate slightly (premium tone) + very faint
     * blur so tiles read as a background canvas, not a tool interface.
     */
    .leaflet-tile-pane {
      filter: saturate(0.72) brightness(0.98) blur(0.55px);
    }

    /*
     * GRADIENT OVERLAY — makes the map feel like a rich background image that
     * fades into the app's dark background. Light dark wash at top (for legibility
     * of the floating controls), transparent in the middle (full map visibility),
     * deep warm fade at the bottom (seamless transition to app content below).
     * z-index 450 sits above tiles but below Leaflet controls (z-index 1000).
     */
    #map-gradient {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none;
      z-index: 450;
      background: linear-gradient(
        180deg,
        rgba(10, 5, 2, 0.38) 0%,
        rgba(10, 5, 2, 0.00) 22%,
        rgba(10, 5, 2, 0.00) 54%,
        rgba(10, 5, 2, 0.62) 80%,
        rgba(10, 5, 2, 0.88) 100%
      );
    }

    .neigh-marker {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
    }

    /* Neighbourhood dots — warm terracotta, white ring, subtle drop shadow */
    .neigh-dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      background: #C4704A;
      border: 2px solid rgba(255,255,255,0.80);
      box-shadow: 0 1px 5px rgba(0,0,0,0.40), 0 0 0 1px rgba(196,112,74,0.20);
      transition: transform 0.15s, box-shadow 0.15s;
    }
    .neigh-dot.selected {
      background: #D4845C;
      border-color: rgba(255,255,255,0.95);
      box-shadow: 0 0 0 5px rgba(196,112,74,0.28), 0 2px 8px rgba(0,0,0,0.45);
      transform: scale(1.45);
    }
    .neigh-dot.visual {
      width: 7px; height: 7px;
      background: rgba(201,168,76,0.55);
      border: 1.5px solid rgba(201,168,76,0.60);
      box-shadow: 0 1px 3px rgba(0,0,0,0.30);
    }

    /* Labels — white text with warm shadow, readable over both map & gradient */
    .neigh-label {
      margin-top: 4px;
      font-family: -apple-system, 'Inter', sans-serif;
      font-size: 10px;
      font-weight: 600;
      color: rgba(255,255,255,0.90);
      white-space: nowrap;
      letter-spacing: 0.25px;
      text-shadow:
        0 1px 4px rgba(0,0,0,0.75),
        0 0 10px rgba(0,0,0,0.55);
      pointer-events: none;
    }
    .neigh-label.selected {
      color: #F5C89A;
      text-shadow: 0 1px 6px rgba(0,0,0,0.80), 0 0 14px rgba(196,112,74,0.40);
    }
    .neigh-label.visual {
      font-size: 9px;
      font-weight: 400;
      font-style: italic;
      color: rgba(201,168,76,0.78);
      text-shadow: 0 1px 4px rgba(0,0,0,0.70);
    }

    /* Leaflet chrome — glass style matching the app's floating UI */
    .leaflet-control-attribution { font-size: 8px; opacity: 0.22; }
    .leaflet-bar a {
      background: rgba(255,255,255,0.14);
      color: rgba(255,255,255,0.80);
      border-color: rgba(255,255,255,0.20);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    .leaflet-bar a:hover {
      background: rgba(255,255,255,0.22);
      color: rgba(255,255,255,0.95);
    }
    .leaflet-bar { border: 1px solid rgba(255,255,255,0.15) !important; border-radius: 10px !important; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.35); }
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="map-gradient"></div>
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
     * voyager_nolabels — CartoDB Voyager with NO built-in text labels.
     * Natural colors: blue Atlantic, green Tijuca, warm beige city fabric.
     * All visible text comes only from our 14 custom markers below.
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
