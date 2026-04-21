import {useEffect, useMemo, useState} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
  Modal,
} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {useRouter} from "expo-router";
import {useAuth} from "../../src/contexts/AuthContext";
import {
  getSuperAdminTenants,
  getSuperAdminTenantDetails,
  updateTenant,
  deleteTenant,
  resetTenantAdminPassword,
  deactivateTenant,
  activateTenant,
} from "../../src/services/api";
import {Input} from "../../src/components/ui/Input";
import {Button} from "../../src/components/ui/Button";
import {useResponsive} from "../../src/hooks/useResponsive";
import {ScreenHeader} from "../../src/components/ui/ScreenHeader";
import {theme} from "../../src/constants/theme";
import {Card} from "../../src/components/ui/Card";

interface Tenant {
  id: number;
  name: string;
  adminName: string;
  adminEmail: string;
  isActive: boolean;
  createdAt: string;
  adminIsActive?: boolean;
  userCount?: number;
  activeUserCount?: number;
  leaderCount?: number;
}

interface TenantEmployee {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  faceRegistered: boolean;
  salaryType: string;
  startWorkTime: string;
  endWorkTime: string;
  createdAt: string;
}

interface TenantDetail extends Tenant {
  companyConfig?: {
    companyName: string;
    maxBreakMinutesPerDay: number;
    lateThresholdMinutes: number;
    overtimeRateMultiplier: number;
    officeLatitude?: number | null;
    officeLongitude?: number | null;
    allowedRadiusMeters: number;
    updatedAt: string;
  } | null;
  employees?: TenantEmployee[];
  employeeCount?: number;
  roleCounts?: {admin: number; leader: number; user: number; active: number};
}

