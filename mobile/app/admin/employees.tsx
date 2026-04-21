import {useEffect, useState} from "react";
import {View, FlatList, StyleSheet, Text, TouchableOpacity} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {useRouter} from "expo-router";
import {useAuth} from "../../src/contexts/AuthContext";
import {getUsers, deleteUser} from "../../src/services/api";
import {useResponsive} from "../../src/hooks/useResponsive";
import {readCachedJson, writeCachedJson} from "../../src/utils/webCache";

// UI Components
import {theme} from "../../src/constants/theme";
import {ScreenHeader} from "../../src/components/ui/ScreenHeader";
import {Card} from "../../src/components/ui/Card";
import {Button} from "../../src/components/ui/Button";
import {Badge} from "../../src/components/ui/Badge";
import {Input} from "../../src/components/ui/Input";
import {useGlobalModal} from "../../src/contexts/GlobalModalContext";

interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  salaryType: string;
  salary: number;
}

export default function AdminEmployees() {
  const {user} = useAuth();
  const router = useRouter();
  const {isDesktop, isWeb} = useResponsive();
  const {showModal} = useGlobalModal();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [usingCache, setUsingCache] = useState(false);

  const cacheKey = "admin-employees-cache";

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    setUsingCache(false);
    try {
      const res = await getUsers();
      const data = res.data.data || [];
      setEmployees(data);
      await writeCachedJson(cacheKey, data);
    } catch (error) {
      console.error("Error:", error);
      const cachedEmployees = await readCachedJson<Employee[]>(cacheKey);
      if (cachedEmployees && cachedEmployees.length > 0) {
        setEmployees(cachedEmployees);
        setUsingCache(true);
        showModal({
          title: "Offline",
          message: "Menampilkan data karyawan terakhir yang tersimpan",
          buttonText: "Tutup",
        });
      } else {
        showModal({
          title: "Error",
          message: "Gagal memuat data karyawan",
          isError: true,
          buttonText: "Tutup",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: number, name: string) => {
    showModal({
      title: "Hapus Karyawan",
      message: `Yakin ingin menghapus ${name}?`,
      buttonText: "Hapus",
      secondaryButtonText: "Batal",
      onPrimaryPress: async () => {
        try {
          await deleteUser(id);
          showModal({
            title: "Sukses",
            message: "Karyawan berhasil dihapus",
            buttonText: "OK",
          });
          loadEmployees();
        } catch (error: any) {
          showModal({
            title: "Gagal",
            message: error.response?.data?.message || "Terjadi kesalahan",
            isError: true,
            buttonText: "Tutup",
          });
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

  const filteredEmployees = employees.filter(item => {
    const q = searchText.toLowerCase().trim();
    const matchSearch =
      item.name.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q);
    const matchRole = roleFilter === "ALL" || item.role === roleFilter;
    return matchSearch && matchRole;
  });

  const roleCounts = employees.reduce(
    (acc, item) => {
      acc.total += 1;
      if (item.role === "ADMIN") acc.admin += 1;
      if (item.role === "LEADER") acc.leader += 1;
      if (item.role === "USER") acc.user += 1;
      return acc;
    },
    {total: 0, admin: 0, leader: 0, user: 0},
  );

  const renderItem = ({item}: {item: Employee}) => (
    <Card
      style={styles.card}
      onPress={() => router.push(`/admin/edit-employee?id=${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.empName}>{item.name}</Text>
          <Text style={styles.empEmail}>{item.email}</Text>
        </View>
        <Badge
          label={item.role}
          variant={item.role === "ADMIN" ? "info" : "default"}
          size="sm"
        />
      </View>

      <View style={styles.detailsRow}>
        <View>
          <Text style={styles.label}>Gaji</Text>
          <Text style={styles.value}>{formatCurrency(item.salary)}</Text>
        </View>
        <View>
          <Text style={styles.label}>Tipe</Text>
          <Text style={styles.value}>{item.salaryType}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Button
          title="Edit"
          variant="outline"
          onPress={() => router.push(`/admin/edit-employee?id=${item.id}`)}
          style={styles.actionBtn}
          textStyle={{fontSize: 12}}
        />
        <Button
          title="Hapus"
          variant="danger"
          onPress={() => handleDelete(item.id, item.name)}
          style={styles.actionBtn}
          textStyle={{fontSize: 12}}
        />
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Daftar Karyawan"
        rightElement={
          <Button
            title="+ Baru"
            onPress={() => router.push("/admin/add-employee")}
            variant="primary"
            style={{paddingHorizontal: 16, height: 40, minHeight: 40}}
            textStyle={{fontSize: 14}}
          />
        }
      />

      {isWeb && isDesktop && (
        <View style={styles.heroPanel}>
          <View style={styles.heroTextBlock}>
            <View style={styles.heroBadge}>
              <Ionicons name="people-outline" size={14} color="#fff" />
              <Text style={styles.heroBadgeText}>Employee Console</Text>
            </View>
            <Text style={styles.heroTitle}>
              Kelola karyawan langsung dari browser.
            </Text>
            <Text style={styles.heroSubtitle}>
              Pencarian, filter role, dan edit data tetap cepat, plus data
              terakhir tetap bisa dibuka saat offline.
            </Text>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Total</Text>
              <Text style={styles.heroStatValue}>{roleCounts.total}</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Admin</Text>
              <Text style={styles.heroStatValue}>{roleCounts.admin}</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Leader</Text>
              <Text style={styles.heroStatValue}>{roleCounts.leader}</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>User</Text>
              <Text style={styles.heroStatValue}>{roleCounts.user}</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.filterWrap}>
        <Card style={styles.filterCard}>
          {usingCache ? (
            <Text style={styles.cacheNote}>
              Menampilkan cache data terakhir.
            </Text>
          ) : null}
          <Input
            label="Cari Karyawan"
            placeholder="Nama atau email"
            value={searchText}
            onChangeText={setSearchText}
          />

          <Text style={styles.filterLabel}>Filter Role</Text>
          <View style={styles.filterRow}>
            {["ALL", "ADMIN", "LEADER", "USER"].map(role => (
              <Button
                key={role}
                title={role === "ALL" ? "Semua" : role}
                variant={roleFilter === role ? "primary" : "outline"}
                size="sm"
                onPress={() => setRoleFilter(role)}
                style={styles.filterBtn}
              />
            ))}
          </View>

          <View style={styles.summaryRow}>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{roleCounts.total}</Text>
              <Text style={styles.summaryLabel}>Total</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{roleCounts.admin}</Text>
              <Text style={styles.summaryLabel}>Admin</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{roleCounts.leader}</Text>
              <Text style={styles.summaryLabel}>Leader</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{roleCounts.user}</Text>
              <Text style={styles.summaryLabel}>User</Text>
            </Card>
          </View>
        </Card>
      </View>

      <FlatList
        data={filteredEmployees}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={loadEmployees}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Belum ada karyawan</Text>
            </View>
          ) : null
        }
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
    minWidth: 88,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  heroStatLabel: {color: "#94a3b8", fontSize: 12, marginBottom: 4},
  heroStatValue: {color: "#fff", fontSize: 18, fontWeight: "800"},
  listContent: {
    padding: theme.spacing.lg,
  },
  filterWrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  filterCard: {
    marginBottom: theme.spacing.lg,
  },
  cacheNote: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    marginBottom: 8,
    fontStyle: "italic",
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text.secondary,
    marginTop: 4,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8 as any,
    marginBottom: theme.spacing.md,
  },
  filterBtn: {
    minWidth: 84,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12 as any,
  },
  summaryCard: {
    flexGrow: 1,
    minWidth: 92,
    alignItems: "center",
    paddingVertical: theme.spacing.md,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.background,
    paddingBottom: theme.spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  empName: {
    ...theme.typography.h3,
    fontSize: 18,
    color: theme.colors.text.primary,
  },
  empEmail: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  detailsRow: {
    flexDirection: "row",
    gap: 24,
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 12,
    color: theme.colors.text.light,
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text.primary,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  actionBtn: {
    height: 32,
    minHeight: 32,
    paddingVertical: 0,
    paddingHorizontal: 16,
  },
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    color: theme.colors.text.secondary,
  },
});
