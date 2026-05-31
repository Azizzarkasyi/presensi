import {View, Text, StyleSheet, ScrollView, Modal} from "react-native";
import * as Location from "expo-location";
import {useEffect, useState} from "react";
import {Ionicons} from "@expo/vector-icons";
import {useRouter} from "expo-router";
import {useAuth} from "../../src/contexts/AuthContext";
import {useResponsive} from "../../src/hooks/useResponsive";
import {getCompanyConfig, updateCompanyConfig} from "../../src/services/api";
import {readCachedJson, writeCachedJson} from "../../src/utils/webCache";

// UI Components
import {theme} from "../../src/constants/theme";
import {ScreenHeader} from "../../src/components/ui/ScreenHeader";
import {Card} from "../../src/components/ui/Card";
import {Button} from "../../src/components/ui/Button";
import {Input} from "../../src/components/ui/Input";
import {MapPicker} from "../../src/components/ui/MapPicker";
import {useGlobalModal} from "../../src/contexts/GlobalModalContext";

export default function AdminSettings() {
  const {user} = useAuth();
  const router = useRouter();
  const {isDesktop, isWeb} = useResponsive();
  const {showModal} = useGlobalModal();
  const [loading, setLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [usingCache, setUsingCache] = useState(false);
  const [config, setConfig] = useState<any>({
    maxBreakMinutesPerDay: 60,
    lateThresholdMinutes: 15,
    overtimeRateMultiplier: 1.5,
    officeLatitude: null,
    officeLongitude: null,
    allowedRadiusMeters: 50,
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const cacheKey = "admin-company-config-cache";

  const loadConfig = async () => {
    setUsingCache(false);
    try {
      const res = await getCompanyConfig();
      const configData = res.data?.data || res.data;
      if (configData) {
        // Merge with defaults to ensure no keys are missing
        const nextConfig = {...config, ...configData};
        setConfig(nextConfig);
        await writeCachedJson(cacheKey, nextConfig);
      }
    } catch (error) {
      console.error("Error loading config:", error);
      const cachedConfig = await readCachedJson<any>(cacheKey);
      if (cachedConfig) {
        setConfig((prev: any) => ({...prev, ...cachedConfig}));
        setUsingCache(true);
        showModal({
          title: "Offline",
          message: "Menampilkan pengaturan terakhir yang tersimpan",
          buttonText: "Tutup",
        });
      }
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateCompanyConfig(config);
      await loadConfig(); // Reload from server to confirm save
      showModal({
        title: "Berhasil",
        message: "Pengaturan perusahaan berhasil diperbarui.",
        buttonText: "OK",
      });
    } catch (error: any) {
      console.error("Save config error:", error);
      showModal({
        title: "Gagal",
        message:
          error.response?.data?.message ||
          error.response?.data?.error ||
          error.message ||
          "Gagal menyimpan pengaturan",
        isError: true,
        buttonText: "Tutup",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, isWeb && styles.containerWeb]}>
      <ScreenHeader title="Pengaturan Perusahaan" />


      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isWeb && isDesktop && (
          <View style={styles.heroPanel}>
            <View style={styles.heroTextBlock}>
              <View style={styles.heroBadge}>
                <Ionicons name="settings-outline" size={14} color="#fff" />
                <Text style={styles.heroBadgeText}>Settings Console</Text>
              </View>
              <Text style={styles.heroTitle}>
                Atur jam kerja, lembur, dan radius lokasi dari browser.
              </Text>
              <Text style={styles.heroSubtitle}>
                Pengaturan yang terakhir tersimpan tetap bisa dimuat lagi jika
                koneksi sedang tidak stabil.
              </Text>
            </View>

            <View style={styles.heroStats}>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatLabel}>Toleransi</Text>
                <Text style={styles.heroStatValue}>
                  {config.lateThresholdMinutes} mnt
                </Text>
              </View>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatLabel}>Istirahat</Text>
                <Text style={styles.heroStatValue}>
                  {config.maxBreakMinutesPerDay} mnt
                </Text>
              </View>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatLabel}>Radius</Text>
                <Text style={styles.heroStatValue}>
                  {config.allowedRadiusMeters} m
                </Text>
              </View>
            </View>
          </View>
        )}

        <View
          style={[styles.contentWrapper, isDesktop && styles.contentDesktop]}
        >
          {usingCache ? (
            <Text style={styles.cacheNote}>
              Menampilkan cache pengaturan terakhir.
            </Text>
          ) : null}

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>⏰ Waktu Kerja</Text>

            <Input
              label="Toleransi Keterlambatan (menit)"
              value={(config.lateThresholdMinutes ?? 0).toString()}
              onChangeText={text =>
                setConfig({
                  ...config,
                  lateThresholdMinutes: parseInt(text) || 0,
                })
              }
              keyboardType="numeric"
              placeholder="15"
              hint={`Karyawan dianggap telat jika absen setelah jadwal masuk mereka + ${config.lateThresholdMinutes} menit`}
            />
          </Card>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>☕ Istirahat</Text>

            <Input
              label="Maks. Istirahat / Hari (menit)"
              value={(config.maxBreakMinutesPerDay ?? 0).toString()}
              onChangeText={text =>
                setConfig({
                  ...config,
                  maxBreakMinutesPerDay: parseInt(text) || 0,
                })
              }
              keyboardType="numeric"
              placeholder="60"
              hint="Batas total waktu istirahat akumulatif per hari"
            />
          </Card>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>💰 Lembur</Text>

            <Input
              label="Pengali Gaji Lembur"
              value={(config.overtimeRateMultiplier ?? 0).toString()}
              onChangeText={text =>
                setConfig({
                  ...config,
                  overtimeRateMultiplier: parseFloat(text) || 0,
                })
              }
              keyboardType="decimal-pad"
              placeholder="1.5"
              hint={`Rumus: Gaji per jam × ${config.overtimeRateMultiplier}`}
            />
          </Card>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>📍 Jangkauan Lokasi M-Absen</Text>

            {config.officeLatitude && config.officeLongitude ? (
              <View style={{marginBottom: 16}}>
                <Text style={styles.label}>Koordinat Tersimpan</Text>
                <Text style={{color: theme.colors.text.secondary}}>
                  {config.officeLatitude}, {config.officeLongitude}
                </Text>
              </View>
            ) : (
              <View style={{marginBottom: 16}}>
                <Text
                  style={{color: theme.colors.text.light, fontStyle: "italic"}}
                >
                  Belum ada lokasi yang diatur
                </Text>
              </View>
            )}

            <Button
              title="🗺️ Pilih via Peta Interaktif"
              variant="outline"
              onPress={() => setShowMapPicker(true)}
              style={{marginBottom: 16}}
            />

            <Input
              label="Maksimal Radius (meter)"
              value={(config.allowedRadiusMeters ?? 50).toString()}
              onChangeText={text =>
                setConfig({...config, allowedRadiusMeters: parseInt(text) || 0})
              }
              keyboardType="numeric"
              placeholder="50"
              hint="Karyawan tidak bisa absen jika jarak ke kantor melebihi batas meter di atas."
            />
          </Card>

          <Button
            title="Simpan Pengaturan"
            onPress={handleSave}
            loading={loading}
            size="lg"
            style={styles.saveBtn}
          />

          <View style={{height: 40}} />
        </View>
      </ScrollView>

      {/* Map Picker Modal */}
      <Modal visible={showMapPicker} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.mapModalContainer,
              isDesktop && styles.mapModalDesktop,
            ]}
          >
            <MapPicker
              initialLatitude={config.officeLatitude}
              initialLongitude={config.officeLongitude}
              onClose={() => setShowMapPicker(false)}
              onSelect={(lat, lng) => {
                setConfig({
                  ...config,
                  officeLatitude: lat,
                  officeLongitude: lng,
                });
                setShowMapPicker(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  containerWeb: {
    minHeight: "100vh" as any, // removed 'as any' since styles.create treats it loosely or we ignore specific web types here
  },
  heroPanel: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 16 as any,
  },
  heroTextBlock: {flex: 1},
  heroBadge: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 6 as any,
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
    gap: 12 as any,
    flexWrap: "wrap",
    justifyContent: "flex-end",
    alignItems: "stretch",
    minWidth: 320,
  },
  heroStatCard: {
    minWidth: 100,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  heroStatLabel: {color: "#94a3b8", fontSize: 12, marginBottom: 4},
  heroStatValue: {color: "#fff", fontSize: 16, fontWeight: "800"},
  scrollContent: {
    padding: theme.spacing.lg,
  },
  contentWrapper: {
    width: "100%",
  },
  contentDesktop: {
    maxWidth: 600,
    alignSelf: "center",
  },
  card: {
    marginBottom: theme.spacing.lg,
  },
  cacheNote: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    marginBottom: 8,
    fontStyle: "italic",
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text.secondary,
    marginBottom: 8,
    marginLeft: 2,
  },
  flex1: {
    flex: 1,
  },
  saveBtn: {
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 16,
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    maxHeight: "90%",
  },
  mapModalDesktop: {
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
  },
});
