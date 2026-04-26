/**
 * colar-video.tsx — Tela para colar links/captions de vídeos sociais
 *
 * Integra com Edge Function parse-social-caption para extrair lugares
 * mencionados em vídeos do YouTube, TikTok e Instagram.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const AREIA = "#F5F0E8";
const PETROLEO = "#1B4F72";
const EDGE_FUNCTION_URL = "https://bkwlximkadmlnbgjcrdp.supabase.co/functions/v1/parse-social-caption";

type Platform = "youtube" | "tiktok" | "instagram";

type ResultType =
  | { type: "places_found"; places: Array<{ nome: string; tipo: string; confianca: number }> }
  | { type: "destination_recognized"; message: string; destination: string }
  | { type: "nothing_found"; message: string };

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export default function ColarVideoScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ destinoSlug?: string }>();
  const destinoSlug = params.destinoSlug || "rio-de-janeiro";

  const [activeTab, setActiveTab] = useState<Platform>("youtube");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultType | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Check auth and redirect if needed ───────────────────────────────────────
  const checkAuthAndSubmit = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      router.push({
        pathname: "/auth",
        params: { returnTo: "/colar-video" },
      } as any);
      return;
    }

    await submitToEdgeFunction(session.access_token, session.user.id);
  };

  // ── Submit to Edge Function ─────────────────────────────────────────────────
  const submitToEdgeFunction = async (accessToken: string, userId: string) => {
    if (!inputValue.trim()) {
      setError("Cole um link ou legenda primeiro");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const body: Record<string, any> = {
        platform: activeTab,
        destinoSlug,
        userId,
      };

      if (activeTab === "youtube") {
        body.url = inputValue.trim();
      } else {
        body.caption = inputValue.trim();
      }

      const response = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || `Erro ${response.status}`);
      }

      const data = await response.json();
      setResult(data as ResultType);
    } catch (err: any) {
      console.error("[ColarVideo] Error:", err);
      setError(err.message || "Erro ao processar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  // ── Reset to try again ──────────────────────────────────────────────────────
  const resetForm = () => {
    setInputValue("");
    setResult(null);
    setError(null);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={PETROLEO} />
        </Pressable>
        <Text style={styles.headerTitle}>Adicionar do vídeo</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Show result or form */}
          {result ? (
            <ResultView result={result} onReset={resetForm} />
          ) : (
            <>
              {/* Tabs */}
              <View style={styles.tabs}>
                {(["youtube", "tiktok", "instagram"] as Platform[]).map((tab) => (
                  <Pressable
                    key={tab}
                    style={[styles.tab, activeTab === tab && styles.tabActive]}
                    onPress={() => {
                      setActiveTab(tab);
                      setInputValue("");
                      setError(null);
                    }}
                  >
                    <Ionicons
                      name={`logo-${tab}` as any}
                      size={18}
                      color={activeTab === tab ? PETROLEO : "#999"}
                    />
                    <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Input */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    activeTab !== "youtube" && styles.inputMultiline,
                  ]}
                  placeholder={
                    activeTab === "youtube"
                      ? "Cole o link do YouTube"
                      : `Cole a legenda do ${activeTab === "tiktok" ? "TikTok" : "Instagram"}`
                  }
                  placeholderTextColor="#999"
                  value={inputValue}
                  onChangeText={setInputValue}
                  multiline={activeTab !== "youtube"}
                  numberOfLines={activeTab !== "youtube" ? 6 : 1}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Error */}
              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}

              {/* Submit Button */}
              <Pressable
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={checkAuthAndSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Encontrar lugares</Text>
                )}
              </Pressable>

              {/* Helper text */}
              <Text style={styles.helperText}>
                {activeTab === "youtube"
                  ? "Cole a URL completa do vídeo do YouTube"
                  : "Cole a legenda/descrição do vídeo com os lugares mencionados"}
              </Text>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RESULT VIEW COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

