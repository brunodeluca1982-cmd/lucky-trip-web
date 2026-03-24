import React from "react";
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useGuia } from "@/context/GuiaContext";
import type { SavedCategory, SavedItem } from "@/context/GuiaContext";

const C = Colors.light;

const CATEGORIES: { key: SavedCategory; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "oQueFazer", label: "O que fazer", icon: "map-pin" },
  { key: "restaurante", label: "Restaurantes", icon: "coffee" },
  { key: "hotel", label: "Hotéis", icon: "home" },
  { key: "lucky", label: "Lucky List", icon: "star" },
];

const CATEGORY_ACCENT: Record<SavedCategory, string> = {
  oQueFazer: C.terracotta,
  restaurante: "#8B6914",
  hotel: "#2D5A3D",
  lucky: C.gold,
};

function EmptyState() {
  return (
    <View style={empty.wrap}>
      <View style={empty.iconWrap}>
        <Feather name="bookmark" size={36} color={C.terracotta} />
      </View>
      <Text style={empty.title}>Salve lugares para{"\n"}montar sua viagem</Text>
      <Text style={empty.desc}>
        Toque no{" "}
        <Text style={empty.descBold}>marcador</Text>
        {" "}em qualquer cartão para guardar aqui.
      </Text>
    </View>
  );
}

const empty = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    paddingTop: 60,
    gap: 16,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(196,112,74,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 26,
    color: C.darkBrown,
    textAlign: "center",
    lineHeight: 34,
  },
  desc: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: C.warmGray,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 260,
  },
  descBold: {
    fontFamily: "Inter_600SemiBold",
    color: C.terracotta,
  },
});

interface SavedItemRowProps {
  item: SavedItem;
  onRemove: (id: string) => void;
  isLast: boolean;
}

function SavedItemRow({ item, onRemove, isLast }: SavedItemRowProps) {
  const accent = CATEGORY_ACCENT[item.categoria];
  return (
    <View style={[row.wrap, !isLast && row.bordered]}>
      <Image source={item.image} style={row.thumb} resizeMode="cover" />
      <View style={row.content}>
        <Text style={row.titulo} numberOfLines={1}>{item.titulo}</Text>
        <View style={row.meta}>
          <View style={[row.dot, { backgroundColor: accent }]} />
          <Text style={row.localizacao} numberOfLines={1}>{item.localizacao}</Text>
        </View>
      </View>
      <Pressable
        onPress={() => onRemove(item.id)}
        style={row.removeBtn}
        hitSlop={8}
      >
        <Feather name="x" size={16} color={C.warmGray} />
      </Pressable>
    </View>
  );
}

const row = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
  },
  bordered: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    resizeMode: "cover",
    backgroundColor: C.sand,
  },
  content: {
    flex: 1,
    gap: 5,
  },
  titulo: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 16,
    color: C.darkBrown,
    lineHeight: 20,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  localizacao: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: C.warmGray,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.sand,
    alignItems: "center",
    justifyContent: "center",
  },
});

interface CategorySectionProps {
  categoria: (typeof CATEGORIES)[number];
  items: SavedItem[];
  onRemove: (id: string) => void;
}

function CategorySection({ categoria, items, onRemove }: CategorySectionProps) {
  const accent = CATEGORY_ACCENT[categoria.key];
  return (
    <View style={sec.wrap}>
      <View style={sec.header}>
        <View style={[sec.iconWrap, { backgroundColor: `${accent}18` }]}>
          <Feather name={categoria.icon} size={15} color={accent} />
        </View>
        <Text style={sec.label}>{categoria.label}</Text>
        <View style={sec.count}>
          <Text style={[sec.countText, { color: accent }]}>{items.length}</Text>
        </View>
      </View>
      <View style={sec.card}>
        {items.map((item, idx) => (
          <SavedItemRow
            key={item.id}
            item={item}
            onRemove={onRemove}
            isLast={idx === items.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

const sec = StyleSheet.create({
  wrap: {
    marginBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: C.darkBrown,
    letterSpacing: 0.3,
    flex: 1,
  },
  count: {
    backgroundColor: C.sand,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
});

export default function MeuGuiaScreen() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top + 16;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { saved, unsave } = useGuia();

  const totalSaved = saved.length;

  const byCategory = CATEGORIES.map((cat) => ({
    categoria: cat,
    items: saved.filter((s) => s.categoria === cat.key),
  })).filter((g) => g.items.length > 0);

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.content,
          { paddingTop: topPad + 8, paddingBottom: bottomPad + 80 },
        ]}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={s.eyebrow}>Viagem</Text>
          <View style={s.titleRow}>
            <Text style={s.title}>Meu Guia</Text>
            {totalSaved > 0 && (
              <View style={s.totalBadge}>
                <Text style={s.totalBadgeText}>{totalSaved}</Text>
              </View>
            )}
          </View>
          {totalSaved > 0 && (
            <Text style={s.subtitle}>
              {totalSaved === 1
                ? "1 lugar salvo"
                : `${totalSaved} lugares salvos`}
            </Text>
          )}
        </View>

        {/* Divider */}
        <View style={s.divider} />

        {/* Content */}
        {totalSaved === 0 ? (
          <EmptyState />
        ) : (
          <View style={s.sections}>
            {byCategory.map(({ categoria, items }) => (
              <CategorySection
                key={categoria.key}
                categoria={categoria}
                items={items}
                onRemove={unsave}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.cream,
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    gap: 6,
    marginBottom: 24,
  },
  eyebrow: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: C.terracotta,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 34,
    color: C.darkBrown,
    lineHeight: 40,
  },
  totalBadge: {
    backgroundColor: C.terracotta,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  totalBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: C.white,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: C.warmGray,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 28,
  },
  sections: {
    gap: 4,
  },
});
