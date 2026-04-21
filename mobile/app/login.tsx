import {useState} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  useWindowDimensions,
} from "react-native";
import {useRouter} from "expo-router";
import {useAuth} from "../src/contexts/AuthContext";
import {useResponsive} from "../src/hooks/useResponsive";
import {theme} from "../src/constants/theme";
import {Ionicons} from "@expo/vector-icons";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const {
    login,
    loginWithTenant,
    requireTenantSelection,
    availableTenants,
    clearTenantSelection,
  } = useAuth();
  const router = useRouter();
  const {isDesktop, isTablet, isWeb} = useResponsive();
  const {width} = useWindowDimensions();
  const showHeroPanel = isWeb && width >= 900;

  const featureItems = [
    {
      icon: "time-outline",
      title: "Absensi cepat",
      desc: "Clock in/out dengan face verification dan GPS.",
    },
    {
      icon: "document-text-outline",
      title: "Izin & koreksi",
      desc: "Ajukan izin, lalu admin bisa approve langsung.",
    },
    {
      icon: "wallet-outline",
      title: "Payroll ringkas",
      desc: "Slip gaji, riwayat, dan status pembayaran.",
    },
  ] as const;

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage("Email dan password harus diisi");
      return;
    }

    setErrorMessage("");
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (error: any) {
      if (error.message === "TENANT_SELECTION_REQUIRED") {
        // Show tenant selection modal
        setShowTenantModal(true);
      } else {
        const message =
          error.response?.data?.message || error.message || "Terjadi kesalahan";
        setErrorMessage(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTenantSelect = async (tenantId: number) => {
    setShowTenantModal(false);
    setErrorMessage("");
    setLoading(true);
    try {
      await loginWithTenant(email, password, tenantId);
      router.replace("/");
    } catch (error: any) {
      const message =
        error.response?.data?.message || error.message || "Terjadi kesalahan";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const closeTenantModal = () => {
    setShowTenantModal(false);
    clearTenantSelection();
  };

  return (
    <ScrollView
      contentContainerStyle={[styles.container, isWeb && styles.containerWeb]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Tenant Selection Modal */}
      <Modal
        visible={showTenantModal}
        transparent
        animationType="fade"
        onRequestClose={closeTenantModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Perusahaan</Text>
            <Text style={styles.modalSubtitle}>
              Email Anda terdaftar di beberapa perusahaan
            </Text>
            <FlatList
              data={availableTenants}
              keyExtractor={item => String(item.id)}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.tenantItem}
                  onPress={() => handleTenantSelect(item.id)}
                >
                  <Text style={styles.tenantName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={closeTenantModal}
            >
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={[styles.shell, showHeroPanel && styles.shellDesktop]}>
        {showHeroPanel && (
          <View style={styles.heroPanel}>
            <View style={styles.brandBadge}>
              <Ionicons name="apps-outline" size={16} color="#fff" />
              <Text style={styles.brandBadgeText}>Web PWA Ready</Text>
            </View>

            <Text style={styles.heroTitle}>
              Absensi yang siap dipakai dari browser HP.
            </Text>
            <Text style={styles.heroSubtitle}>
              Buka sekali, pasang ke layar utama, lalu akses absensi, izin,
              payroll, dan tugas tanpa harus install APK.
            </Text>

            <View style={styles.featureList}>
              {featureItems.map(item => (
                <View key={item.title} style={styles.featureRow}>
                  <View style={styles.featureIconWrap}>
                    <Ionicons
                      name={item.icon as any}
                      size={18}
                      color="#0F172A"
                    />
                  </View>
                  <View style={styles.featureTextWrap}>
                    <Text style={styles.featureTitle}>{item.title}</Text>
                    <Text style={styles.featureDesc}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.statStrip}>
              <View style={styles.statBubble}>
                <Text style={styles.statValue}>GPS</Text>
                <Text style={styles.statLabel}>validasi lokasi</Text>
              </View>
              <View style={styles.statBubble}>
                <Text style={styles.statValue}>Face</Text>
                <Text style={styles.statLabel}>verifikasi wajah</Text>
              </View>
              <View style={styles.statBubble}>
                <Text style={styles.statValue}>PWA</Text>
                <Text style={styles.statLabel}>add to home screen</Text>
              </View>
            </View>
          </View>
        )}

        <View
          style={[
            styles.card,
            isTablet && styles.cardTablet,
            isDesktop && styles.cardDesktop,
            showHeroPanel && styles.cardHeroAligned,
          ]}
        >
          <View style={styles.cardTopRow}>
            <View style={styles.logoMark}>
              <Ionicons
                name="finger-print-outline"
                size={22}
                color={theme.colors.primary}
              />
            </View>
            <View style={{flex: 1}}>
              <Text style={[styles.title, isDesktop && styles.titleDesktop]}>
                Absensi App
              </Text>
              <Text style={styles.subtitle}>
                Multi-Tenant Attendance System
              </Text>
            </View>
          </View>

          <View style={styles.webNote}>
            <Ionicons
              name="globe-outline"
              size={16}
              color={theme.colors.primary}
            />
            <Text style={styles.webNoteText}>
              Bisa dibuka di web dan dipasang ke home screen di HP.
            </Text>
          </View>

          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Login Form */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, isWeb && styles.inputWeb]}
              placeholder="Masukkan email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={theme.colors.text.light}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, isWeb && styles.inputWeb]}
              placeholder="Masukkan password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={theme.colors.text.light}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              loading && styles.buttonDisabled,
              isWeb && styles.buttonWeb,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Masuk ke Dashboard</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.footerHint}>
            Untuk pengalaman terbaik di HP, buka lewat browser lalu pilih Pasang
            ke Layar Utama.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#0F172A",
  },
  containerWeb: {
    alignItems: "center",
    minHeight: "100vh" as any,
    paddingVertical: 28,
    backgroundColor: "#0F172A",
  },
  shell: {
    width: "100%",
    gap: 16 as any,
  },
  shellDesktop: {
    maxWidth: 1160,
    flexDirection: "row",
    alignItems: "stretch",
  },
  heroPanel: {
    flex: 1.1,
    borderRadius: 28,
    padding: 32,
    backgroundColor: "#081225",
    borderWidth: 1,
    borderColor: "#1E293B",
    justifyContent: "space-between",
  },
  brandBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8 as any,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.18)",
    marginBottom: 20,
  },
  brandBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "800",
    fontFamily: theme.typography.h1.fontFamily,
    maxWidth: 480,
  },
  heroSubtitle: {
    color: "#CBD5E1",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 16,
    maxWidth: 520,
    fontFamily: theme.typography.body.fontFamily,
  },
  featureList: {
    marginTop: 28,
    gap: 14 as any,
  },
  featureRow: {
    flexDirection: "row",
    gap: 12 as any,
    alignItems: "flex-start",
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
    fontFamily: theme.typography.caption.fontFamily,
  },
  featureDesc: {
    color: "#94A3B8",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: theme.typography.small.fontFamily,
  },
  statStrip: {
    flexDirection: "row",
    gap: 12 as any,
    marginTop: 28,
    flexWrap: "wrap",
  },
  statBubble: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    minWidth: 132,
  },
  statValue: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
  },
  statLabel: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  cardHeroAligned: {
    flex: 0.9,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12 as any,
    marginBottom: 4,
  },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  webNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8 as any,
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  webNoteText: {
    color: "#1E3A8A",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    width: "100%",
  },
  cardTablet: {
    maxWidth: 400,
  },
  cardDesktop: {
    maxWidth: 460,
    padding: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    color: "#0F172A",
    marginBottom: 4,
  },
  titleDesktop: {
    fontSize: 36,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#64748b",
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: "#fee2e2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#f87171",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  inputWeb: {
    outlineStyle: "none" as any,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonWeb: {
    cursor: "pointer" as any,
  },
  buttonDisabled: {
    backgroundColor: "#93c5fd",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  footerHint: {
    marginTop: 14,
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 16,
  },
  tenantItem: {
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  tenantName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  cancelButton: {
    padding: 12,
    alignItems: "center",
    marginTop: 8,
  },
  cancelButtonText: {
    color: "#64748b",
    fontSize: 14,
  },
});
