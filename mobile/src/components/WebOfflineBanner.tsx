import {useEffect, useState} from "react";
import {Platform, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {theme} from "../constants/theme";

export function WebOfflineBanner() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    const updateStatus = () => setIsOnline(window.navigator.onLine);

    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  if (Platform.OS !== "web" || isOnline) {
    return null;
  }

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="cloud-offline-outline" size={18} color="#fff" />
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.title}>Mode offline aktif</Text>
          <Text style={styles.description}>
            Koneksi sedang terputus. Data yang sudah dimuat tetap bisa dilihat,
            lalu muat ulang saat internet kembali.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => window.location.reload()}
        >
          <Text style={styles.buttonText}>Muat ulang</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "fixed" as any,
    left: 16,
    right: 16,
    top: 16,
    zIndex: 9999,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 760,
    backgroundColor: "#111827",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12 as any,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: {width: 0, height: 8},
    elevation: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ef4444",
  },
  textBlock: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
    fontFamily: theme.typography.h3.fontFamily,
  },
  description: {
    color: "#cbd5e1",
    fontSize: 13,
    lineHeight: 18,
    fontFamily: theme.typography.body.fontFamily,
  },
  button: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#334155",
  },
  buttonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});
