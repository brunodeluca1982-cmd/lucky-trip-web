/**
 * +html.tsx — Web-only HTML document shell (Expo Router)
 *
 * Injected into <head> before any JS runs — the earliest possible point.
 * This is the correct place for iOS Safari CSS fixes because useEffect
 * in _layout.tsx runs *after* the first paint, leaving a gap where
 * the blue tap-highlight can appear.
 *
 * Fixes applied:
 *   -webkit-tap-highlight-color: transparent  — removes blue tap flash
 *   -webkit-touch-callout: none               — removes long-press callout menu
 *   -webkit-user-select / user-select: none   — prevents text selection
 *
 * Inputs / textareas are explicitly re-allowed so they remain editable.
 */

import { ScrollViewStyleReset } from "expo-router/html";
import React from "react";

const GLOBAL_CSS = `
  html, body, #root {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout:       none;
    -webkit-user-select:         none;
    user-select:                 none;
    cursor:                      default;
  }
  * {
    -webkit-tap-highlight-color: transparent !important;
    -webkit-touch-callout:       none        !important;
    -webkit-user-select:         none        !important;
    user-select:                 none        !important;
    cursor:                      default;
  }
  /* Remove the blue focus ring on every tappable element.
     This is the remaining "blue selected state" on iOS Safari web —
     React Native Web renders TouchableOpacity as a focusable div;
     the browser adds a :focus outline that looks like a blue highlight. */
  *:focus,
  *:focus-visible,
  *:focus-within {
    outline:                 none         !important;
    -webkit-focus-ring-color:transparent  !important;
    box-shadow:              none         !important;
  }
  /* Re-allow text cursor and selection inside actual form fields */
  input, textarea, [contenteditable] {
    -webkit-user-select: text !important;
    user-select:         text !important;
    cursor:              text !important;
  }
  input:focus, textarea:focus, [contenteditable]:focus {
    outline: auto !important;
  }
`;

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
