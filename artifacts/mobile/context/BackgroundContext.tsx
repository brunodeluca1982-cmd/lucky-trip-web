/**
 * BackgroundContext.tsx
 *
 * Single global source of truth for the app's atmospheric background system.
 *
 * Architecture:
 *   - Pool is fetched ONCE per session from Supabase (home_hero_items, rio-de-janeiro)
 *   - Cloudinary frame extraction: so_1 = frame at 1 second, portrait crop
 *   - If Supabase returns empty / errors → lock to LOCAL_FALLBACK immediately
 *   - One global 12-second timer drives rotation for the ENTIRE app
 *   - All screens share the same pool, currentIdx, nextIdx, and nextOpacity
 *   - Navigating between screens never resets the index or restarts the timer
 *   - Image.prefetch is called on current + next before each transition
 *
 * Destination Home (cidade/[id].tsx with id="rio") is the visual engine.
 * All other screens (Home, Lucky, Destinos, Roteiro, Perfil) are mirrors.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Animated, Image, ImageSourcePropType } from "react-native";
import { supabase } from "@/lib/supabase";

// ── Local fallback pool — always available, no network required ──────────────
const LOCAL_FALLBACK: ImageSourcePropType[] = [
  require("@/assets/images/ipanema.png"),
  require("@/assets/images/lapa.png"),
  require("@/assets/images/pao-acucar.png"),
  require("@/assets/images/cristo.png"),
];

// ── Cloudinary transform — frame at 1 second, portrait crop ─────────────────
const CLOUDINARY_BASE =
  "https://res.cloudinary.com/dufxamwaf/video/fetch/so_1,w_1080,h_1920,c_fill,g_auto,q_80,f_jpg";

const INTERVAL      = 12_000; // 12 seconds between transitions
const FADE_DURATION = 1_500;  // 1.5-second cross-fade

// ── Context shape ────────────────────────────────────────────────────────────

interface BackgroundCtxValue {
  pool:         ImageSourcePropType[];
  currentIdx:   number;
  nextIdx:      number;
  nextOpacity:  Animated.Value;
  /** Call from any RotatingBackground onLoad to propagate the first-image signal. */
  onImageLoaded: () => void;
}

const BackgroundContext = createContext<BackgroundCtxValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

interface ProviderProps {
  children:      React.ReactNode;
  /** Fired globally once when the first background image is displayed anywhere in the app. */
  onFirstImage?: () => void;
}

export function BackgroundProvider({ children, onFirstImage }: ProviderProps) {
  const [pool,       setPool]       = useState<ImageSourcePropType[]>(LOCAL_FALLBACK);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [nextIdx,    setNextIdx]    = useState(1);

  // Single shared Animated.Value — referenced by every RotatingBackground instance.
  // Being a ref, it is the SAME object across all renders: animations are global.
  const nextOpacity = useRef(new Animated.Value(0)).current;

  // Guards — prevent repeated fetch and repeated first-image fire
  const fetchedRef = useRef(false);
  const firstFiredRef = useRef(false);

  // ── One-time Supabase fetch ───────────────────────────────────────────────
  useEffect(() => {
    if (fetchedRef.current) return; // never re-fetch on remount or tab change
    fetchedRef.current = true;

    let cancelled = false;

    (async () => {
      try {
        const { data, error } = await supabase
          .from("home_hero_items")
          .select("video_url")
          .eq("is_active", true)
          .eq("destination_slug", "rio-de-janeiro")
          .order("sort_order", { ascending: true })
          .limit(8);

        if (cancelled) return;

        // Atomic fallback: any failure or empty result → keep LOCAL_FALLBACK
        if (error || !data || data.length === 0) return;

        const remote = data
          .map((row) =>
            row.video_url
              ? { uri: `${CLOUDINARY_BASE}/${row.video_url as string}` }
              : null,
          )
          .filter(Boolean) as ImageSourcePropType[];

        if (remote.length === 0) return; // atomic fallback

        setPool(remote);
        setCurrentIdx(0);
        setNextIdx(1 % remote.length);

        // Prefetch first two frames immediately after pool is set
        prefetchSources(remote, 0, 1 % remote.length);
      } catch {
        // Atomic fallback: keep LOCAL_FALLBACK, same global sync behaviour
      }
    })();

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Global 12-second rotation timer ──────────────────────────────────────
  // Re-creates only when the pool reference changes (once, after Supabase loads).
  useEffect(() => {
    if (pool.length <= 1) return; // nothing to rotate

    const timer = setInterval(() => {
      Animated.timing(nextOpacity, {
        toValue:         1,
        duration:        FADE_DURATION,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;

        setCurrentIdx((c) => {
          const next      = (c + 1) % pool.length;
          const afterNext = (next + 1) % pool.length;
          setNextIdx(afterNext);
          prefetchSources(pool, next, afterNext); // preload before switch
          return next;
        });

        nextOpacity.setValue(0);
      });
    }, INTERVAL);

    return () => clearInterval(timer);
  }, [pool, nextOpacity]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── First-image signal — fired once globally ──────────────────────────────
  function onImageLoaded() {
    if (!firstFiredRef.current) {
      firstFiredRef.current = true;
      onFirstImage?.();
    }
  }

  return (
    <BackgroundContext.Provider
      value={{ pool, currentIdx, nextIdx, nextOpacity, onImageLoaded }}
    >
      {children}
    </BackgroundContext.Provider>
  );
}

// ── Consumer hook ─────────────────────────────────────────────────────────────

export function useBackground(): BackgroundCtxValue {
  const ctx = useContext(BackgroundContext);
  if (!ctx) {
    throw new Error("useBackground must be used inside <BackgroundProvider>");
  }
  return ctx;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Prefetch remote URI sources at the given pool indices. No-op for local assets. */
function prefetchSources(
  pool:    ImageSourcePropType[],
  ...idxs: number[]
): void {
  for (const idx of idxs) {
    const src = pool[idx];
    if (src && typeof src === "object" && "uri" in src) {
      Image.prefetch((src as { uri: string }).uri).catch(() => {});
    }
  }
}
