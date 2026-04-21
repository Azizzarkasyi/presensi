import {useEffect, useState} from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import {ScreenHeader} from "../../src/components/ui/ScreenHeader";
import {Button} from "../../src/components/ui/Button";
import {theme} from "../../src/constants/theme";
import {useResponsive} from "../../src/hooks/useResponsive";
import {readCachedJson, writeCachedJson} from "../../src/utils/webCache";
import {useGlobalModal} from "../../src/contexts/GlobalModalContext";
import {getMyPayrolls} from "../../src/services/api";
import api from "../../src/services/api";

interface Payroll {
  id: number;
  periodStart: string;
  periodEnd: string;
  baseSalary: number;
  deductions: number;
  netSalary: number;
  paymentStatus: string;
  paymentProof: string | null;
  createdAt: string;
}

export default function PayrollView() {
  const {isDesktop, isWeb} = useResponsive();
  const {showModal} = useGlobalModal();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingCache, setUsingCache] = useState(false);

  const cacheKey = "user-payroll-cache";

  useEffect(() => {
    loadPayrolls();
  }, []);

  const loadPayrolls = async () => {
    setUsingCache(false);
    try {
      const res = await getMyPayrolls();
      const data = res.data.data || [];
      setPayrolls(data);
      await writeCachedJson(cacheKey, data);
    } catch (error) {
      console.error("Error loading payrolls:", error);
      const cachedPayrolls = await readCachedJson<Payroll[]>(cacheKey);
      if (cachedPayrolls && cachedPayrolls.length > 0) {
        setPayrolls(cachedPayrolls);
        setUsingCache(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const handleExportExcel = async () => {
    try {
      setLoading(true);
      const res = await api.get("/payroll/my/export/excel", {
        responseType: "blob",
      });

      if (Platform.OS === "web") {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "gaji_saya.xlsx");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const fr = new FileReader();
        fr.onload = async () => {
          const fileUri = `${FileSystem.documentDirectory}gaji_saya.xlsx`;
          await FileSystem.writeAsStringAsync(
            fileUri,
            (fr.result as string).split(",")[1],
            {encoding: FileSystem.EncodingType.Base64},
          );
          await Sharing.shareAsync(fileUri);
        };
        fr.readAsDataURL(res.data);
      }
    } catch (error) {
      showModal({
        title: "Error",
        message: "Gagal mengekspor laporan excel",
        isError: true,
        buttonText: "Tutup",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Slip Gaji"
        rightElement={
          <Button
            title="📥 Excel"
            variant="success"
            size="sm"
            onPress={handleExportExcel}
          />
        }
      />

      <FlatList
        data={payrolls}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({item}) => (
          <View style={styles.card}>
            <View style={styles.periodRow}>
              <Text style={styles.periodLabel}>Periode</Text>
              <Text style={styles.periodValue}>
                {formatDate(item.periodStart)} - {formatDate(item.periodEnd)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.salaryRow}>
              <Text style={styles.salaryLabel}>Gaji Pokok</Text>
              <Text style={styles.salaryValue}>
                {formatCurrency(item.baseSalary)}
              </Text>
            </View>

            <View style={styles.salaryRow}>
              <Text style={styles.salaryLabel}>Potongan</Text>
              <Text style={styles.deductionValue}>
                - {formatCurrency(item.deductions)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.salaryRow}>
              <Text style={styles.netLabel}>Total Diterima</Text>
              <Text style={styles.netValue}>
                {formatCurrency(item.netSalary)}
              </Text>
            </View>

            <View style={[styles.divider, {marginTop: 12, marginBottom: 12}]} />

            <View style={styles.salaryRow}>
              <Text style={styles.salaryLabel}>Status Pencairan</Text>
              <Text
                style={{
                  fontWeight: "bold",
                  color:
                    item.paymentStatus === "PAID"
                      ? theme.colors.status.success
                      : theme.colors.status.warning,
                }}
              >
                {item.paymentStatus}
              </Text>
            </View>

            {item.paymentStatus === "PAID" && item.paymentProof && (
              <TouchableOpacity
                onPress={() =>
                  window.open(
                    api.defaults.baseURL?.replace("/api", "") +
                      item.paymentProof,
                    "_blank",
                  )
                }
                style={{marginTop: 8}}
              >
                <Text
                  style={{
                    color: theme.colors.status.info,
                    textAlign: "center",
                    fontWeight: "500",
                  }}
                >
                  📄 Lihat Bukti Transfer
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListHeaderComponent={
          <View>
            {isWeb && isDesktop && (
              <View style={styles.heroPanel}>
                <View style={styles.heroTextBlock}>
                  <View style={styles.heroBadge}>
                    <Ionicons name="wallet-outline" size={14} color="#fff" />
                    <Text style={styles.heroBadgeText}>Payroll Overview</Text>
                  </View>
                  <Text style={styles.heroTitle}>
                    Slip gaji yang nyaman dibuka dari browser.
                  </Text>
                  <Text style={styles.heroSubtitle}>
                    Ekspor laporan dan cek status pencairan tanpa blok statistik
                    tambahan.
                  </Text>
                </View>
              </View>
            )}

            {usingCache ? (
              <Text style={styles.cacheNote}>
                Menampilkan cache slip gaji terakhir.
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={styles.emptyText}>
              {loading ? "Memuat..." : "Belum ada slip gaji"}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={loadPayrolls}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: "#f8fafc"},
  heroPanel: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
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
    minWidth: 220,
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
  cacheNote: {
    color: "#64748b",
    fontSize: 12,
    marginHorizontal: 16,
    marginTop: 8,
    fontStyle: "italic",
  },
  listContent: {padding: theme.spacing.lg, paddingBottom: theme.spacing.xl},
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
  },
  periodRow: {marginBottom: 12},
  periodLabel: {fontSize: 12, color: "#64748b", marginBottom: 4},
  periodValue: {fontSize: 16, fontWeight: "600", color: "#1e293b"},
  divider: {height: 1, backgroundColor: "#e2e8f0", marginVertical: 12},
  salaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  salaryLabel: {fontSize: 14, color: "#64748b"},
  salaryValue: {fontSize: 14, color: "#1e293b"},
  deductionValue: {fontSize: 14, color: theme.colors.status.error},
  netLabel: {fontSize: 16, fontWeight: "600", color: "#1e293b"},
  netValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.status.success,
  },
  emptyContainer: {alignItems: "center", marginTop: 60},
  emptyIcon: {fontSize: 48, marginBottom: 16},
  emptyText: {color: "#94a3b8", fontSize: 16},
});
