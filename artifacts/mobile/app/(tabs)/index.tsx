// app/(tabs)/index.tsx — HomeScreen v3 (features completas)
import React, { useState, useRef, useEffect } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useDestaques, Destaque } from "@/hooks/useDestaques";
import { useAmigos } from "@/hooks/useFriends";

// ═══════════════════════════════════════════════════════════════════════════
// LOGO ASSET
// ═══════════════════════════════════════════════════════════════════════════
const LOGO_WHITE = require("@/assets/images/logo_symbol_white.png");

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const PETROL = "#1B4F72";
const { width: W, height: H } = Dimensions.get("window");
const SUPABASE = "https://bkwlximkadmlnbgjcrdp.supabase.co";
const FALLBACK = `${SUPABASE}/storage/v1/object/public/media/rio-de-janeiro/hero/foto/imagehero01.jpg`;
const RIO_DESTINO_ID = "7f047742-427f-4b11-8286-781af899c57d";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════
type AgoraItem = { id: string; titulo: string; sub: string; tag: string; foto: string };
type LucklistItem = { id: string; titulo: string; sub: string; foto: string };

// ═══════════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════════
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ═══════════════════════════════════════════════════════════════════════════
// HOOKS
// ═══════════════════════════════════════════════════════════════════════════
function useHeroPhotos() {
  const [photos, setPhotos] = useState<string[]>([FALLBACK]);

  useEffect(() => {
    supabase.storage.from("media").list("rio-de-janeiro/hero/foto").then(({ data }) => {
      if (data && data.length > 0) {
        const urls = data
          .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f.name))
          .map(f => `${SUPABASE}/storage/v1/object/public/media/rio-de-janeiro/hero/foto/${f.name}`);
        if (urls.length > 0) setPhotos(shuffleArray(urls));
      }
    });
  }, []);

  return photos;
}

// Hook para buscar "Agora no Rio" de destino_destaques
function useAgoraNoRio(destinoId: string) {
  const [items, setItems] = useState<AgoraItem[]>([]);

  useEffect(() => {
    supabase
      .from("destino_destaques")
      .select("id, lugar_id, titulo_override, ordem, lugares(id, nome, hero_image_url, bairro:bairros!bairro_id(nome))")
      .eq("destino_id", destinoId)
      .eq("ativo", true)
      .order("ordem")
      .limit(6)
      .then(({ data }) => {
        if (data && data.length > 0) {
          const mapped: AgoraItem[] = data.map((item: any) => ({
            id: item.lugar_id || item.id,
            titulo: item.titulo_override || item.lugares?.nome || "Lugar",
            sub: item.lugares?.bairro?.nome || "",
            tag: "AGORA",
            foto: item.lugares?.hero_image_url || FALLBACK,
          }));
          setItems(mapped);
        }
      });
  }, [destinoId]);

  return items;
}

