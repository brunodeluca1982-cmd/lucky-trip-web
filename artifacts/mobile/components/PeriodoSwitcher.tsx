import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { periodoMeta, type Periodo } from "@/data/mockData";

const C = Colors.light;
const PERIODS: Periodo[] = ["manha", "tarde", "noite"];

interface Props {
  active: Periodo;
  onChange: (p: Periodo) => void;
}

export function PeriodoSwitcher({ active, onChange }: Props) {
  return (
    <View style={styles.row}>
      {PERIODS.map((p, i) => {
        const meta = periodoMeta[p];
        const isActive = p === active;
        return (
          <React.Fragment key={p}>
            <Pressable
              onPress={() => onChange(p)}
              style={({ pressed }) => [
                styles.pill,
                isActive && styles.pillActive,
                pressed && { opacity: 0.75 },
              ]}
            >
              <Feather
                name={meta.icon as any}
                size={11}
                color={isActive ? C.white : C.warmGray}
              />
              <Text
                style={[
                  styles.pillLabel,
                  isActive ? styles.pillLabelActive : styles.pillLabelInactive,
                ]}
              >
                {meta.label}
              </Text>
            </Pressable>
            {i < PERIODS.length - 1 && <View style={styles.sep} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginTop: 10,
    marginBottom: 2,
    gap: 0,
  },
  sep: {
    width: 1,
    height: 14,
    backgroundColor: C.border,
    marginHorizontal: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "transparent",
  },
  pillActive: {
    backgroundColor: C.darkBrown,
    borderColor: C.darkBrown,
  },
  pillLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  pillLabelActive: {
    color: C.white,
  },
  pillLabelInactive: {
    color: C.warmGray,
  },
});