function ResultView({ result, onReset }: { result: ResultType; onReset: () => void }) {
  if (result.type === "places_found") {
    return (
      <View style={styles.resultContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={48} color="#27AE60" />
        </View>
        <Text style={styles.resultTitle}>Adicionado à sua viagem!</Text>
        <Text style={styles.resultSubtitle}>
          {result.places.length} {result.places.length === 1 ? "lugar encontrado" : "lugares encontrados"}
        </Text>

        {/* Places list */}
        <View style={styles.placesList}>
          {result.places.map((place, idx) => (
            <View key={idx} style={styles.placeItem}>
              <View style={styles.placeIcon}>
                <Ionicons name="location" size={16} color={PETROLEO} />
              </View>
              <View style={styles.placeInfo}>
                <Text style={styles.placeName}>{place.nome}</Text>
                <Text style={styles.placeType}>{place.tipo}</Text>
              </View>
              <View style={styles.confidenceBadge}>
                <Text style={styles.confidenceText}>
                  {Math.round(place.confianca * 100)}%
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Actions */}
        <Pressable
          style={styles.primaryBtn}
          onPress={() => router.push("/(tabs)/viagem")}
        >
          <Text style={styles.primaryBtnText}>Ver minha viagem</Text>
        </Pressable>

        <Pressable style={styles.secondaryBtn} onPress={onReset}>
          <Text style={styles.secondaryBtnText}>Adicionar outro vídeo</Text>
        </Pressable>
      </View>
    );
  }

  if (result.type === "destination_recognized") {
    return (
      <View style={styles.resultContainer}>
        {/* Editorial card */}
        <View style={styles.editorialCard}>
          <Text style={styles.editorialDestination}>{result.destination}</Text>
          <Text style={styles.editorialMessage}>{result.message}</Text>
        </View>

        <Pressable style={styles.secondaryBtn} onPress={onReset}>
          <Text style={styles.secondaryBtnText}>Tentar outro vídeo</Text>
        </Pressable>
      </View>
    );
  }

  // nothing_found
  return (
    <View style={styles.resultContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="search-outline" size={48} color="#999" />
      </View>
      <Text style={styles.emptyTitle}>Nenhum lugar encontrado</Text>
      <Text style={styles.emptyMessage}>{result.message}</Text>

      <Pressable style={styles.primaryBtn} onPress={onReset}>
        <Text style={styles.primaryBtnText}>Tentar outro vídeo</Text>
      </Pressable>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AREIA,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 18,
    color: PETROLEO,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: "rgba(27, 79, 114, 0.1)",
  },
  tabText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: "#999",
  },
  tabTextActive: {
    color: PETROLEO,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#333",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  inputMultiline: {
    minHeight: 140,
    textAlignVertical: "top",
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#E74C3C",
    marginBottom: 16,
    textAlign: "center",
  },
  submitBtn: {
    backgroundColor: PETROLEO,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFF",
  },
  helperText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "#888",
    textAlign: "center",
    lineHeight: 18,
  },

  // Result styles
  resultContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  successIcon: {
    marginBottom: 16,
  },
  resultTitle: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 24,
    color: PETROLEO,
    marginBottom: 8,
    textAlign: "center",
  },
  resultSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "#666",
    marginBottom: 24,
  },
  placesList: {
    width: "100%",
    marginBottom: 24,
  },
  placeItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  placeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(27, 79, 114, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#333",
  },
  placeType: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  confidenceBadge: {
    backgroundColor: "rgba(39, 174, 96, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  confidenceText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "#27AE60",
  },
  primaryBtn: {
    backgroundColor: PETROLEO,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
    marginBottom: 12,
  },
  primaryBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFF",
  },
  secondaryBtn: {
    paddingVertical: 12,
  },
  secondaryBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: PETROLEO,
  },

  // Editorial card (destination_recognized)
  editorialCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    width: "100%",
  },
  editorialDestination: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: PETROLEO,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  editorialMessage: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 18,
    color: "#333",
    lineHeight: 28,
  },

  // Empty state (nothing_found)
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 20,
    color: "#333",
    marginBottom: 8,
  },
  emptyMessage: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
});
