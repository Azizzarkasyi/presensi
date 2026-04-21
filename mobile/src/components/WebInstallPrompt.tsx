import {useEffect, useMemo, useState} from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {theme} from "../constants/theme";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{outcome: "accepted" | "dismissed"; platform: string}>;
};

export function WebInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const {width} = useWindowDimensions();

  const storageKey = "pwa-install-dismissed";

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") {
      return;
    }

    try {
      const dismissed = window.localStorage.getItem(storageKey) === "1";
      setIsDismissed(dismissed);
    } catch {
      setIsDismissed(false);
    }

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      try {
        window.localStorage.setItem(storageKey, "1");
      } catch {
        // Ignore storage failures in restricted browsers.
      }
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstallPrompt as EventListener,
    );
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt as EventListener,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const shouldShow = useMemo(() => {
    return (
      Platform.OS === "web" &&
      !isInstalled &&
      !isDismissed &&
      (deferredPrompt || isIOS)
    );
  }, [deferredPrompt, isDismissed, isIOS, isInstalled]);

  if (!shouldShow) return null;

  const handleInstall = async () => {
    if (!deferredPrompt || typeof window === "undefined") {
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      // Ignore storage failures in restricted browsers.
    }
    setIsDismissed(true);
  };

  const handleDismiss = () => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey, "1");
      } catch {
        // Ignore storage failures in restricted browsers.
      }
    }
    setIsDismissed(true);
  };

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={[styles.card, width < 720 && styles.cardCompact]}>
        <View style={styles.iconBadge}>
          <Ionicons name="phone-portrait-outline" size={22} color="#fff" />
        </View>

        <View style={styles.textBlock}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Web App</Text>
            </View>
            <Text style={styles.title}>Pasang ke Layar Utama</Text>
          </View>
          <Text style={styles.description}>
            Buka aplikasi seperti app biasa dari home screen, lebih cepat dan
            nyaman untuk absensi harian.
          </Text>
          {isIOS ? (
            <Text style={styles.hint}>
              iPhone: tekan tombol Share di Safari, lalu pilih Add to Home
              Screen.
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          {deferredPrompt ? (
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleInstall}
            >
              <Text style={styles.primaryText}>Pasang</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleDismiss}
          >
            <Text style={styles.secondaryText}>Nanti</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "fixed" as any,
    left: 16,
    right: 16,
    bottom: 16,
    zIndex: 9999,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 720,
    backgroundColor: "#0F172A",
    borderRadius: 20,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: 12},
    elevation: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 16 as any,
  },
  cardCompact: {
    flexDirection: "column",
    alignItems: "stretch",
    gap: 12 as any,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  textBlock: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10 as any,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.18)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.24)",
  },
  badgeText: {
    color: "#BFDBFE",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  title: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    fontFamily: theme.typography.h3.fontFamily,
  },
  description: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
    fontFamily: theme.typography.body.fontFamily,
  },
  hint: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 17,
    fontFamily: theme.typography.small.fontFamily,
  },
  actions: {
    flexDirection: "row",
    gap: 8 as any,
    alignItems: "center",
    flexWrap: "wrap",
  },
  button: {
    minHeight: 42,
    borderRadius: 999,
    paddingHorizontal: 14,
    minWidth: 92,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#334155",
  },
  primaryText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  secondaryText: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "600",
  },
});
