import {useEffect, useState} from "react";
import {View, Text, TouchableOpacity, StyleSheet, Platform, Alert, ScrollView, Modal, ActivityIndicator, Image} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {useRouter} from "expo-router";
import {useAuth} from "../../src/contexts/AuthContext";
import {useResponsive} from "../../src/hooks/useResponsive";
import api, {getAttendanceReport, getBillingStatus, uploadBillingProof} from "../../src/services/api";
import * as ImagePicker from "expo-image-picker";
import {theme} from "../../src/constants/theme";
import {Card} from "../../src/components/ui/Card";
import {readCachedJson, writeCachedJson} from "../../src/utils/webCache";

export default function AdminDashboard() {
  const {user, logout} = useAuth();
  const router = useRouter();
  const {isDesktop, isTablet, isWeb} = useResponsive();
  const [employeeCount, setEmployeeCount] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [lateCount, setLateCount] = useState(0);
  const [alphaCount, setAlphaCount] = useState(0);
  const [activeTaskCount, setActiveTaskCount] = useState(0);
  const [doneTaskCount, setDoneTaskCount] = useState(0);
  const [usingCache, setUsingCache] = useState(false);

  const cacheKey = "admin-dashboard-stats-cache";

  const getStartOfMonthString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}-01`;
  };

  const getEndOfMonthString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const lastDay = new Date(year, today.getMonth() + 1, 0).getDate();
    return `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
  };

  const [billingAlert, setBillingAlert] = useState<any>(null);
  const [billingBankDetails, setBillingBankDetails] = useState<any>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofImage, setProofImage] = useState<any>(null);

  useEffect(() => {
    loadStats();
    checkBilling();
  }, []);

  const checkBilling = async () => {
    try {
      const res = await getBillingStatus();
      if (res.data?.data?.hasUnpaidBilling) {
        setBillingAlert(res.data.data.billing);
        setBillingBankDetails(res.data.data.bankDetails);
      } else {
        setBillingAlert(null);
      }
    } catch (e) {
      console.log('Error checking billing:', e);
    }
  };

  const handlePickProof = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled) {
      setProofImage(result.assets[0]);
    }
  };

  const handleUploadProof = async () => {
    if (!proofImage || !billingAlert) return;
    setUploadingProof(true);
    try {
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const response = await fetch(proofImage.uri);
        const blob = await response.blob();
        formData.append("paymentProof", blob, "proof.jpg");
      } else {
        formData.append("paymentProof", {
          uri: proofImage.uri,
          name: "proof.jpg",
          type: "image/jpeg",
        } as any);
      }
      
      await uploadBillingProof(billingAlert.id, formData);
      Alert.alert("Sukses", "Bukti pembayaran berhasil diunggah.");
      setProofImage(null);
      checkBilling();
    } catch (e: any) {
      Alert.alert("Gagal", e.message || "Gagal mengunggah bukti");
    } finally {
      setUploadingProof(false);
    }
  };

  const loadStats = async () => {
    setUsingCache(false);
    try {
      const [empRes, attRes, taskRes] = await Promise.all([
        api.get("/users"),
        getAttendanceReport({
          startDate: getStartOfMonthString(),
          endDate: getEndOfMonthString(),
        }),
        api.get("/tasks"),
      ]);

      const employees = empRes.data.data || empRes.data;
      setEmployeeCount(Array.isArray(employees) ? employees.length : 0);

      const attendances = attRes.data.data || [];
      setPresentCount(
        attendances.filter((item: any) => item.status === "PRESENT").length,
      );
      setLateCount(
        attendances.filter((item: any) => item.status === "LATE").length,
      );
      setAlphaCount(
        attendances.filter((item: any) => item.status === "ALPHA").length,
      );

      const tasks = taskRes.data.data || [];
      setActiveTaskCount(
        tasks.filter((item: any) => item.status === "IN_PROGRESS").length,
      );
      setDoneTaskCount(
        tasks.filter((item: any) => item.status === "DONE").length,
      );

      await writeCachedJson(cacheKey, {
        employeeCount: Array.isArray(employees) ? employees.length : 0,
        presentCount: attendances.filter(
          (item: any) => item.status === "PRESENT",
        ).length,
        lateCount: attendances.filter((item: any) => item.status === "LATE")
          .length,
        alphaCount: attendances.filter((item: any) => item.status === "ALPHA")
          .length,
        activeTaskCount: tasks.filter(
          (item: any) => item.status === "IN_PROGRESS",
        ).length,
        doneTaskCount: tasks.filter((item: any) => item.status === "DONE")
          .length,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
      const cachedStats = await readCachedJson<any>(cacheKey);
      if (cachedStats) {
        setEmployeeCount(cachedStats.employeeCount || 0);
        setPresentCount(cachedStats.presentCount || 0);
        setLateCount(cachedStats.lateCount || 0);
        setAlphaCount(cachedStats.alphaCount || 0);
        setActiveTaskCount(cachedStats.activeTaskCount || 0);
        setDoneTaskCount(cachedStats.doneTaskCount || 0);
        setUsingCache(true);
      }
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      if (window.confirm("Apakah Anda yakin ingin logout?")) {
        await logout();
        router.replace("/login");
      }
    } else {
      Alert.alert(
        "Konfirmasi Logout",
        "Apakah Anda yakin ingin logout?",
        [
          {text: "Batal", style: "cancel"},
          {
            text: "Logout",
            style: "destructive",
            onPress: async () => {
              await logout();
              router.replace("/login");
            },
          },
        ],
      );
    }
  };

  const menuItems = [
    {
      icon: "👥",
      title: "Karyawan",
      subtitle: `${employeeCount} terdaftar`,
      route: "/admin/employees",
    },
    {
      icon: "📋",
      title: "Absensi",
      subtitle: "Lihat rekap",
      route: "/admin/attendance",
    },
    {
      icon: "📝",
      title: "Koreksi",
      subtitle: "Approve koreksi absensi",
      route: "/admin/attendance-corrections",
    },
    {
      icon: "🩺",
      title: "Izin",
      subtitle: "Approve cuti & sakit",
      route: "/admin/leave-requests",
    },
    {
      icon: "💰",
      title: "Gaji",
      subtitle: "Generate slip",
      route: "/admin/payroll",
    },
    {
      icon: "📝",
      title: "Tugas",
      subtitle: "Kelola tugas",
      route: "/admin/tasks",
    },
    {
      icon: "⚙️",
      title: "Pengaturan",
      subtitle: "Atur jam & istirahat",
      route: "/admin/settings",
    },
  ];

  return (
    <View style={[styles.container, isWeb && styles.containerWeb]}>
      {/* Sidebar for Desktop */}
      {isDesktop && (
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Admin Panel</Text>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.sidebarItem}
              onPress={() => router.push(item.route as any)}
            >
              <Text style={styles.sidebarItemText}>
                {item.icon} {item.title}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.sidebarSpacer} />
          <TouchableOpacity onPress={handleLogout} style={styles.sidebarLogout}>
            <Text style={styles.sidebarLogoutText}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content */}
      <View style={[styles.main, isDesktop && styles.mainDesktop]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, isDesktop && styles.titleDesktop]}>
              Admin Perusahaan
            </Text>
            <Text style={styles.welcome}>Halo, {user?.name}!</Text>
          </View>
          {!isDesktop && (
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
          {isWeb && isDesktop && (
            <View style={styles.heroPanel}>
            <View style={styles.heroTextBlock}>
              <View style={styles.heroBadge}>
                <Ionicons name="analytics-outline" size={14} color="#fff" />
                <Text style={styles.heroBadgeText}>Admin Web Console</Text>
              </View>
              <Text style={styles.heroTitle}>
                Pantau data penting dari satu layar.
              </Text>
              <Text style={styles.heroSubtitle}>
                Ringkas, cepat dibaca, dan tidak mengulang ringkasan di bawah.
              </Text>
            </View>
          </View>
        )}

        {billingAlert && (
          <Modal visible={true} transparent animationType="fade">
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
              <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, alignItems: 'center' }}>
                <Ionicons name="warning-outline" size={48} color="#EF4444" />
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#0F172A', marginTop: 16, textAlign: 'center' }}>Pemberitahuan Tagihan</Text>
                <Text style={{ fontSize: 14, color: '#475569', marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
                  Perusahaan Anda memiliki tagihan langganan (Periode: {billingAlert.month}/{billingAlert.year}) yang belum dibayar sejumlah <Text style={{fontWeight: 'bold', color: '#EF4444'}}>Rp {billingAlert.amount.toLocaleString('id-ID')}</Text>.
                </Text>

                {billingBankDetails && (
                  <View style={{ backgroundColor: '#F1F5F9', padding: 12, borderRadius: 8, marginTop: 12, width: '100%' }}>
                    <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>Transfer ke Rekening:</Text>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#0F172A' }}>{billingBankDetails.bankName}</Text>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E3A8A', letterSpacing: 1, marginVertical: 4 }}>{billingBankDetails.bankAccount}</Text>
                    <Text style={{ fontSize: 14, color: '#475569' }}>a/n {billingBankDetails.bankAccountName}</Text>
                  </View>
                )}

                {billingAlert.paymentProof ? (
                  <View style={{ marginTop: 24, padding: 12, backgroundColor: '#DCFCE7', borderRadius: 8, width: '100%', alignItems: 'center' }}>
                    <Ionicons name="time-outline" size={24} color="#166534" />
                    <Text style={{ color: '#166534', fontWeight: 'bold', marginTop: 8, textAlign: 'center' }}>
                      Bukti pembayaran sedang diperiksa oleh Super Admin. Harap tunggu konfirmasi.
                    </Text>
                  </View>
                ) : (
                  <View style={{ width: '100%', marginTop: 20 }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#0F172A', marginBottom: 8 }}>Upload Bukti Pembayaran:</Text>
                    
                    <TouchableOpacity onPress={handlePickProof} style={{ borderWidth: 1, borderColor: '#CBD5E1', borderStyle: 'dashed', borderRadius: 8, padding: 20, alignItems: 'center', backgroundColor: '#F8FAFC' }}>
                      {proofImage ? (
                        <Image source={{ uri: proofImage.uri }} style={{ width: 100, height: 100, borderRadius: 8 }} />
                      ) : (
                        <>
                          <Ionicons name="cloud-upload-outline" size={32} color="#64748B" />
                          <Text style={{ color: '#64748B', marginTop: 8 }}>Pilih Gambar/Foto Bukti</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    {proofImage && (
                      <TouchableOpacity
                        onPress={handleUploadProof}
                        disabled={uploadingProof}
                        style={{ backgroundColor: '#1E3A8A', paddingVertical: 12, borderRadius: 8, marginTop: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}
                      >
                        {uploadingProof ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Kirim Bukti Pembayaran</Text>}
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>
          </Modal>
        )}

        {usingCache ? (
          <Text style={styles.cacheNote}>
            Menampilkan cache statistik terakhir.
          </Text>
        ) : null}

        {/* Menu Grid (Mobile/Tablet only) */}
        {!isDesktop && (
          <View style={[styles.menu, isTablet && styles.menuTablet]}>
            {menuItems.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.menuCard, isTablet && styles.menuCardTablet]}
                onPress={() => router.push(item.route as any)}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Stats for Desktop */}
        {isDesktop && (
          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{employeeCount}</Text>
              <Text style={styles.statLabel}>Total Karyawan</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{presentCount}</Text>
              <Text style={styles.statLabel}>Hadir Bulan Ini</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{lateCount}</Text>
              <Text style={styles.statLabel}>Terlambat</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statValue}>{activeTaskCount}</Text>
              <Text style={styles.statLabel}>Task Aktif</Text>
            </Card>
          </View>
        )}

        <View style={styles.quickStatsRow}>
          <Card style={styles.quickStatCard}>
            <Text style={styles.quickStatLabel}>Alpa</Text>
            <Text style={styles.quickStatValue}>{alphaCount}</Text>
          </Card>
          <Card style={styles.quickStatCard}>
            <Text style={styles.quickStatLabel}>Task Selesai</Text>
            <Text style={styles.quickStatValue}>{doneTaskCount}</Text>
          </Card>
        </View>

          <TouchableOpacity
            style={[styles.addButton, isDesktop && styles.addButtonDesktop]}
            onPress={() => router.push("/admin/add-employee")}
          >
            <Text style={styles.addButtonText}>+ Tambah Karyawan</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: "#f8fafc", padding: 16},
  containerWeb: {flexDirection: "row", minHeight: "100vh" as any, padding: 0},
  sidebar: {
    width: 250,
    backgroundColor: "#1e293b",
    padding: 24,
    minHeight: "100vh" as any,
  },
  sidebarTitle: {
    color: "#f1f5f9",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 24,
  },
  sidebarItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  sidebarItemText: {color: "#f1f5f9", fontSize: 15},
  sidebarSpacer: {flex: 1},
  sidebarLogout: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#374151",
  },
  sidebarLogoutText: {color: "#fca5a5", fontSize: 15},
  main: {flex: 1, padding: 16},
  mainDesktop: {padding: 32},
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {fontSize: 24, fontWeight: "bold", color: "#1e293b"},
  titleDesktop: {fontSize: 32},
  welcome: {fontSize: 16, color: "#64748b", marginTop: 4},
  logoutBtn: {padding: 8},
  logoutText: {color: theme.colors.status.error, fontWeight: "600"},
  heroPanel: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
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
    minWidth: 108,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  heroStatLabel: {color: "#94a3b8", fontSize: 12, marginBottom: 4},
  heroStatValue: {color: "#fff", fontSize: 18, fontWeight: "800"},
  cacheNote: {
    color: "#64748b",
    fontSize: 12,
    marginBottom: 12,
    fontStyle: "italic",
  },
  menu: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  menuTablet: {gap: 16 as any},
  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "48%",
    marginBottom: 12,
    elevation: 2,
    alignItems: "center",
  },
  menuCardTablet: {width: "calc(25% - 12px)" as any},
  menuIcon: {fontSize: 32, marginBottom: 8},
  menuTitle: {fontSize: 16, fontWeight: "600", color: "#1e293b"},
  menuSubtitle: {fontSize: 13, color: "#64748b", marginTop: 4},
  statsGrid: {flexDirection: "row", gap: 20 as any, marginBottom: 24},
  statCard: {flex: 1, alignItems: "flex-start"},
  statValue: {fontSize: 36, fontWeight: "bold", color: theme.colors.primary},
  statLabel: {fontSize: 14, color: "#64748b", marginTop: 4},
  quickStatsRow: {flexDirection: "row", gap: 12 as any, marginBottom: 16},
  quickStatCard: {flex: 1, alignItems: "center"},
  quickStatLabel: {
    fontSize: 12,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  quickStatValue: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.text.primary,
    marginTop: 4,
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
  },
  addButtonDesktop: {alignSelf: "flex-start", paddingHorizontal: 32},
  addButtonText: {color: "#fff", fontSize: 16, fontWeight: "600"},
});
