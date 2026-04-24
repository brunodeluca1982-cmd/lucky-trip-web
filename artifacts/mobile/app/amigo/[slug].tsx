// app/amigo/[slug].tsx — Perfil do Amigo do Lucky
import React, { useState, useEffect } from "react";
import {
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";

const { width: W, height: H } = Dimensions.get("window");
const PETROL = "#1B4F72";
const SAND = "#F5F0E8";
const GOLD = "#C9A227";
const SUPABASE = "https://bkwlximkadmlnbgjcrdp.supabase.co";
const FALLBACK = `${SUPABASE}/storage/v1/object/public/media/rio-de-janeiro/hero/foto/imagehero01.jpg`;

type Autor = {
  id: string;
  slug: string;
  nome: string;
  tagline: string;
  bio: string;
  foto_url: string;
  pais_bandeira: string;
  instagram?: string;
};

type Roteiro = {
  id: string;
  titulo: string;
  subtitulo: string;
  hero_image_url: string;
  tags: string[];
  is_lucky_pick: boolean;
};

export default function AmigoScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const insets = useSafeAreaInsets();
  const top = Platform.OS === "web" ? 0 : insets.top;
  const bottom = Platform.OS === "web" ? 34 : insets.bottom;

  const [autor, setAutor] = useState<Autor | null>(null);
  const [roteiros, setRoteiros] = useState<Roteiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!slug) return;

    // Fetch amigo (tabela real é "amigos", não "autores")
    supabase
      .from("amigos")
      .select("*")
      .eq("slug", slug)
      .eq("ativo", true)
      .single()
      .then(({ data }) => {
        if (data) {
          // Mapear campos da tabela amigos para o formato Autor
          const mapped: Autor = {
            id: data.id,
            slug: data.slug,
            nome: data.nome,
            tagline: data.bio_curta || "",
            bio: data.bio_longa || data.bio_curta || "",
            foto_url: data.foto_url || "",
            pais_bandeira: "🇧🇷",
            instagram: data.instagram,
          };
          setAutor(mapped);
        }
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (!autor?.id) return;

    // Fetch lucklists do amigo (tabela lucklists tem autor_id)
    supabase
      .from("lucklists")
      .select("id, titulo, subtitulo, capa_url, tema")
      .eq("autor_id", autor.id)
      .eq("ativo", true)
      .order("ordem")
      .then(({ data }) => {
        if (data) {
          const mapped = data.map((l: any) => ({
            id: l.id,
            titulo: l.titulo,
            subtitulo: l.subtitulo || "",
            hero_image_url: l.capa_url || FALLBACK,
            tags: l.tema ? [l.tema] : [],
            is_lucky_pick: true,
          }));
          setRoteiros(mapped as Roteiro[]);
        }
      });
  }, [autor?.id]);

  // Fallback data para preview
  const data = autor || {
    nome: "Felipe Drummond",
    tagline: "Um carioca apaixonado por trilhas e picos secretos",
    bio: "Moro no Rio há 35 anos e conheço cada cantinho desta cidade. Trabalho como fotógrafo de natureza e guia de ecoturismo.",
    foto_url: FALLBACK,
    pais_bandeira: "🇧🇷",
    instagram: "felipedrummond",
  };

  const previewRoteiros: Roteiro[] = roteiros.length > 0 ? roteiros : [
    {
      id: "1",
      titulo: "Trilhas do Alto",
      subtitulo: "Os melhores mirantes do Rio",
      hero_image_url: FALLBACK,
      tags: ["Natureza", "Aventura"],
      is_lucky_pick: true,
    },
    {
      id: "2",
      titulo: "Praias Secretas",
      subtitulo: "Onde os locais vão",
      hero_image_url: FALLBACK,
      tags: ["Praia", "Escondido"],
      is_lucky_pick: false,
    },
    {
      id: "3",
      titulo: "Gastronomia de Rua",
      subtitulo: "O melhor da comida carioca",
      hero_image_url: FALLBACK,
      tags: ["Comida", "Local"],
      is_lucky_pick: true,
    },
    {
      id: "4",
      titulo: "Rio à Noite",
      subtitulo: "Bares e música ao vivo",
      hero_image_url: FALLBACK,
      tags: ["Noite", "Música"],
      is_lucky_pick: false,
    },
  ];

  const toggleSave = (id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Construir URL completa da imagem
  const fotoUrl = data.foto_url?.startsWith("http")
    ? data.foto_url
    : data.foto_url
      ? `${SUPABASE}/storage/v1/object/public/media/${data.foto_url}`
      : FALLBACK;

  const getImageUrl = (url: string) => {
    if (!url) return FALLBACK;
    if (url.startsWith("http")) return url;
    return `${SUPABASE}/storage/v1/object/public/media/${url}`;
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══ HERO ═══ */}
        <View style={styles.heroContainer}>
          <Image source={{ uri: fotoUrl }} style={styles.heroImage} />
          <LinearGradient
            colors={["rgba(0,0,0,0.2)", "transparent", "rgba(0,0,0,0.8)"]}
            locations={[0, 0.3, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Top Bar */}
          <View style={[styles.topBar, { paddingTop: top + 12 }]}>
            <Pressable style={styles.topBtn} onPress={() => router.back()}>
              <Feather name="chevron-left" size={24} color="#FFF" />
              <Text style={styles.topBtnText}>Voltar</Text>
            </Pressable>
          </View>

          {/* Hero Content */}
          <View style={styles.heroContent}>
            {/* Pill */}
            <View style={styles.pill}>
              <Text style={styles.pillFlag}>{data.pais_bandeira}</Text>
              <Text style={styles.pillText}>AMIGO DO LUCKY</Text>
            </View>

            {/* Nome */}
            <Text style={styles.heroName}>{data.nome}</Text>

            {/* Tagline em itálico */}
            <Text style={styles.heroTagline}>{data.tagline}</Text>
          </View>
        </View>

        {/* ═══ BIO ═══ */}
        <View style={styles.bioSection}>
          <Text style={styles.bioText}>{data.bio}</Text>
        </View>

        {/* ═══ ROTEIROS ═══ */}
        <View style={styles.roteirosSection}>
          <Text style={styles.roteirosTitle}>Roteiros de {data.nome?.split(" ")[0]}</Text>

          <View style={styles.roteirosGrid}>
            {previewRoteiros.map((roteiro) => (
              <Pressable
                key={roteiro.id}
                style={styles.roteiroCard}
                onPress={() => router.push(`/roteiro/${roteiro.id}`)}
              >
                <Image
                  source={{ uri: getImageUrl(roteiro.hero_image_url) }}
                  style={styles.roteiroImage}
                />
                <LinearGradient
                  colors={["transparent", "rgba(0,0,0,0.8)"]}
                  style={styles.roteiroGradient}
                />

                {/* Lucky Pick Badge */}
                {roteiro.is_lucky_pick && (
                  <View style={styles.luckyBadge}>
                    <Feather name="star" size={10} color={GOLD} />
                    <Text style={styles.luckyBadgeText}>LUCKY PICK</Text>
                  </View>
                )}

                {/* Bookmark */}
                <Pressable
                  style={styles.bookmarkBtn}
                  onPress={() => toggleSave(roteiro.id)}
                >
                  <Ionicons
                    name={savedIds.has(roteiro.id) ? "bookmark" : "bookmark-outline"}
                    size={18}
                    color="#FFF"
                  />
                </Pressable>

                {/* Content */}
                <View style={styles.roteiroContent}>
                  <Text style={styles.roteiroTitle} numberOfLines={2}>
                    {roteiro.titulo}
                  </Text>
                  <Text style={styles.roteiroSub} numberOfLines={1}>
                    {roteiro.subtitulo}
                  </Text>

                  {/* Tags */}
                  <View style={styles.tagsRow}>
                    {roteiro.tags?.slice(0, 2).map((tag, i) => (
                      <View key={i} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const CARD_WIDTH = (W - 48) / 2;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  scroll: {
    flex: 1,
  },

  // ═══ HERO ═══
  heroContainer: {
    width: W,
    height: H * 0.6,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  topBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingLeft: 6,
    paddingRight: 14,
    gap: 2,
  },
  topBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    color: "#FFF",
  },
  heroContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  pillFlag: {
    fontSize: 14,
  },
  pillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: "#FFF",
    letterSpacing: 0.5,
  },
  heroName: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 36,
    color: "#FFF",
    lineHeight: 44,
    marginBottom: 8,
  },
  heroTagline: {
    fontFamily: "PlayfairDisplay_400Regular_Italic",
    fontSize: 16,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 24,
  },

  // ═══ BIO ═══
  bioSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  bioText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    lineHeight: 24,
  },

  // ═══ ROTEIROS ═══
  roteirosSection: {
    backgroundColor: SAND,
    padding: 20,
    paddingTop: 24,
  },
  roteirosTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    color: "#1A1A1A",
    marginBottom: 16,
  },
  roteirosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  roteiroCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.4,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#333",
  },
  roteiroImage: {
    width: "100%",
    height: "100%",
  },
  roteiroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  luckyBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  luckyBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 8,
    color: GOLD,
    letterSpacing: 0.5,
  },
  bookmarkBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  roteiroContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  roteiroTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#FFF",
    marginBottom: 2,
  },
  roteiroSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 8,
  },
  tagsRow: {
    flexDirection: "row",
    gap: 6,
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  tagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 9,
    color: "#FFF",
  },
});