// Hook para buscar lucklists do destino
function useLucklists(destinoId: string) {
  const [items, setItems] = useState<LucklistItem[]>([]);

  useEffect(() => {
    // Primeiro busca a lucklist do destino
    supabase
      .from("lucklists")
      .select("id, titulo, subtitulo, capa_url")
      .eq("destino_id", destinoId)
      .eq("ativo", true)
      .order("ordem")
      .limit(1)
      .single()
      .then(({ data: lucklist }) => {
        if (!lucklist) return;

        // Depois busca os lugares dessa lucklist
        supabase
          .from("lucklist_lugares")
          .select("lugar_id, lugares(id, nome, hero_image_url, bairro:bairros!bairro_id(nome))")
          .eq("lucklist_id", lucklist.id)
          .limit(6)
          .then(({ data }) => {
            if (data && data.length > 0) {
              const mapped: LucklistItem[] = data.map((item: any) => ({
                id: item.lugar_id || item.id,
                titulo: item.lugares?.nome || "Lugar",
                sub: item.lugares?.bairro?.nome || "",
                foto: item.lugares?.hero_image_url || FALLBACK,
              }));
              setItems(mapped);
            }
          });
      });
  }, [destinoId]);

  return items;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function TopBar({ top, onMusicPress, onGalleryPress }: { top: number; onMusicPress: () => void; onGalleryPress: () => void }) {
  return (
    <View style={[styles.topBar, { paddingTop: top + 8 }]}>
      {/* Espaço vazio no lugar do botão voltar (home não tem tela anterior) */}
      <View style={styles.topLeftSpacer} />
      {/* Logo cursiva oficial */}
      <Image source={LOGO_WHITE} style={styles.logo} resizeMode="contain" />
      <View style={styles.topRight}>
        <Pressable style={styles.iconBtn} onPress={onMusicPress}>
          <Ionicons name="musical-notes" size={18} color="#FFF" />
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onGalleryPress}>
          <Ionicons name="play" size={16} color="#FFF" />
        </Pressable>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HeroDestaque: primeiro terço com crossFade limpo (zero pisca)
// ═══════════════════════════════════════════════════════════════════════════
function HeroDestaque({
  top,
  destaques,
  carouselIdx,
  rioPhotos,
  rioBgIdx
}: {
  top: number;
  destaques: Destaque[];
  carouselIdx: number;
  rioPhotos: string[];
  rioBgIdx: number;
}) {
  const item = destaques[carouselIdx] || { titulo: "Rio de Janeiro", subtitulo: "Três dias entre o mar e a montanha", tipo: "destino", photo_url: FALLBACK };
  const isAmigo = item.tipo === "amigo";
  const isRio = item.tipo === "destino" && item.titulo === "Rio de Janeiro";

  // Foto a exibir: se for Rio, usa slideshow; senão, usa foto do destaque
  const currentPhoto = isRio ? (rioPhotos[rioBgIdx] || FALLBACK) : (item.photo_url || FALLBACK);

  // CrossFade: duas imagens sobrepostas para transição limpa
  const [displayedPhoto, setDisplayedPhoto] = useState(currentPhoto);
  const [prevPhoto, setPrevPhoto] = useState(currentPhoto);
  const crossFade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (currentPhoto !== displayedPhoto) {
      setPrevPhoto(displayedPhoto);
      setDisplayedPhoto(currentPhoto);
      crossFade.setValue(0);
      Animated.timing(crossFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [currentPhoto]);

  // Navegação baseada no tipo de destaque
  const handlePress = () => {
    switch (item.tipo) {
      case "destino":
        router.push(`/destino/${item.destino_slug}`);
        break;
      case "amigo":
        router.push(`/amigo/${item.destino_slug}`);
        break;
      case "lugar":
      case "restaurante":
      case "bar":
      case "atividade":
      case "evento":
        // Todos os tipos de entidade navegam para /lugar/[id]
        if (item.entity_id) {
          router.push(`/lugar/${item.entity_id}`);
        }
        break;
    }
  };

  return (
    <Pressable style={styles.heroDestaque} onPress={handlePress}>
      {/* Imagem anterior (fica embaixo) */}
      <Image source={{ uri: prevPhoto }} style={styles.heroDestaqueImage} />
      {/* Imagem atual (faz fade in por cima) */}
      <Animated.Image source={{ uri: displayedPhoto }} style={[styles.heroDestaqueImage, { opacity: crossFade }]} />
      {/* Gradiente */}
      <LinearGradient colors={["rgba(0,0,0,0.2)", "rgba(0,0,0,0.5)", "rgba(10,10,10,1)"]} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} />

      {/* Conteúdo do card */}
      <View style={[styles.heroTitleContainer, { paddingTop: top + 70 }]}>
        <Text style={styles.heroKicker}>{isAmigo ? "VIAJE COM" : "DESTINO"}</Text>
        <Text style={styles.heroTitleText}>{item.titulo}</Text>
        <Text style={styles.heroSub}>{item.subtitulo}</Text>
        {!isAmigo && <Text style={styles.heroPais}>BRASIL</Text>}
        <View style={styles.dots}>
          {destaques.slice(0, 5).map((_, i) => (
            <View key={i} style={[styles.dot, i === carouselIdx % 5 && styles.dotActive]} />
          ))}
        </View>
      </View>
    </Pressable>
  );
}

function InputBar() {
  return (
    <View style={styles.inputWrap}>
      <View style={styles.inputBar}>
        <View style={styles.socialIcons}>
          <View style={[styles.socialIcon, { backgroundColor: "#E1306C" }]}>
            <Ionicons name="logo-instagram" size={14} color="#FFF" />
          </View>
          <View style={[styles.socialIcon, { backgroundColor: "#000" }]}>
            <Ionicons name="logo-tiktok" size={14} color="#FFF" />
          </View>
          <View style={[styles.socialIcon, { backgroundColor: "#FF0000" }]}>
            <Ionicons name="logo-youtube" size={14} color="#FFF" />
          </View>
        </View>
        <Text style={styles.inputPlaceholder}>Cole um link do Instagram, TikTok...</Text>
      </View>
    </View>
  );
}

function SectionHeader({ label, right, onPress }: { label: string; right?: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {right && (
        <Pressable style={styles.seeAll} onPress={onPress}>
          <Text style={styles.seeAllText}>{right}</Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.6)" />
        </Pressable>
      )}
    </View>
  );
}

function ViajeComEles() {
  const { amigos } = useAmigos();

  // Divide nome em nome + sobrenome para exibição
  const formatNome = (nome: string) => {
    const partes = nome.split(" ");
    return { nome: partes[0], sobrenome: partes.slice(1).join(" ") };
  };

  if (amigos.length === 0) return null;

  return (
    <View style={styles.sectionCompact}>
      <View style={styles.viajeHeader}>
        <Text style={styles.sectionLabel}>VIAJE COM ELES</Text>
        <Pressable style={styles.seeAll} onPress={() => router.push("/amigo/all")}>
          <Text style={styles.seeAllText}>Ver todos</Text>
          <Ionicons name="chevron-forward" size={14} color={PETROL} />
        </Pressable>
      </View>
      <View style={styles.viajeRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.amigosRow}>
          {amigos.map(a => {
            const { nome, sobrenome } = formatNome(a.nome);
            return (
              <Pressable key={a.id} style={styles.amigoItem} onPress={() => router.push(`/amigo/${a.slug}`)}>
                <Image source={{ uri: a.foto_url || FALLBACK }} style={styles.amigoFoto} />
                <Text style={styles.amigoNome}>{nome}</Text>
                <Text style={styles.amigoSobrenome}>{sobrenome}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {/* Seta à direita */}
        <Pressable style={styles.viajeArrow} onPress={() => router.push("/amigo/all")}>
          <Ionicons name="chevron-forward" size={20} color={PETROL} />
        </Pressable>
      </View>
    </View>
  );
}

function AgoraNoDestino({ destinoNome, destinoId }: { destinoNome: string; destinoId: string }) {
  const items = useAgoraNoRio(destinoId);
  const nomeFormatado = destinoNome === "Rio de Janeiro" ? "RIO" : destinoNome.toUpperCase();

  if (items.length === 0) return null;

  return (
    <View style={styles.sectionCompact}>
      <View style={styles.agoraHeader}>
        <View>
          <Text style={styles.sectionLabel}>AGORA NO {nomeFormatado}</Text>
          <Text style={styles.agoraUpdated}>Atualizado agora</Text>
        </View>
        <Pressable style={styles.seeAll} onPress={() => router.push("/(tabs)/agoraNoRio/all")}>
          <Text style={styles.seeAllText}>Ver todos</Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.6)" />
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
        {items.map(item => (
          <Pressable key={item.id} style={styles.card} onPress={() => router.push(`/(tabs)/agoraNoRio/${item.id}`)}>
            <Image source={{ uri: item.foto }} style={styles.cardImg} />
            <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={StyleSheet.absoluteFill} />
            <View style={styles.cardTag}>
              <Text style={styles.cardTagText}>{item.tag}</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.titulo}</Text>
              <View style={styles.cardLoc}>
                <Ionicons name="location-outline" size={10} color="rgba(255,255,255,0.7)" />
                <Text style={styles.cardLocText}>{item.sub}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function LucklistsSection({ destinoNome, items }: { destinoNome: string; items: LucklistItem[] }) {
  const nomeFormatado = destinoNome === "Rio de Janeiro" ? "DO RIO" : `DE ${destinoNome.toUpperCase()}`;

  if (items.length === 0) return null;

  return (
    <View style={styles.sectionCompact}>
      <SectionHeader label={`LUCKLISTS ${nomeFormatado}`} right="Ver todos >" onPress={() => router.push("/(tabs)/luckyList/all")} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
        {items.map(item => (
          <Pressable key={item.id} style={styles.card} onPress={() => router.push(`/(tabs)/luckyList/${item.id}`)}>
            <Image source={{ uri: item.foto }} style={styles.cardImg} />
            <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={StyleSheet.absoluteFill} />
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle} numberOfLines={2}>{item.titulo}</Text>
              <Text style={styles.cardSub}>{item.sub}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function TrilhaDaViagem() {
  const bars = useRef(Array.from({ length: 12 }, () => new Animated.Value(Math.random()))).current;

  useEffect(() => {
    bars.forEach((bar, i) => {
      const animate = () => {
        Animated.sequence([
          Animated.timing(bar, { toValue: Math.random(), duration: 200 + i * 30, useNativeDriver: false }),
          Animated.timing(bar, { toValue: Math.random() * 0.5 + 0.2, duration: 200 + i * 30, useNativeDriver: false }),
        ]).start(animate);
      };
      animate();
    });
  }, []);

  return (
    <View style={styles.trilhaSection}>
      <Text style={styles.sectionLabel}>TRILHA DA VIAGEM</Text>
      <Pressable style={styles.trilhaCard} onPress={() => router.push("/trilha")}>
        <Image source={{ uri: FALLBACK }} style={styles.trilhaThumb} />
        <View style={styles.trilhaText}>
          <Text style={styles.trilhaTitle}>Rio de Janeiro</Text>
          <Text style={styles.trilhaSub}>A trilha sonora perfeita para a cidade.</Text>
          <Text style={styles.trilhaPlaylist}>Playlist by The Lucky Trip</Text>
        </View>
        <View style={styles.playBtn}>
          <Ionicons name="play" size={18} color="#FFF" />
        </View>
        <View style={styles.waveform}>
          {bars.map((bar, i) => (
            <Animated.View
              key={i}
              style={[styles.waveBar, { height: bar.interpolate({ inputRange: [0, 1], outputRange: [4, 20] }) }]}
            />
          ))}
        </View>
      </Pressable>
    </View>
  );
}

// ── Music Modal ──────────────────────────────────────────────────────────────
function MusicModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.musicModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Trilhas Sonoras</Text>
            <Pressable onPress={onClose} style={styles.modalClose}>
              <Ionicons name="close" size={24} color="#FFF" />
            </Pressable>
          </View>
          <Pressable style={styles.playlistItem}>
            <Image source={{ uri: FALLBACK }} style={styles.playlistThumb} />
            <View style={styles.playlistInfo}>
              <Text style={styles.playlistName}>Rio de Janeiro</Text>
              <Text style={styles.playlistSub}>Trilha Sonora • 42 músicas</Text>
            </View>
            <View style={styles.playlistPlay}>
              <Ionicons name="play" size={20} color="#FFF" />
            </View>
          </Pressable>
          <Text style={styles.comingSoonText}>Mais playlists em breve...</Text>
        </View>
      </View>
    </Modal>
  );
}

// ── Gallery Modal ────────────────────────────────────────────────────────────
function GalleryModal({ visible, onClose, photos }: { visible: boolean; onClose: () => void; photos: string[] }) {
  const [currentIdx, setCurrentIdx] = useState(0);

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.galleryContainer}>
        <Pressable style={styles.galleryClose} onPress={onClose}>
          <Ionicons name="close" size={28} color="#FFF" />
        </Pressable>
        <FlatList
          data={photos}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / W);
            setCurrentIdx(idx);
          }}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={styles.galleryImage} resizeMode="contain" />
          )}
          keyExtractor={(item, i) => i.toString()}
        />
        <View style={styles.galleryDots}>
          <Text style={styles.galleryCounter}>{currentIdx + 1} / {photos.length}</Text>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const top = Platform.OS === "web" ? 0 : insets.top;
  const bottom = Platform.OS === "web" ? 34 : insets.bottom;

  const photos = useHeroPhotos();
  const { destaques } = useDestaques();
  const lucklistItems = useLucklists(RIO_DESTINO_ID);
  const [musicModalVisible, setMusicModalVisible] = useState(false);
  const [galleryModalVisible, setGalleryModalVisible] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // SISTEMA 1 — BACKGROUND (13 segundos, todas as fotos do bucket hero/foto)
  // ═══════════════════════════════════════════════════════════════════════════
  const [bgIdx, setBgIdx] = useState(0);
  const bgIdxRef = useRef(0);
  const bgFade = useRef(new Animated.Value(1)).current;

  useEffect(() => { bgIdxRef.current = bgIdx; }, [bgIdx]);

  useEffect(() => {
    if (photos.length <= 1) return;
    const interval = setInterval(() => {
      const nextIdx = (bgIdxRef.current + 1) % photos.length;
      bgFade.setValue(0);
      setBgIdx(nextIdx);
      Animated.timing(bgFade, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 13000);
    return () => clearInterval(interval);
  }, [photos.length]);

  const currentBgPhoto = photos[bgIdx] || FALLBACK;

  // ═══════════════════════════════════════════════════════════════════════════
  // SISTEMA 2 — CARROSSEL DE DESTAQUES (5 segundos, cards de amigos/destinos)
  // O crossFade é tratado dentro do HeroDestaque
  // ═══════════════════════════════════════════════════════════════════════════
  const [carouselIdx, setCarouselIdx] = useState(0);
  const carouselIdxRef = useRef(0);

  useEffect(() => { carouselIdxRef.current = carouselIdx; }, [carouselIdx]);

  useEffect(() => {
    if (destaques.length <= 1) return;
    const interval = setInterval(() => {
      const nextIdx = (carouselIdxRef.current + 1) % destaques.length;
      setCarouselIdx(nextIdx);
    }, 5000);
    return () => clearInterval(interval);
  }, [destaques.length]);

  // Nome do destino atual (para seções dinâmicas)
  const currentDestino = destaques[carouselIdx];
  const destinoNome = currentDestino?.tipo === "destino" ? currentDestino.titulo : "Rio de Janeiro";

  return (
    <View style={styles.root}>
      {/* ═══ BACKGROUND: só visível abaixo do primeiro terço ═══ */}
      <View style={styles.bgContainer}>
        <Animated.Image source={{ uri: currentBgPhoto }} style={[styles.bgImage, { opacity: bgFade }]} resizeMode="cover" />
        <View style={styles.overlay} />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.55)"]} locations={[0.3, 1]} style={StyleSheet.absoluteFill} />
      </View>

      {/* ═══ HERO DESTAQUE: primeiro terço com crossFade próprio ═══ */}
      <HeroDestaque
        top={top}
        destaques={destaques}
        carouselIdx={carouselIdx}
        rioPhotos={photos}
        rioBgIdx={bgIdx}
      />

      {/* TopBar */}
      <TopBar top={top} onMusicPress={() => setMusicModalVisible(true)} onGalleryPress={() => setGalleryModalVisible(true)} />

      {/* Modals */}
      <MusicModal visible={musicModalVisible} onClose={() => setMusicModalVisible(false)} />
      <GalleryModal visible={galleryModalVisible} onClose={() => setGalleryModalVisible(false)} photos={photos} />

      {/* Content */}
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: bottom + 90, paddingTop: H * 0.38 }} showsVerticalScrollIndicator={false}>
        {/* Input */}
        <InputBar />

        {/* Sections */}
        <ViajeComEles />
        <AgoraNoDestino destinoNome={destinoNome} destinoId={RIO_DESTINO_ID} />
        <LucklistsSection destinoNome={destinoNome} items={lucklistItems} />
        <TrilhaDaViagem />
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0A0A0A" },
  scroll: { flex: 1 },

  // Background (só visível abaixo do primeiro terço)
  bgContainer: { position: "absolute", top: H * 0.38, left: 0, right: 0, bottom: 0, overflow: "hidden" },
  bgImage: { position: "absolute", width: W, height: H, top: -H * 0.38 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },

  // HeroDestaque (primeiro terço - fundo sólido, crossFade próprio)
  heroDestaque: { position: "absolute", top: 0, left: 0, right: 0, height: H * 0.38, backgroundColor: "#000", zIndex: 5 },
  heroDestaqueImage: { position: "absolute", width: "100%", height: "100%" },

  // TopBar
  topBar: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 },
  topLeftSpacer: { width: 40 },
  logo: { width: 36, height: 36 },
  topRight: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },

  // Hero Title (at top)
  heroTitleContainer: { paddingHorizontal: 20 },
  heroKicker: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.8)", marginBottom: 6 },
  heroTitleText: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 38, color: "#FFF", marginBottom: 6 },
  heroSub: { fontFamily: "Inter_400Regular", fontSize: 15, color: "rgba(255,255,255,0.9)", marginBottom: 6 },
  heroPais: { fontFamily: "Inter_500Medium", fontSize: 11, letterSpacing: 3, color: "rgba(255,255,255,0.7)" },
  dots: { flexDirection: "row", gap: 4, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.4)" },
  dotActive: { width: 18, backgroundColor: "#FFF" },

  // Input - glass style
  inputWrap: { paddingHorizontal: 16, marginBottom: 12 },
  inputBar: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, height: 44, paddingHorizontal: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  socialIcons: { flexDirection: "row", gap: 4 },
  socialIcon: { width: 28, height: 28, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  inputPlaceholder: { flex: 1, marginLeft: 10, fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.6)" },

  // Sections - compact
  sectionCompact: { marginBottom: 8 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 8 },
  sectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 1.5, color: "rgba(255,255,255,0.7)", textTransform: "uppercase" },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 2 },
  seeAllText: { fontFamily: "Inter_500Medium", fontSize: 12, color: "rgba(255,255,255,0.6)" },

  // Viaje com eles
  viajeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 8 },
  viajeRow: { flexDirection: "row", alignItems: "center" },
  viajeArrow: { width: 32, height: 56, alignItems: "center", justifyContent: "center", marginRight: 8 },
  amigosRow: { paddingLeft: 16, gap: 12, alignItems: "center" },
  amigoItem: { alignItems: "center", width: 60 },
  amigoFoto: { width: 56, height: 56, borderRadius: 28, marginBottom: 6 },
  amigoNome: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#FFF", textAlign: "center" },
  amigoSobrenome: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.7)", textAlign: "center" },

  // Agora no Rio
  agoraHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 16, marginBottom: 8 },
  agoraUpdated: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 2 },

  // Cards 120x120
  cardsRow: { paddingHorizontal: 16, gap: 10 },
  card: { width: 120, height: 120, borderRadius: 10, overflow: "hidden", backgroundColor: "#1A1A1A" },
  cardImg: { width: "100%", height: "100%" },
  cardTag: { position: "absolute", top: 8, left: 8, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4, backgroundColor: PETROL },
  cardTagText: { fontFamily: "Inter_600SemiBold", fontSize: 10, color: "#FFF", letterSpacing: 0.5 },
  cardContent: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 8 },
  cardTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#FFF", lineHeight: 16 },
  cardSub: { fontFamily: "Inter_400Regular", fontSize: 9, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  cardLoc: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  cardLocText: { fontFamily: "Inter_400Regular", fontSize: 9, color: "rgba(255,255,255,0.7)" },

  // Trilha
  trilhaSection: { paddingHorizontal: 16, marginBottom: 8 },
  trilhaCard: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 10, gap: 10 },
  trilhaThumb: { width: 48, height: 48, borderRadius: 8 },
  trilhaText: { flex: 1 },
  trilhaTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#FFF" },
  trilhaSub: { fontFamily: "Inter_400Regular", fontSize: 10, color: "rgba(255,255,255,0.6)" },
  trilhaPlaylist: { fontFamily: "Inter_400Regular", fontSize: 9, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  playBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: PETROL, alignItems: "center", justifyContent: "center" },
  waveform: { flexDirection: "row", alignItems: "flex-end", gap: 2, height: 20 },
  waveBar: { width: 3, borderRadius: 1.5, backgroundColor: PETROL },

  // Music Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  musicModal: { backgroundColor: "#1A1A1A", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontFamily: "Inter_600SemiBold", fontSize: 18, color: "#FFF" },
  modalClose: { padding: 4 },
  playlistItem: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 12, gap: 12 },
  playlistThumb: { width: 56, height: 56, borderRadius: 8 },
  playlistInfo: { flex: 1 },
  playlistName: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#FFF" },
  playlistSub: { fontFamily: "Inter_400Regular", fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  playlistPlay: { width: 40, height: 40, borderRadius: 20, backgroundColor: PETROL, alignItems: "center", justifyContent: "center" },
  comingSoonText: { fontFamily: "Inter_400Regular", fontSize: 13, color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 20 },

  // Gallery Modal
  galleryContainer: { flex: 1, backgroundColor: "#000" },
  galleryClose: { position: "absolute", top: 50, right: 20, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  galleryImage: { width: W, height: H },
  galleryDots: { position: "absolute", bottom: 50, left: 0, right: 0, alignItems: "center" },
  galleryCounter: { fontFamily: "Inter_500Medium", fontSize: 14, color: "#FFF" },
});
