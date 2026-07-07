import { useMemo, useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { messages, mobileCards, roleLabels } from "../src/mobileMockData";
import type { MobileRole } from "../src/mobileMockData";

const roles: MobileRole[] = ["parent", "teacher", "student"];

export default function HomeScreen() {
  const [role, setRole] = useState<MobileRole>("parent");
  const [notice, setNotice] = useState("Tap a card or quick action to open the next task.");

  const quickActions = useMemo(() => {
    if (role === "teacher") {
      return ["Open attendance", "Send reminder", "Review marks"];
    }
    if (role === "student") {
      return ["View fees", "Open library", "Check report card"];
    }
    return ["Review balance", "Open attendance", "Send message"];
  }, [role]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Nova Demonstration School</Text>
          <Text style={styles.title}>{roleLabels[role]} Mobile Workspace</Text>
          <Text style={styles.subtitle}>Role-based school tasks stay active in one place.</Text>
        </View>

        <View style={styles.segmented}>
          {roles.map((item) => (
            <Pressable
              key={item}
              onPress={() => {
                setRole(item);
                setNotice(`${roleLabels[item]} workspace ready.`);
              }}
              style={[styles.segment, role === item && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, role === item && styles.segmentTextActive]}>{roleLabels[item]}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Today’s focus</Text>
          <Text style={styles.bannerText}>{notice}</Text>
        </View>

        <View style={styles.quickActions}>
          {quickActions.map((action) => (
            <Pressable key={action} style={styles.actionButton} onPress={() => setNotice(action)}>
              <Text style={styles.actionButtonText}>{action}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.grid}>
          {mobileCards[role].map((card) => (
            <Pressable key={card.label} style={styles.card} onPress={() => setNotice(`${card.label}: ${card.hint}`)}>
              <Text style={styles.cardLabel}>{card.label}</Text>
              <Text style={styles.cardValue}>{card.value}</Text>
              <Text style={styles.cardHint}>{card.hint}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Communication</Text>
          {messages.map((message) => (
            <Text key={message} style={styles.message}>{message}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8fafc"
  },
  content: {
    padding: 18,
    gap: 16
  },
  header: {
    backgroundColor: "#166534",
    borderRadius: 8,
    padding: 18
  },
  eyebrow: {
    color: "#dcfce7",
    fontSize: 13,
    marginBottom: 6
  },
  title: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "800"
  },
  subtitle: {
    color: "#bbf7d0",
    marginTop: 8
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 4
  },
  banner: {
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    padding: 12,
    gap: 4
  },
  bannerTitle: {
    color: "#1e3a8a",
    fontSize: 14,
    fontWeight: "800"
  },
  bannerText: {
    color: "#334155",
    fontSize: 13
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  actionButton: {
    backgroundColor: "#166534",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  actionButtonText: {
    color: "#ffffff",
    fontWeight: "700"
  },
  segment: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center"
  },
  segmentActive: {
    backgroundColor: "#1e3a8a"
  },
  segmentText: {
    color: "#334155",
    fontWeight: "700"
  },
  segmentTextActive: {
    color: "#ffffff"
  },
  grid: {
    gap: 12
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16
  },
  cardLabel: {
    color: "#64748b",
    fontSize: 13
  },
  cardValue: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 6
  },
  cardHint: {
    color: "#64748b",
    marginTop: 4
  },
  panel: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16
  },
  panelTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 10
  },
  message: {
    color: "#334155",
    paddingVertical: 8
  }
});
