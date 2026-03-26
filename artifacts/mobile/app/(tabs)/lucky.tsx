import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import Colors from "@/constants/colors";
import { getDeviceId } from "@/utils/deviceId";

const C    = Colors.light;
const GOLD = "#D4AF37";

const FREE_LIMIT         = 2;
const RESPONSES_USED_KEY = "@luckytrip/lucky_responses_v1";
const IS_PREMIUM_KEY     = "@luckytrip/lucky_premium_v1";

const SUGGESTED_PROMPTS = [
  "O que fazer hoje no Rio?",
  "Melhores restaurantes em Ipanema",
  "Onde ficar para gastronomia?",
  "Lugares bons para ir sozinha",
  "Ideias românticas no Rio",
  "O que fazer com amigos no fim de semana?",
];

interface Message {
  role:    "user" | "assistant";
  content: string;
}

// ── Lucky screen ───────────────────────────────────────────────────────────────

export default function LuckyScreen() {
  const insets    = useSafeAreaInsets();
  const topPad    = Platform.OS === "web" ? 67 : insets.top + 16;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const scrollRef = useRef<ScrollView>(null);

  const [messages,      setMessages]      = useState<Message[]>([]);
  const [responsesUsed, setResponsesUsed] = useState(0);
  const [isPremium,     setIsPremium]     = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [checkingOut,   setCheckingOut]   = useState(false);
  const [inputText,     setInputText]     = useState("");
  const [deviceId,      setDeviceId]      = useState<string | null>(null);

  const isAtLimit = !isPremium && responsesUsed >= FREE_LIMIT;

  useEffect(() => {
    (async () => {
      const [id, countStr, premiumStr] = await Promise.all([
        getDeviceId(),
        AsyncStorage.getItem(RESPONSES_USED_KEY),
        AsyncStorage.getItem(IS_PREMIUM_KEY),
      ]);
      setDeviceId(id);
      setResponsesUsed(countStr ? parseInt(countStr, 10) : 0);

      if (premiumStr === "true") {
        setIsPremium(true);
        return;
      }

      const { data } = await supabase
        .from("access_levels")
        .select("plan_type, access_until")
        .eq("device_id", id)
        .maybeSingle();

      if (
        data?.plan_type === "premium" &&
        data.access_until &&
        new Date(data.access_until) > new Date()
      ) {
        setIsPremium(true);
        await AsyncStorage.setItem(IS_PREMIUM_KEY, "true");
      }
    })();
  }, []);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  }, []);

  const sendQuery = useCallback(
    async (query: string) => {
      if (!query.trim() || loading || isAtLimit || !deviceId) return;

      Keyboard.dismiss();
      const userMsg: Message = { role: "user", content: query.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInputText("");
      setLoading(true);
      scrollToBottom();

      try {
        const { data, error } = await supabase.functions.invoke("lucky-trip-ai", {
          body: {
            messages: [...messages, userMsg].map((m) => ({
              role:    m.role,
              content: m.content,
            })),
            deviceId,
          },
        });

        if (error) throw error;

        const reply = data?.reply ?? "Desculpe, não consegui processar sua pergunta.";
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);

        const newCount = responsesUsed + 1;
        setResponsesUsed(newCount);
        await AsyncStorage.setItem(RESPONSES_USED_KEY, String(newCount));
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Hmm, algo deu errado. Tente novamente em instantes." },
        ]);
      } finally {
        setLoading(false);
        scrollToBottom();
      }
    },
    [loading, isAtLimit, deviceId, messages, responsesUsed, scrollToBottom],
  );

  const handleUpgrade = useCallback(async () => {
    if (checkingOut || !deviceId) return;
    setCheckingOut(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { deviceId },
      });
      if (error || !data?.url) throw error ?? new Error("No checkout URL");
      await Linking.openURL(data.url);
    } catch {
      await Linking.openURL("mailto:ola@theluckytrip.com?subject=Premium%20Lucky");
    } finally {
      setCheckingOut(false);
    }
  }, [deviceId, checkingOut]);

  const hasMessages = messages.length > 0;
  const remaining   = Math.max(0, FREE_LIMIT - responsesUsed);

  return (
    <ImageBackground
      source={require("@/assets/images/lapa.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={bottomPad + 60}
        >
          <ScrollView
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.content,
              { paddingTop: topPad + 8, paddingBottom: bottomPad + 120 },
            ]}
          >
            {/* ── Header ── */}
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <View>
                  <Text style={styles.eyebrow}>Concierge</Text>
                  <Text style={styles.title}>Lucky</Text>
                </View>
                <View style={styles.logoMark}>
                  <Text style={styles.logoMarkText}>L.</Text>
                </View>
              </View>
              {!hasMessages && (
                <Text style={styles.subtitle}>
                  Pergunte sobre o Rio, peça sugestões ou deixe{"\n"}me guiar a sua viagem.
                </Text>
              )}
              {!isPremium && hasMessages && (
                <View style={styles.counterBadge}>
                  <Feather name="zap" size={11} color={remaining === 0 ? "rgba(255,255,255,0.55)" : GOLD} />
                  <Text style={[styles.counterText, remaining === 0 && { color: "rgba(255,255,255,0.55)" }]}>
                    {remaining === 0
                      ? "Limite gratuito atingido"
                      : `${remaining} de ${FREE_LIMIT} respostas gratuitas restantes`}
                  </Text>
                </View>
              )}
              {isPremium && (
                <View style={styles.premiumBadge}>
                  <Feather name="star" size={11} color={GOLD} />
                  <Text style={styles.premiumBadgeText}>Lucky Premium</Text>
                </View>
              )}
            </View>

            {/* ── Entry prompts ── */}
            {!hasMessages && (
              <View style={styles.promptsSection}>
                <Text style={styles.promptsLabel}>Sugestões</Text>
                <View style={styles.promptsGrid}>
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <Pressable
                      key={prompt}
                      style={({ pressed }) => [
                        styles.promptChip,
                        pressed && styles.promptChipPressed,
                      ]}
                      onPress={() => sendQuery(prompt)}
                    >
                      <Text style={styles.promptChipText}>{prompt}</Text>
                      <Feather name="arrow-right" size={12} color={GOLD} />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* ── Message thread ── */}
            {messages.map((msg, i) => (
              <View key={i} style={styles.messageBlock}>
                {msg.role === "user" ? (
                  <View style={styles.userBubbleRow}>
                    <View style={styles.userBubble}>
                      <Text style={styles.userBubbleText}>{msg.content}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.luckyCard}>
                    <View style={styles.luckyCardHeader}>
                      <View style={styles.luckyAvatarSmall}>
                        <Text style={styles.luckyAvatarSmallText}>L.</Text>
                      </View>
                      <Text style={styles.luckyCardLabel}>Lucky</Text>
                    </View>
                    <Text style={styles.luckyCardText}>{msg.content}</Text>
                  </View>
                )}
              </View>
            ))}

            {/* ── Loading ── */}
            {loading && (
              <View style={styles.loadingCard}>
                <View style={styles.luckyCardHeader}>
                  <View style={styles.luckyAvatarSmall}>
                    <Text style={styles.luckyAvatarSmallText}>L.</Text>
                  </View>
                  <Text style={styles.luckyCardLabel}>Lucky</Text>
                </View>
                <View style={styles.loadingDots}>
                  <ActivityIndicator size="small" color={GOLD} />
                  <Text style={styles.loadingText}>Consultando a curadoria...</Text>
                </View>
              </View>
            )}

            {/* ── Paywall ── */}
            {isAtLimit && !loading && (
              <View style={styles.paywallCard}>
                <View style={styles.paywallTop}>
                  <Text style={styles.paywallLogo}>L.</Text>
                  <View style={styles.paywallBadge}>
                    <Feather name="lock" size={11} color={GOLD} />
                    <Text style={styles.paywallBadgeText}>Lucky Premium</Text>
                  </View>
                </View>
                <Text style={styles.paywallTitle}>Continue com o Lucky</Text>
                <Text style={styles.paywallBody}>
                  Você usou as 2 respostas gratuitas. Assine para refinamentos ilimitados,
                  recomendações personalizadas e acesso completo ao concierge.
                </Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.paywallCTA,
                    pressed && { opacity: 0.85 },
                    checkingOut && { opacity: 0.6 },
                  ]}
                  onPress={handleUpgrade}
                  disabled={checkingOut}
                >
                  {checkingOut
                    ? <ActivityIndicator size="small" color="#000" />
                    : <Text style={styles.paywallCTAText}>Assinar para continuar</Text>
                  }
                </Pressable>
                <Text style={styles.paywallSub}>Cancele quando quiser · Sem taxas ocultas</Text>
              </View>
            )}
          </ScrollView>

          {/* ── Input bar ── */}
          {!isAtLimit && (
            <View style={[styles.inputBar, { paddingBottom: bottomPad + 12 }]}>
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Pergunte sobre o Rio..."
                placeholderTextColor="rgba(255,255,255,0.35)"
                onSubmitEditing={() => sendQuery(inputText)}
                returnKeyType="send"
                editable={!loading}
                multiline={false}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.sendBtn,
                  (!inputText.trim() || loading) && styles.sendBtnDisabled,
                  pressed && inputText.trim() && !loading && { opacity: 0.8 },
                ]}
                onPress={() => sendQuery(inputText)}
                disabled={!inputText.trim() || loading}
              >
                <Feather
                  name="send"
                  size={18}
                  color={!inputText.trim() || loading ? "rgba(255,255,255,0.30)" : "#FFFFFF"}
                />
              </Pressable>
            </View>
          )}
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.36)",
  },
  content: {
    paddingHorizontal: 20,
  },

  // Header
  header: {
    marginBottom: 28,
    gap:          10,
  },
  headerTop: {
    flexDirection:  "row",
    alignItems:     "flex-start",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontFamily:    "Inter_500Medium",
    fontSize:      11,
    color:         GOLD,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    marginBottom:  4,
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize:   38,
    color:      "#FFFFFF",
    lineHeight: 44,
  },
  logoMark: {
    width:           52,
    height:          52,
    borderRadius:    26,
    backgroundColor: `${GOLD}20`,
    borderWidth:     1,
    borderColor:     `${GOLD}40`,
    alignItems:      "center",
    justifyContent:  "center",
    marginTop:       4,
  },
  logoMarkText: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize:   22,
    color:      GOLD,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize:   15,
    color:      "rgba(255,255,255,0.60)",
    lineHeight: 22,
  },
  counterBadge: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               5,
    alignSelf:         "flex-start",
    backgroundColor:   "rgba(212,175,55,0.12)",
    borderRadius:      20,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderWidth:       1,
    borderColor:       "rgba(212,175,55,0.22)",
  },
  counterText: {
    fontFamily: "Inter_500Medium",
    fontSize:   12,
    color:      GOLD,
  },
  premiumBadge: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               5,
    alignSelf:         "flex-start",
    backgroundColor:   "rgba(212,175,55,0.12)",
    borderRadius:      20,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderWidth:       1,
    borderColor:       "rgba(212,175,55,0.22)",
  },
  premiumBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize:   12,
    color:      GOLD,
  },

  // Prompts
  promptsSection: {
    marginBottom: 8,
  },
  promptsLabel: {
    fontFamily:    "Inter_500Medium",
    fontSize:      11,
    color:         "rgba(255,255,255,0.40)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom:  12,
  },
  promptsGrid: {
    gap: 8,
  },
  promptChip: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    backgroundColor:   "rgba(255,255,255,0.08)",
    borderRadius:      14,
    paddingHorizontal: 16,
    paddingVertical:   13,
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.14)",
  } as never,
  promptChipPressed: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderColor:     "rgba(212,175,55,0.30)",
  },
  promptChipText: {
    fontFamily: "Inter_500Medium",
    fontSize:   14,
    color:      "rgba(255,255,255,0.88)",
    flex:       1,
  },

  // Messages
  messageBlock: {
    marginBottom: 14,
  },
  userBubbleRow: {
    flexDirection:  "row",
    justifyContent: "flex-end",
  },
  userBubble: {
    backgroundColor:     "rgba(255,255,255,0.14)",
    borderRadius:        16,
    borderBottomRightRadius: 4,
    paddingHorizontal:   14,
    paddingVertical:     10,
    maxWidth:            "80%",
    borderWidth:         1,
    borderColor:         "rgba(255,255,255,0.20)",
  },
  userBubbleText: {
    fontFamily: "Inter_400Regular",
    fontSize:   14,
    color:      "#FFFFFF",
    lineHeight: 20,
  },

  // Lucky response card
  luckyCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius:    18,
    padding:         18,
    gap:             12,
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.14)",
  },
  luckyCardHeader: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
  },
  luckyAvatarSmall: {
    width:           28,
    height:          28,
    borderRadius:    14,
    backgroundColor: `${GOLD}22`,
    borderWidth:     1,
    borderColor:     `${GOLD}40`,
    alignItems:      "center",
    justifyContent:  "center",
  },
  luckyAvatarSmallText: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize:   13,
    color:      GOLD,
  },
  luckyCardLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize:   13,
    color:      "rgba(255,255,255,0.80)",
  },
  luckyCardText: {
    fontFamily: "Inter_400Regular",
    fontSize:   15,
    color:      "#FFFFFF",
    lineHeight: 23,
  },

  // Loading
  loadingCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius:    18,
    padding:         18,
    gap:             12,
    borderWidth:     1,
    borderColor:     "rgba(255,255,255,0.14)",
    marginBottom:    14,
  },
  loadingDots: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           10,
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize:   14,
    color:      "rgba(255,255,255,0.55)",
  },

  // Paywall
  paywallCard: {
    backgroundColor: "rgba(0,0,0,0.42)",
    borderRadius:    20,
    padding:         24,
    gap:             12,
    marginTop:       8,
    borderWidth:     1,
    borderColor:     "rgba(212,175,55,0.30)",
  },
  paywallTop: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    marginBottom:   4,
  },
  paywallLogo: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize:   26,
    color:      GOLD,
  },
  paywallBadge: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               5,
    backgroundColor:   "rgba(212,175,55,0.16)",
    borderRadius:      20,
    paddingHorizontal: 10,
    paddingVertical:   5,
    borderWidth:       1,
    borderColor:       "rgba(212,175,55,0.30)",
  },
  paywallBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize:   11,
    color:      GOLD,
  },
  paywallTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize:   22,
    color:      "#FFFFFF",
    lineHeight: 28,
  },
  paywallBody: {
    fontFamily: "Inter_400Regular",
    fontSize:   14,
    color:      "rgba(255,255,255,0.72)",
    lineHeight: 21,
  },
  paywallCTA: {
    backgroundColor: GOLD,
    borderRadius:    14,
    paddingVertical: 15,
    alignItems:      "center",
    marginTop:       4,
  },
  paywallCTAText: {
    fontFamily: "Inter_600SemiBold",
    fontSize:   15,
    color:      "#000000",
  },
  paywallSub: {
    fontFamily: "Inter_400Regular",
    fontSize:   12,
    color:      "rgba(255,255,255,0.45)",
    textAlign:  "center",
  },

  // Input bar
  inputBar: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               10,
    paddingHorizontal: 16,
    paddingTop:        12,
    backgroundColor:   "rgba(0,0,0,0.40)",
    borderTopWidth:    1,
    borderTopColor:    "rgba(255,255,255,0.10)",
  },
  input: {
    flex:              1,
    backgroundColor:   "rgba(255,255,255,0.10)",
    borderRadius:      14,
    paddingHorizontal: 16,
    paddingVertical:   12,
    fontFamily:        "Inter_400Regular",
    fontSize:          15,
    color:             "#FFFFFF",
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.15)",
  },
  sendBtn: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: GOLD,
    alignItems:      "center",
    justifyContent:  "center",
  },
  sendBtnDisabled: {
    backgroundColor: "rgba(255,255,255,0.10)",
  },
});
