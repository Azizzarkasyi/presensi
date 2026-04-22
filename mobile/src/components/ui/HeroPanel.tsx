import React from "react";
import {View, Text, StyleSheet, ViewStyle} from "react-native";
import {Ionicons} from "@expo/vector-icons";

interface HeroPanelStat {
  label: string;
  value: string | number;
}

interface HeroPanelProps {
  badgeIcon?: keyof typeof Ionicons.glyphMap;
  badgeText: string;
  title: string;
  subtitle: string;
  stats?: HeroPanelStat[];
  style?: ViewStyle;
}

export function HeroPanel({
  badgeIcon,
  badgeText,
  title,
  subtitle,
  stats,
  style,
}: HeroPanelProps) {
  return (
    <View style={[styles.heroPanel, style]}>
      <View style={styles.heroTextBlock}>
        <View style={styles.heroBadge}>
          {badgeIcon && (
            <Ionicons name={badgeIcon} size={14} color="#fff" />
          )}
          <Text style={styles.heroBadgeText}>{badgeText}</Text>
        </View>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroSubtitle}>{subtitle}</Text>
      </View>

      {stats && stats.length > 0 && (
        <View style={styles.heroStats}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>{stat.label}</Text>
              <Text style={styles.heroStatValue}>{stat.value}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heroPanel: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 24,
    marginTop: 24,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 16,
  },
  heroTextBlock: {flex: 1},
  heroBadge: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.22)",
    marginBottom: 12,
  },
  heroBadgeText: {color: "#fff", fontSize: 12, fontWeight: "700"},
  heroTitle: {
    color: "#fff",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    maxWidth: 620,
  },
  heroSubtitle: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 680,
  },
  heroStats: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "flex-end",
    alignItems: "stretch",
    minWidth: 220,
  },
  heroStatCard: {
    minWidth: 96,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  heroStatLabel: {color: "#94a3b8", fontSize: 12, marginBottom: 4},
  heroStatValue: {color: "#fff", fontSize: 16, fontWeight: "800"},
});
