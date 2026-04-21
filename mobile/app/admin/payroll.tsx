import {useState, useEffect, useMemo} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Alert,
  Platform,
} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {useRouter} from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import {useAuth} from "../../src/contexts/AuthContext";
import api, {
  generatePayroll,
  getAllPayrolls,
  markPayrollPaid,
} from "../../src/services/api";
import {useResponsive} from "../../src/hooks/useResponsive";

// UI Components
import {theme} from "../../src/constants/theme";
import {ScreenHeader} from "../../src/components/ui/ScreenHeader";
import {Card} from "../../src/components/ui/Card";
import {Button} from "../../src/components/ui/Button";
import {Input} from "../../src/components/ui/Input";
import {SuccessModal} from "../../src/components/ui/SuccessModal";
import {Badge} from "../../src/components/ui/Badge";

interface Employee {
  id: number;
  name: string;
  email: string;
  salaryType: string;
  salary: number;
}

export default function AdminPayroll() {
  const {user} = useAuth();
  const router = useRouter();
  const {isDesktop, isWeb} = useResponsive();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState<
    "ALL" | "PENDING" | "PAID"
  >("ALL");
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    loadEmployees();
    loadPayrolls();
  }, []);

  const loadEmployees = async () => {
    try {
      const res = await api.get("/users");
      // Handle different API response structures safely
      const data = res.data.data || res.data;
      const allEmployees = Array.isArray(data) ? data : [];

      const companyEmployees = allEmployees.filter(
        (e: any) =>
          // If companyId check is needed, ensure it exists, otherwise just filter by role
          (user?.companyId ? e.companyId === user.companyId : true) &&
          e.role === "USER",
      );
      setEmployees(companyEmployees);
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", "Gagal memuat data karyawan");
    }
  };

  const loadPayrolls = async () => {
    try {
      const params: {periodStart?: string; periodEnd?: string} = {};
      if (historyStartDate && historyEndDate) {
        params.periodStart = historyStartDate;
        params.periodEnd = historyEndDate;
      }

      const res = await getAllPayrolls(params);
      setPayrolls(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedEmployee || !startDate || !endDate) {
      Alert.alert(
        "Validasi Gagal",
        "Mohon pilih karyawan dan tentukan periode",
      );
      return;
    }

    setLoading(true);
    try {
      await generatePayroll({
        userId: selectedEmployee,
        periodStart: startDate,
        periodEnd: endDate,
      });
      setShowSuccessModal(true);
      setSelectedEmployee(null);
      setStartDate("");
      setEndDate("");
    } catch (error: any) {
      Alert.alert(
        "Gagal",
        error.response?.data?.error || "Terjadi kesalahan saat generate gaji",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setLoading(true);
      const res = await api.get("/payroll/export/excel", {
        responseType: "blob",
      });
      if (Platform.OS === "web") {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", "laporan_gaji.xlsx");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const fr = new FileReader();
        fr.onload = async () => {
          const fileUri = `${FileSystem.documentDirectory}laporan_gaji.xlsx`;
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
      Alert.alert("Error", "Gagal mengekspor laporan");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (payrollId: number) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const formData = new FormData();

        let fileObj: any;
        if (Platform.OS === "web") {
          const res = await fetch(asset.uri);
          const blob = await res.blob();
          fileObj = new File([blob], "transfer-proof.jpg", {
            type: "image/jpeg",
          });
          formData.append("paymentProof", fileObj);
        } else {
          formData.append("paymentProof", {
            uri: asset.uri,
            name: "transfer-proof.jpg",
            type: "image/jpeg",
          } as any);
        }

        setLoading(true);
        await markPayrollPaid(payrollId, formData);
        Alert.alert("Sukses", "Slip gaji berhasil ditandai sudah dibayar!");
        loadPayrolls();
      }
    } catch (error) {
      Alert.alert("Gagal", "Terjadi kesalahan upload bukti bayar");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredPayrolls = useMemo(() => {
    return payrolls.filter(item => {
      const q = historySearch.toLowerCase().trim();
      const matchSearch =
        item.user?.name?.toLowerCase().includes(q) ||
        item.user?.email?.toLowerCase().includes(q) ||
        item.periodStart?.includes(q) ||
        item.periodEnd?.includes(q);
      const matchStatus =
        historyStatus === "ALL" || item.paymentStatus === historyStatus;
      return matchSearch && matchStatus;
    });
  }, [payrolls, historySearch, historyStatus]);

  const summary = useMemo(() => {
    const totals = {
      total: filteredPayrolls.length,
      pending: 0,
      paid: 0,
      totalNet: 0,
    };

    for (const item of filteredPayrolls) {
      if (item.paymentStatus === "PAID") totals.paid += 1;
      if (item.paymentStatus === "PENDING") totals.pending += 1;
      totals.totalNet += Number(item.netSalary || 0);
    }

    return totals;
  }, [filteredPayrolls]);

  const payrollHeroText =
    historyStartDate && historyEndDate
      ? `${historyStartDate} sampai ${historyEndDate}`
      : "Gunakan filter untuk membatasi riwayat pembayaran.";

  const applyHistoryFilters = async () => {
    await loadPayrolls();
  };

  const resetHistoryFilters = async () => {
    setHistorySearch("");
    setHistoryStatus("ALL");
    setHistoryStartDate("");
    setHistoryEndDate("");
    await loadPayrolls();
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "PAID":
        return "success";
      case "PENDING":
        return "warning";
      default:
        return "default";
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Generate Gaji" />

      {isWeb && isDesktop && (
        <View style={styles.heroPanel}>
          <View style={styles.heroTextBlock}>
            <View style={styles.heroBadge}>
              <Ionicons name="wallet-outline" size={14} color="#fff" />
              <Text style={styles.heroBadgeText}>Payroll Console</Text>
            </View>
            <Text style={styles.heroTitle}>
              Kelola generate slip, status bayar, dan ekspor laporan dari
              browser.
            </Text>
            <Text style={styles.heroSubtitle}>{payrollHeroText}</Text>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Total Slip</Text>
              <Text style={styles.heroStatValue}>{summary.total}</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Pending</Text>
              <Text style={styles.heroStatValue}>{summary.pending}</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Lunas</Text>
              <Text style={styles.heroStatValue}>{summary.paid}</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Total Net</Text>
              <Text style={styles.heroStatValue}>
                {formatCurrency(summary.totalNet)}
              </Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>1. Pilih Karyawan</Text>

          {employees.length === 0 ? (
            <Text style={styles.emptyText}>
              Tidak ada karyawan yang ditemukan.
            </Text>
          ) : (
            <FlatList
              data={employees}
              horizontal
              keyExtractor={item => item.id.toString()}
              renderItem={({item}) => (
                <Button
                  title={`${item.name}\n${formatCurrency(item.salary)}/${item.salaryType}`}
                  variant={selectedEmployee === item.id ? "primary" : "outline"}
                  onPress={() => setSelectedEmployee(item.id)}
                  style={styles.empBtn}
                  textStyle={styles.empBtnText}
                />
              )}
              showsHorizontalScrollIndicator={false}
              style={styles.empList}
              contentContainerStyle={styles.empListContent}
            />
          )}

          <Text style={styles.sectionTitle}>2. Tentukan Periode</Text>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Input
                label="Tanggal Mulai"
                placeholder="YYYY-MM-DD"
                value={startDate}
                onChangeText={setStartDate}
                hint="Contoh: 2024-01-01"
              />
            </View>
            <View style={{width: 12}} />
            <View style={styles.flex1}>
              <Input
                label="Tanggal Akhir"
                placeholder="YYYY-MM-DD"
                value={endDate}
                onChangeText={setEndDate}
                hint="Contoh: 2024-01-31"
              />
            </View>
          </View>

          <View style={styles.divider} />

          <Button
            title="Generate Slip Gaji"
            onPress={handleGenerate}
            loading={loading}
            size="lg"
            variant="primary"
            icon={<Text>💰</Text>}
          />
        </Card>

        <Card style={styles.card}>
          <View
            style={[
              styles.row,
              {justifyContent: "space-between", alignItems: "center"},
            ]}
          >
            <Text style={styles.sectionTitle}>Riwayat Pembayaran Slip</Text>
            <Button
              title="📥 Ekspor Excel"
              onPress={handleExportExcel}
              variant="success"
              size="sm"
              loading={loading}
            />
          </View>

          <Input
            label="Cari Riwayat"
            placeholder="Nama, email, atau periode"
            value={historySearch}
            onChangeText={setHistorySearch}
          />

          <View style={styles.statusFilterRow}>
            {(["ALL", "PENDING", "PAID"] as const).map(status => (
              <Button
                key={status}
                title={status === "ALL" ? "Semua" : status}
                variant={historyStatus === status ? "primary" : "outline"}
                size="sm"
                onPress={() => setHistoryStatus(status)}
                style={styles.statusBtn}
              />
            ))}
          </View>

          <View style={styles.row}>
            <View style={styles.flex1}>
              <Input
                label="Periode Mulai"
                placeholder="YYYY-MM-DD"
                value={historyStartDate}
                onChangeText={setHistoryStartDate}
              />
            </View>
            <View style={{width: 12}} />
            <View style={styles.flex1}>
              <Input
                label="Periode Akhir"
                placeholder="YYYY-MM-DD"
                value={historyEndDate}
                onChangeText={setHistoryEndDate}
              />
            </View>
          </View>

          <View style={styles.actionRow}>
            <Button
              title="Terapkan"
              onPress={applyHistoryFilters}
              style={styles.actionBtn}
            />
            <Button
              title="Reset"
              variant="outline"
              onPress={resetHistoryFilters}
              style={styles.actionBtn}
            />
          </View>

          <View style={styles.summaryRow}>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.total}</Text>
              <Text style={styles.summaryLabel}>Total Slip</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.pending}</Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{summary.paid}</Text>
              <Text style={styles.summaryLabel}>Lunas</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryValue}>
                {formatCurrency(summary.totalNet)}
              </Text>
              <Text style={styles.summaryLabel}>Total Net</Text>
            </Card>
          </View>

          {filteredPayrolls.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada riwayat penggajian.</Text>
          ) : (
            filteredPayrolls.map((p: any) => (
              <View key={p.id} style={styles.payrollItem}>
                <View style={{flex: 1}}>
                  <Text style={{fontWeight: "bold"}}>{p.user?.name}</Text>
                  <Text
                    style={{fontSize: 12, color: theme.colors.text.secondary}}
                  >
                    Periode: {p.periodStart.split("T")[0]} s/d{" "}
                    {p.periodEnd.split("T")[0]}
                  </Text>
                  <Text style={{fontSize: 14, marginTop: 4}}>
                    Net: {formatCurrency(p.netSalary)}
                  </Text>
                  <Badge
                    label={p.paymentStatus}
                    variant={getStatusVariant(p.paymentStatus)}
                    size="sm"
                  />
                </View>

                {p.paymentStatus === "PENDING" && (
                  <Button
                    title="Tandai Bayar"
                    onPress={() => handleMarkPaid(p.id)}
                    variant="outline"
                    size="sm"
                  />
                )}
                {p.paymentStatus === "PAID" && p.paymentProof && (
                  <Text
                    style={{
                      color: "blue",
                      textDecorationLine: "underline",
                      fontSize: 12,
                    }}
                    onPress={() =>
                      window.open(
                        api.defaults.baseURL?.replace("/api", "") +
                          p.paymentProof,
                        "_blank",
                      )
                    }
                  >
                    Lihat Foto
                  </Text>
                )}
              </View>
            ))
          )}
        </Card>
      </ScrollView>

      <SuccessModal
        visible={showSuccessModal}
        message="Slip gaji berhasil dibuat dan dikirim ke karyawan."
        onClose={() => setShowSuccessModal(false)}
        buttonText="OK"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    maxWidth: 680,
  },
  heroSubtitle: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 700,
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
    minWidth: 110,
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
  card: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.h3,
    marginBottom: 12,
    color: theme.colors.text.primary,
    marginTop: 8,
  },
  empList: {
    marginBottom: 24,
    marginHorizontal: -4, // compensates for padding if needed, but here mainly for look
  },
  empListContent: {
    paddingVertical: 4,
    gap: 8,
  },
  empBtn: {
    minWidth: 140,
    height: "auto",
    paddingVertical: 12,
    marginRight: 8,
    alignItems: "flex-start",
  },
  empBtnText: {
    textAlign: "left",
    fontSize: 12,
  },
  statusFilterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8 as any,
    marginBottom: theme.spacing.md,
  },
  statusBtn: {
    minWidth: 88,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12 as any,
    marginBottom: theme.spacing.md,
  },
  actionBtn: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12 as any,
    marginBottom: theme.spacing.lg,
  },
  summaryCard: {
    flexGrow: 1,
    minWidth: 120,
    alignItems: "center",
    paddingVertical: theme.spacing.md,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.primary,
    textAlign: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 4,
    textAlign: "center",
  },
  emptyText: {
    color: theme.colors.text.secondary,
    fontStyle: "italic",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
  },
  flex1: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 24,
  },
  payrollItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
  },
});