export default function SuperAdminDashboard() {
  const {user, logout} = useAuth();
  const router = useRouter();
  const {isDesktop, isTablet, isWeb} = useResponsive();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [detailTenant, setDetailTenant] = useState<TenantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [toggleLoadingId, setToggleLoadingId] = useState<number | null>(null);
  const activeTenants = tenants.filter(tenant => tenant.isActive).length;
  const inactiveTenants = tenants.length - activeTenants;

  const filteredEmployees = useMemo(() => {
    const employees = detailTenant?.employees || [];
    const query = employeeSearch.toLowerCase().trim();

    if (!query) {
      return employees;
    }

    return employees.filter(employee => {
      return (
        employee.name.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query) ||
        employee.role.toLowerCase().includes(query)
      );
    });
  }, [detailTenant?.employees, employeeSearch]);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const res = await getSuperAdminTenants();
      if (res.data && res.data.data) {
        setTenants(res.data.data);
      } else if (Array.isArray(res.data)) {
        setTenants(res.data);
      }
    } catch (error) {
      console.error("Error loading tenants:", error);
      Alert.alert("Error", "Gagal memuat data perusahaan");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingId(tenant.id);
    setEditName(tenant.name);
  };

  const openDetail = async (tenant: Tenant) => {
    setDetailTenant(tenant);
    setTemporaryPassword("");
    setEmployeeSearch("");
    setDetailVisible(true);
    setDetailLoading(true);

    try {
      const res = await getSuperAdminTenantDetails(tenant.id);
      const data = res.data?.data || res.data;
      setDetailTenant(data);
    } catch (error) {
      console.error("Error loading tenant detail:", error);
      Alert.alert("Error", "Gagal memuat detail perusahaan");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleToggleTenantStatus = async (tenant: Tenant) => {
    const nextAction = tenant.isActive ? "menonaktifkan" : "mengaktifkan";

    if (
      Platform.OS === "web" &&
      !window.confirm(`Yakin ${nextAction} perusahaan ini?`)
    ) {
      return;
    }

    setToggleLoadingId(tenant.id);
    try {
      if (tenant.isActive) {
        await deactivateTenant(tenant.id);
      } else {
        await activateTenant(tenant.id);
      }
      await loadTenants();
      if (detailTenant?.id === tenant.id) {
        await openDetail(tenant);
      }
    } catch (error: any) {
      const msg =
        error.response?.data?.message || `Gagal ${nextAction} perusahaan`;
      Alert.alert("Error", msg);
    } finally {
      setToggleLoadingId(null);
    }
  };

  const handleResetPassword = async () => {
    if (!detailTenant) return;

    if (
      Platform.OS === "web" &&
      !window.confirm(
        "Reset password admin perusahaan ini? Password baru akan ditampilkan sekali.",
      )
    ) {
      return;
    }

    setResetLoading(true);
    try {
      const res = await resetTenantAdminPassword(detailTenant.id);
      const password =
        res.data?.data?.temporaryPassword || res.data?.temporaryPassword || "";
      setTemporaryPassword(password);
      Alert.alert("Berhasil", "Password admin berhasil direset");
    } catch (error: any) {
      const msg = error.response?.data?.message || "Gagal reset password admin";
      Alert.alert("Error", msg);
    } finally {
      setResetLoading(false);
    }
  };

  const saveEdit = async (id: number) => {
    try {
      if (!editName) return;
      await updateTenant(id, {name: editName});
      setEditingId(null);
      loadTenants();
    } catch (error: any) {
      const msg = error.response?.data?.message || "Gagal mengedit";
      Alert.alert("Error", msg);
    }
  };

  const executeDelete = async (id: number) => {
    try {
      await deleteTenant(id);
      loadTenants();
    } catch (error) {
      Alert.alert("Error", "Gagal menghapus perusahaan");
    }
  };

  const confirmDelete = (id: number) => {
    if (Platform.OS === "web") {
      if (
        window.confirm(
          "Hapus perusahaan ini secara permanen beserta seluruh datanya?",
        )
      ) {
        executeDelete(id);
      }
    } else {
      Alert.alert("Konfirmasi", "Hapus perusahaan ini?", [
        {text: "Batal", style: "cancel"},
        {text: "Hapus", style: "destructive", onPress: () => executeDelete(id)},
      ]);
    }
  };

  return (
    <View style={[styles.container, isWeb && styles.containerWeb]}>
      {/* Sidebar for Desktop */}
      {isDesktop && (
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Super Admin</Text>
          <TouchableOpacity style={styles.sidebarItem}>
            <Text style={styles.sidebarItemText}>🏢 Perusahaan</Text>
          </TouchableOpacity>
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
              Dashboard Super Admin
            </Text>
            <Text style={styles.welcome}>Halo, {user?.name}!</Text>
          </View>
          {!isDesktop && (
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionsBar}>
          <View>
            <Text style={styles.subtitle}>Daftar Perusahaan Terdaftar</Text>
            <Text style={styles.actionsNote}>
              Kelola perusahaan, admin, dan status aktif dari satu layar.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/super-admin/add-tenant")}
          >
            <Text style={styles.addButtonText}>+ Tambah Perusahaan</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroPanel}>
          <View style={styles.heroTextBlock}>
            <View style={styles.heroBadge}>
              <Ionicons name="business-outline" size={14} color="#fff" />
              <Text style={styles.heroBadgeText}>Super Admin Web Console</Text>
            </View>
            <Text style={styles.heroTitle}>
              Pantau semua tenant dari browser, tanpa pindah aplikasi.
            </Text>
            <Text style={styles.heroSubtitle}>
              Tambah perusahaan baru, cek status aktif, dan edit data perusahaan
              langsung dari dashboard web.
            </Text>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Total</Text>
              <Text style={styles.heroStatValue}>{tenants.length}</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Aktif</Text>
              <Text style={styles.heroStatValue}>{activeTenants}</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Non-aktif</Text>
              <Text style={styles.heroStatValue}>{inactiveTenants}</Text>
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View
            style={[
              styles.grid,
              isDesktop && styles.gridDesktop,
              isTablet && styles.gridTablet,
            ]}
          >
            {tenants.map(item => (
              <Card
                key={item.id}
                style={[
                  styles.card,
                  isDesktop && styles.cardDesktop,
                  isTablet && styles.cardTablet,
                ]}
              >
                <View style={styles.cardHeader}>
                  {editingId === item.id ? (
                    <View
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <Input
                        value={editName}
                        onChangeText={setEditName}
                        style={{flex: 1, marginBottom: 0}}
                        placeholder="Nama Baru"
                      />
                      <TouchableOpacity
                        onPress={() => saveEdit(item.id)}
                        style={[styles.badge, styles.badgeSuccess]}
                      >
                        <Text style={styles.textSuccess}>Simpan</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setEditingId(null)}
                        style={[styles.badge]}
                      >
                        <Text style={{color: "#64748b"}}>Batal</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.companyName}>{item.name}</Text>
                      <View
                        style={[
                          styles.badge,
                          item.isActive
                            ? styles.badgeSuccess
                            : styles.badgeError,
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            item.isActive
                              ? styles.textSuccess
                              : styles.textError,
                          ]}
                        >
                          {item.isActive ? "Aktif" : "Non-Aktif"}
                        </Text>
                      </View>
                    </>
                  )}
                </View>

                <View style={styles.cardInfo}>
                  <Text style={styles.infoLabel}>Admin:</Text>
                  <Text style={styles.infoValue}>{item.adminName}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>{item.adminEmail}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.infoLabel}>Karyawan:</Text>
                  <Text style={styles.infoValue}>
                    {item.userCount ?? 0} orang
                  </Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.infoLabel}>Terdaftar:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>

                <View style={styles.cardInfo}>
                  <Text style={styles.infoLabel}>Status:</Text>
                  <Text style={styles.infoValue}>
                    {item.isActive ? "Aktif" : "Non-aktif"}
                  </Text>
                </View>

                {editingId !== item.id && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      onPress={() => openDetail(item)}
                      style={styles.editBtn}
                    >
                      <Text style={styles.editBtnText}>Detail</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleEdit(item)}
                      style={styles.editBtn}
                    >
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleToggleTenantStatus(item)}
                      style={
                        item.isActive ? styles.warnBtn : styles.activateBtn
                      }
                      disabled={toggleLoadingId === item.id}
                    >
                      <Text
                        style={
                          item.isActive
                            ? styles.warnBtnText
                            : styles.activateBtnText
                        }
                      >
                        {toggleLoadingId === item.id
                          ? "..."
                          : item.isActive
                            ? "Nonaktifkan"
                            : "Aktifkan"}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => confirmDelete(item.id)}
                      style={styles.deleteBtn}
                    >
                      <Text style={styles.deleteBtnText}>Hapus</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Card>
            ))}

            {tenants.length === 0 && !loading && (
              <Text style={styles.emptyText}>
                Belum ada perusahaan yang terdaftar.
              </Text>
            )}

            {loading && <Text style={styles.emptyText}>Memuat data...</Text>}
          </View>
        </ScrollView>
      </View>

      <Modal visible={detailVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{flex: 1}}>
                <Text style={styles.modalTitle}>
                  {detailTenant?.name || "Detail Perusahaan"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Detail akun admin dan karyawan di dalam tenant ini.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDetailVisible(false)}>
                <Text style={styles.modalClose}>Tutup</Text>
              </TouchableOpacity>
            </View>

            {detailLoading ? (
              <Text style={styles.emptyText}>Memuat detail...</Text>
            ) : detailTenant ? (
              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
              >
                <View style={styles.detailGrid}>
                  <Card style={styles.detailStatCard}>
                    <Text style={styles.detailStatLabel}>Admin</Text>
                    <Text style={styles.detailStatValue}>
                      {detailTenant.adminName}
                    </Text>
                    <Text style={styles.detailStatMeta}>
                      {detailTenant.adminEmail}
                    </Text>
                  </Card>
                  <Card style={styles.detailStatCard}>
                    <Text style={styles.detailStatLabel}>Karyawan</Text>
                    <Text style={styles.detailStatValue}>
                      {detailTenant.employeeCount ??
                        detailTenant.userCount ??
                        0}
                    </Text>
                    <Text style={styles.detailStatMeta}>
                      Total akun di tenant
                    </Text>
                  </Card>
                  <Card style={styles.detailStatCard}>
                    <Text style={styles.detailStatLabel}>Aktif</Text>
                    <Text style={styles.detailStatValue}>
                      {detailTenant.activeUserCount ??
                        detailTenant.roleCounts?.active ??
                        0}
                    </Text>
                    <Text style={styles.detailStatMeta}>Akun yang aktif</Text>
                  </Card>
                  <Card style={styles.detailStatCard}>
                    <Text style={styles.detailStatLabel}>Leader</Text>
                    <Text style={styles.detailStatValue}>
                      {detailTenant.leaderCount ??
                        detailTenant.roleCounts?.leader ??
                        0}
                    </Text>
                    <Text style={styles.detailStatMeta}>Peran leadership</Text>
                  </Card>
                </View>

                <Card style={styles.detailSection}>
                  <Text style={styles.sectionLabel}>Akun Admin</Text>
                  <Text style={styles.detailLine}>
                    Nama: {detailTenant.adminName}
                  </Text>
                  <Text style={styles.detailLine}>
                    Email: {detailTenant.adminEmail}
                  </Text>
                  <Text style={styles.detailLine}>
                    Status: {detailTenant.adminIsActive ? "Aktif" : "Non-aktif"}
                  </Text>
                  <Text style={styles.passwordNote}>
                    Password tidak ditampilkan demi keamanan. Gunakan reset
                    password untuk membuat akses baru.
                  </Text>

                  <Button
                    title="Reset Password Admin"
                    onPress={handleResetPassword}
                    loading={resetLoading}
                    style={styles.resetBtn}
                  />

                  {temporaryPassword ? (
                    <View style={styles.passwordBox}>
                      <Text style={styles.passwordBoxLabel}>Password baru</Text>
                      <Text style={styles.passwordBoxValue}>
                        {temporaryPassword}
                      </Text>
                      <Text style={styles.passwordBoxHint}>
                        Tampilkan sekali lalu berikan ke admin perusahaan.
                      </Text>
                    </View>
                  ) : null}

                  <Button
                    title={
                      detailTenant.isActive
                        ? "Nonaktifkan Perusahaan"
                        : "Aktifkan Perusahaan"
                    }
                    variant={detailTenant.isActive ? "outline" : "primary"}
                    onPress={() => handleToggleTenantStatus(detailTenant)}
                    loading={toggleLoadingId === detailTenant.id}
                    style={styles.toggleBtn}
                  />
                </Card>

                <Card style={styles.detailSection}>
                  <Text style={styles.sectionLabel}>Data Karyawan</Text>
                  <Input
                    label="Cari karyawan"
                    placeholder="Nama, email, atau role"
                    value={employeeSearch}
                    onChangeText={setEmployeeSearch}
                  />
                  <Text style={styles.detailStatMeta}>
                    Menampilkan {filteredEmployees.length} dari{" "}
                    {detailTenant.employees?.length || 0} karyawan.
                  </Text>
                  {filteredEmployees.length > 0 ? (
                    filteredEmployees.map(employee => (
                      <View key={employee.id} style={styles.employeeRow}>
                        <View style={{flex: 1}}>
                          <Text style={styles.employeeName}>
                            {employee.name}
                          </Text>
                          <Text style={styles.employeeMeta}>
                            {employee.email}
                          </Text>
                          <Text style={styles.employeeMeta}>
                            Role: {employee.role} •{" "}
                            {employee.isActive ? "Aktif" : "Non-aktif"}
                          </Text>
                        </View>
                        <View style={styles.employeeBadges}>
                          <View
                            style={[
                              styles.employeeBadge,
                              employee.faceRegistered
                                ? styles.badgeSuccess
                                : styles.badgeError,
                            ]}
                          >
                            <Text
                              style={[
                                styles.employeeBadgeText,
                                employee.faceRegistered
                                  ? styles.textSuccess
                                  : styles.textError,
                              ]}
                            >
                              {employee.faceRegistered
                                ? "Face OK"
                                : "Belum Face"}
                            </Text>
                          </View>
                          <View style={styles.employeeBadge}>
                            <Text style={styles.employeeBadgeText}>
                              {employee.startWorkTime} - {employee.endWorkTime}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptyText}>
                      Tidak ada karyawan yang cocok dengan pencarian ini.
                    </Text>
                  )}
                </Card>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: theme.colors.background},
  containerWeb: {flexDirection: "row", minHeight: "100vh" as any}, // Removed padding: 0 to check
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
    backgroundColor: "#334155",
  },
  sidebarItemText: {color: "#f1f5f9", fontSize: 15, fontWeight: "500"},
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
  title: {...theme.typography.h2, color: theme.colors.text.primary},
  titleDesktop: {...theme.typography.h1},
  welcome: {fontSize: 16, color: theme.colors.text.secondary, marginTop: 4},
  logoutBtn: {padding: 8},
  logoutText: {color: theme.colors.status.error, fontWeight: "600"},
  actionsBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 10,
  },
  subtitle: {...theme.typography.h3, color: theme.colors.text.primary},
  actionsNote: {fontSize: 13, color: theme.colors.text.secondary, marginTop: 4},
  heroPanel: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
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
    minWidth: 280,
  },
  heroStatCard: {
    minWidth: 90,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  heroStatLabel: {color: "#94a3b8", fontSize: 12, marginBottom: 4},
  heroStatValue: {color: "#fff", fontSize: 18, fontWeight: "800"},
  scrollContent: {paddingBottom: 32},
  grid: {flexDirection: "column", gap: 16},
  gridTablet: {flexDirection: "row", flexWrap: "wrap"},
  gridDesktop: {flexDirection: "row", flexWrap: "wrap", gap: 20},
  card: {width: "100%", marginBottom: 0},
  cardTablet: {width: "48%"}, // calc helper not strictly needed with simple percentage in RN web sometimes, but flex basis better.
  // Using simple percentage for simplicity in RN:
  cardDesktop: {width: "32%"},

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text.primary,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#e2e8f0",
  },
  badgeSuccess: {backgroundColor: "#dcfce7"},
  badgeError: {backgroundColor: "#fee2e2"},
  badgeText: {fontSize: 12, fontWeight: "600"},
  textSuccess: {color: "#166534"},
  textError: {color: "#991b1b"},

  cardInfo: {flexDirection: "row", marginBottom: 8},
  infoLabel: {width: 80, color: theme.colors.text.secondary, fontSize: 14},
  infoValue: {
    flex: 1,
    color: theme.colors.text.primary,
    fontSize: 14,
    fontWeight: "500",
  },

  emptyText: {
    textAlign: "center",
    color: theme.colors.text.secondary,
    marginTop: 40,
    width: "100%",
  },
  addButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  addButtonText: {color: "#fff", fontSize: 14, fontWeight: "600"},

  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 16,
  },
  editBtn: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  editBtnText: {color: theme.colors.primary, fontWeight: "500"},
  warnBtn: {
    flex: 1,
    backgroundColor: "#fff7ed",
    borderColor: "#fdba74",
    borderWidth: 1,
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  warnBtnText: {color: "#c2410c", fontWeight: "500"},
  activateBtn: {
    flex: 1,
    backgroundColor: "#ecfdf5",
    borderColor: "#86efac",
    borderWidth: 1,
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  activateBtnText: {color: "#166534", fontWeight: "500"},
  deleteBtn: {
    flex: 1,
    backgroundColor: "#fee2e2",
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  deleteBtnText: {color: theme.colors.status.error, fontWeight: "500"},
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    maxHeight: "92%" as any,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
  },
  modalSubtitle: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  modalClose: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
  modalScroll: {flex: 1},
  modalScrollContent: {paddingBottom: 12},
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  detailStatCard: {
    minWidth: 150,
    flexGrow: 1,
  },
  detailStatLabel: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  detailStatValue: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.text.primary,
  },
  detailStatMeta: {
    marginTop: 4,
    fontSize: 12,
    color: theme.colors.text.secondary,
  },
  detailSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    ...theme.typography.h3,
    marginBottom: 12,
    color: theme.colors.text.primary,
  },
  detailLine: {
    fontSize: 14,
    color: theme.colors.text.primary,
    marginBottom: 6,
  },
  passwordNote: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 4,
    marginBottom: 12,
  },
  resetBtn: {
    marginBottom: 12,
  },
  passwordBox: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  passwordBoxLabel: {
    fontSize: 12,
    color: "#1d4ed8",
    fontWeight: "700",
    marginBottom: 4,
  },
  passwordBoxValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e3a8a",
    letterSpacing: 0.6,
  },
  passwordBoxHint: {
    fontSize: 12,
    color: "#1d4ed8",
    marginTop: 4,
  },
  toggleBtn: {
    marginBottom: 12,
  },
  employeeRow: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 12,
    marginTop: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  employeeName: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text.primary,
  },
  employeeMeta: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  employeeBadges: {
    alignItems: "flex-end",
    gap: 8,
  },
  employeeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
  },
  employeeBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
