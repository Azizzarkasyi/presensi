import React, {useState, useEffect} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  Image,
  TouchableOpacity
} from "react-native";
import {useRouter} from "expo-router";
import {Ionicons} from "@expo/vector-icons";
import {useResponsive} from "../../src/hooks/useResponsive";
import {useGlobalModal} from "../../src/contexts/GlobalModalContext";
import {getSuperAdminBillings, generateBillings, approveBilling, getSuperAdminProfile, updateSuperAdminProfile, getApiUrl} from "../../src/services/api";
import {theme} from "../../src/constants/theme";
import {ScreenHeader} from "../../src/components/ui/ScreenHeader";
import {Card} from "../../src/components/ui/Card";
import {Button} from "../../src/components/ui/Button";
import {Input} from "../../src/components/ui/Input";

interface Billing {
  id: number;
  tenant: {
    id: number;
    name: string;
    schemaName: string;
  };
  month: number;
  year: number;
  activeUserCount: number;
  amount: number;
  status: string;
  paymentProof?: string;
  createdAt: string;
}

export default function SuperAdminBillings() {
  const router = useRouter();
  const {isDesktop, isWeb} = useResponsive();
  const {showModal} = useGlobalModal();

  const [billings, setBillings] = useState<Billing[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Bank Setup States
  const [showBankSetup, setShowBankSetup] = useState(false);
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [savingBank, setSavingBank] = useState(false);

  // Proof Modal
  const [proofModalVisible, setProofModalVisible] = useState(false);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  useEffect(() => {
    loadBillings();
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await getSuperAdminProfile();
      if (res.data?.data) {
        setBankName(res.data.data.bankName || "");
        setBankAccount(res.data.data.bankAccount || "");
        setBankAccountName(res.data.data.bankAccountName || "");
      }
    } catch (e) {
      console.log('Error loading super admin profile', e);
    }
  };

  const handleSaveBank = async () => {
    setSavingBank(true);
    try {
      await updateSuperAdminProfile({ bankName, bankAccount, bankAccountName });
      setShowBankSetup(false);
      showModal({ title: "Sukses", message: "Rekening pembayaran berhasil disimpan", buttonText: "OK" });
    } catch (error: any) {
      showModal({ title: "Gagal", message: "Gagal menyimpan rekening", isError: true, buttonText: "Tutup" });
    } finally {
      setSavingBank(false);
    }
  };

  const handleApprove = async (billId: number) => {
    showModal({
      title: "Approve Pembayaran",
      message: "Apakah Anda yakin ingin menyetujui pembayaran tagihan ini?",
      buttonText: "Ya, Setujui",
      secondaryButtonText: "Batal",
      onPrimaryPress: async () => {
        try {
          await approveBilling(billId);
          loadBillings();
        } catch (error) {
          showModal({ title: "Gagal", message: "Gagal approve", isError: true, buttonText: "Tutup" });
        }
      }
    });
  };

  const getImageUrl = (path: string) => {
    if (!path) return '';
    const baseUrl = getApiUrl().replace('/api', '');
    const cleanPath = path.startsWith('/api') ? path.replace('/api', '') : path;
    return `${baseUrl}${cleanPath}`;
  };

  const loadBillings = async () => {
    try {
      setLoading(true);
      const res = await getSuperAdminBillings();
      if (res.data?.success) {
        setBillings(res.data.data);
      }
    } catch (error: any) {
      console.error("Error loading billings:", error);
      showModal({
        title: "Error",
        message: "Gagal memuat data tagihan",
        isError: true,
        buttonText: "Tutup",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    showModal({
      title: "Generate Tagihan",
      message: "Anda yakin ingin memindai seluruh perusahaan dan mencetak tagihan bulan ini secara massal?",
      buttonText: "Ya, Mulai",
      secondaryButtonText: "Batal",
      onPrimaryPress: async () => {
        setGenerating(true);
        try {
          const res = await generateBillings();
          showModal({
            title: "Selesai",
            message: res.data?.message || "Tagihan berhasil dicetak.",
            buttonText: "Tutup",
          });
          loadBillings();
        } catch (error: any) {
          showModal({
            title: "Gagal",
            message: error.response?.data?.message || "Gagal mencetak tagihan",
            isError: true,
            buttonText: "Tutup",
          });
        } finally {
          setGenerating(false);
        }
      },
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getMonthName = (month: number) => {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
    ];
    return months[month - 1];
  };

  return (
    <View style={[styles.container, isWeb && styles.containerWeb]}>
      <ScreenHeader title="Manajemen Tagihan" onBack={() => router.back()} />

      {isWeb && isDesktop && (
        <View style={styles.heroPanel}>
          <View style={styles.heroTextBlock}>
            <View style={styles.heroBadge}>
              <Ionicons name="receipt-outline" size={14} color="#fff" />
              <Text style={styles.heroBadgeText}>Billing System</Text>
            </View>
            <Text style={styles.heroTitle}>Tagihan & Invoice Berlangganan</Text>
            <Text style={styles.heroSubtitle}>
              Pantau seluruh tagihan perusahaan. Klik tombol generate untuk memindai otomatis.
            </Text>
          </View>
          <View style={styles.heroStats}>
            <Button
              title="Cetak Tagihan Massal"
              onPress={handleGenerate}
              loading={generating}
              style={{ backgroundColor: "#10b981", borderColor: "#10b981" }}
            />
            <Button
              title="Pengaturan Rekening"
              onPress={() => setShowBankSetup(true)}
              style={{ backgroundColor: "#3b82f6", borderColor: "#3b82f6", marginTop: 8 }}
            />
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadBillings} />
        }
      >
        <View style={[styles.contentWrapper, isDesktop && styles.contentDesktop]}>
          {/* Mobile Generate Button */}
          {(!isWeb || !isDesktop) && (
            <Card style={{ marginBottom: 16 }}>
              <Button
                title="Cetak Tagihan Massal (Generate)"
                onPress={handleGenerate}
                loading={generating}
                size="lg"
                style={{ backgroundColor: "#10b981", borderColor: "#10b981", marginBottom: 8 }}
              />
              <Button
                title="Pengaturan Rekening"
                onPress={() => setShowBankSetup(true)}
                size="lg"
                style={{ backgroundColor: "#3b82f6", borderColor: "#3b82f6" }}
              />
            </Card>
          )}

          <Text style={styles.sectionTitle}>Riwayat Tagihan</Text>

          {billings.length === 0 && !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyText}>Belum ada tagihan yang dicetak.</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {billings.map((bill) => (
                <View key={bill.id} style={[styles.gridItem, isDesktop && styles.gridItemDesktop]}>
                  <Card style={styles.billCard}>
                    <View style={styles.billHeader}>
                      <Text style={styles.tenantName}>{bill.tenant?.name}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          bill.status === "PAID"
                            ? styles.statusPaid
                            : styles.statusUnpaid,
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {bill.status === "PAID" ? "LUNAS" : "BELUM LUNAS"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.billRow}>
                      <Text style={styles.billLabel}>Periode</Text>
                      <Text style={styles.billValue}>
                        {getMonthName(bill.month)} {bill.year}
                      </Text>
                    </View>

                    <View style={styles.billRow}>
                      <Text style={styles.billLabel}>Total User</Text>
                      <Text style={styles.billValue}>{bill.activeUserCount} Karyawan</Text>
                    </View>

                    <View style={[styles.billRow, { marginTop: 8 }]}>
                      <Text style={styles.billLabelTotal}>Total Tagihan</Text>
                      <Text style={styles.billValueTotal}>
                        {formatCurrency(bill.amount)}
                      </Text>
                    </View>

                    {bill.status === "PENDING" && bill.paymentProof && (
                      <View style={{ marginTop: 16 }}>
                        <TouchableOpacity
                          onPress={() => {
                            setSelectedProof(getImageUrl(bill.paymentProof!));
                            setProofModalVisible(true);
                          }}
                        >
                          <Text style={{ color: "#3b82f6", fontWeight: "bold", textAlign: "center", marginBottom: 8 }}>Lihat Bukti Transfer</Text>
                        </TouchableOpacity>
                        <Button title="Setujui Pembayaran" onPress={() => handleApprove(bill.id)} style={{ backgroundColor: "#10b981", borderColor: "#10b981" }} />
                      </View>
                    )}
                  </Card>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Proof Modal */}
      {proofModalVisible && (
        <Modal visible={true} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={{ position: 'absolute', top: 40, right: 20, zIndex: 10 }} onPress={() => setProofModalVisible(false)}>
              <Ionicons name="close-circle" size={40} color="#fff" />
            </TouchableOpacity>
            {selectedProof && (
              <Image source={{ uri: selectedProof }} style={{ width: '90%', height: '80%', resizeMode: 'contain' }} />
            )}
          </View>
        </Modal>
      )}

      {/* Bank Setup Modal */}
      {showBankSetup && (
        <Modal visible={true} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Pengaturan Rekening Pembayaran</Text>
              
              <Text style={{ marginBottom: 4, fontWeight: 'bold' }}>Nama Bank</Text>
              <Input placeholder="Contoh: BCA / Mandiri" value={bankName} onChangeText={setBankName} />
              
              <Text style={{ marginTop: 8, marginBottom: 4, fontWeight: 'bold' }}>Nomor Rekening</Text>
              <Input placeholder="Contoh: 1234567890" value={bankAccount} onChangeText={setBankAccount} keyboardType="numeric" />
              
              <Text style={{ marginTop: 8, marginBottom: 4, fontWeight: 'bold' }}>Atas Nama</Text>
              <Input placeholder="Contoh: PT Solusi Cerdas" value={bankAccountName} onChangeText={setBankAccountName} />

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
                <Button title="Batal" onPress={() => setShowBankSetup(false)} style={{ backgroundColor: '#94a3b8', borderColor: '#94a3b8' }} />
                <Button title="Simpan" onPress={handleSaveBank} loading={savingBank} />
              </View>
            </View>
          </View>
        </Modal>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  containerWeb: { minHeight: "100vh" as any },
  heroPanel: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 16 as any,
  },
  heroTextBlock: { flex: 1 },
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
  heroBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  heroTitle: {
    color: "#fff",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  heroStats: {
    justifyContent: "center",
  },
  scrollContent: { padding: theme.spacing.lg },
  contentWrapper: { width: "100%" },
  contentDesktop: { maxWidth: 1000, alignSelf: "center" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text.primary,
    marginBottom: 16,
    marginLeft: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -8,
  },
  gridItem: {
    width: "100%",
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  gridItemDesktop: {
    width: "50%",
  },
  billCard: {
    padding: 16,
  },
  billHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  tenantName: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text.primary,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPaid: {
    backgroundColor: "#dcfce7",
  },
  statusUnpaid: {
    backgroundColor: "#fee2e2",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0f172a",
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: 12,
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  billLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  billValue: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text.primary,
  },
  billLabelTotal: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text.secondary,
  },
  billValueTotal: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.primary,
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    marginTop: 12,
    color: theme.colors.text.secondary,
    fontSize: 14,
  },
});
