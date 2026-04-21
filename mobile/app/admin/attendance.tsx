import {useEffect, useMemo, useState} from "react";
import {View, FlatList, StyleSheet, Text} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {useRouter} from "expo-router";
import {getAttendanceReport} from "../../src/services/api";

// UI Components
import {theme} from "../../src/constants/theme";
import {ScreenHeader} from "../../src/components/ui/ScreenHeader";
import {Card} from "../../src/components/ui/Card";
import {Badge} from "../../src/components/ui/Badge";
import {Input} from "../../src/components/ui/Input";
import {Button} from "../../src/components/ui/Button";
import {useGlobalModal} from "../../src/contexts/GlobalModalContext";

interface AttendanceRecord {
  id: number;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: string;
  user: {name: string; email: string};
}

export default function AdminAttendance() {
  const router = useRouter();
  const {showModal} = useGlobalModal();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const params: {startDate?: string; endDate?: string} = {};
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const res = await getAttendanceReport(params);
      setRecords(res.data.data || []);
    } catch (error) {
      console.error("Error:", error);
      showModal({
        title: "Error",
        message: "Gagal memuat data absensi",
        isError: true,
        buttonText: "Tutup",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(item => {
      const matchName =
        item.user?.name
          ?.toLowerCase()
          .includes(searchText.toLowerCase().trim()) ?? false;
      const matchStatus =
        filterStatus === "ALL" || item.status === filterStatus;
      return matchName && matchStatus;
    });
  }, [records, searchText, filterStatus]);

  const summary = useMemo(() => {
    const totals = {
      total: filteredRecords.length,
      present: 0,
      late: 0,
      alpha: 0,
    };

    for (const record of filteredRecords) {
      if (record.status === "PRESENT") totals.present += 1;
      if (record.status === "LATE") totals.late += 1;
      if (record.status === "ALPHA") totals.alpha += 1;
    }

    return totals;
  }, [filteredRecords]);

  const heroHint =
    startDate && endDate
      ? `${startDate} sampai ${endDate}`
      : "Gunakan filter tanggal untuk mempersempit data.";

  const applyFilters = async () => {
    await loadRecords();
  };

  const resetFilters = async () => {
    setSearchText("");
    setStartDate("");
    setEndDate("");
    setFilterStatus("ALL");
    setLoading(true);
    try {
      const res = await getAttendanceReport();
      setRecords(res.data.data || []);
    } catch (error) {
      console.error("Error:", error);
      showModal({
        title: "Error",
        message: "Gagal memuat data absensi",
        isError: true,
        buttonText: "Tutup",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "PRESENT":
        return "success";
      case "LATE":
        return "warning";
      case "SICK":
        return "info";
      case "LEAVE":
        return "default";
      case "ALPHA":
        return "error";
      default:
        return "default";
    }
  };

  const renderItem = ({item}: {item: AttendanceRecord}) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.userName}>{item.user?.name || "Unknown"}</Text>
          <Text style={styles.date}>
            {new Date(item.date).toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
        </View>
        <Badge
          label={item.status}
          variant={getStatusVariant(item.status)}
          size="sm"
        />
      </View>

      <View style={styles.timesContainer}>
        <View style={styles.timeBox}>
          <Text style={styles.timeLabel}>Masuk</Text>
          <Text style={styles.timeValue}>{formatTime(item.clockIn)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.timeBox}>
          <Text style={styles.timeLabel}>Pulang</Text>
          <Text style={styles.timeValue}>{formatTime(item.clockOut)}</Text>
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Rekap Absensi" />

      <View style={styles.heroPanel}>
        <View style={styles.heroTextBlock}>
          <View style={styles.heroBadge}>
            <Ionicons name="calendar-outline" size={14} color="#fff" />
            <Text style={styles.heroBadgeText}>Attendance Console</Text>
          </View>
          <Text style={styles.heroTitle}>
            Rekap absensi harian yang cepat dibaca dari browser.
          </Text>
          <Text style={styles.heroSubtitle}>{heroHint}</Text>
        </View>

        <View style={styles.heroStats}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Total</Text>
            <Text style={styles.heroStatValue}>{summary.total}</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Hadir</Text>
            <Text style={styles.heroStatValue}>{summary.present}</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Terlambat</Text>
            <Text style={styles.heroStatValue}>{summary.late}</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatLabel}>Alpa</Text>
            <Text style={styles.heroStatValue}>{summary.alpha}</Text>
          </View>
        </View>
      </View>

      <View style={styles.filterWrap}>
        <Card style={styles.filterCard}>
          <Text style={styles.sectionTitle}>Filter Rekap</Text>
          <Input
            label="Cari Nama Karyawan"
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Ketik nama"
            hint="Pencarian berlaku di data yang sudah dimuat"
          />
          <View style={styles.row}>
            <View style={styles.flex1}>
              <Input
                label="Tanggal Mulai"
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                hint="Contoh: 2026-04-01"
              />
            </View>
            <View style={styles.gap} />
            <View style={styles.flex1}>
              <Input
                label="Tanggal Akhir"
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                hint="Contoh: 2026-04-30"
              />
            </View>
          </View>

          <Text style={styles.statusLabel}>Status</Text>
          <View style={styles.statusRow}>
            {["ALL", "PRESENT", "LATE", "ALPHA", "SICK", "LEAVE"].map(
              status => (
                <Button
                  key={status}
                  title={status === "ALL" ? "Semua" : status}
                  variant={filterStatus === status ? "primary" : "outline"}
                  size="sm"
                  onPress={() => setFilterStatus(status)}
                  style={styles.statusBtn}
                />
              ),
            )}
          </View>

          <View style={styles.actionRow}>
            <Button
              title="Terapkan"
              onPress={applyFilters}
              loading={loading}
              style={styles.actionBtn}
            />
            <Button
              title="Reset"
              variant="outline"
              onPress={resetFilters}
              style={styles.actionBtn}
            />
          </View>
        </Card>

        <View style={styles.summaryGrid}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.total}</Text>
            <Text style={styles.summaryLabel}>Total Data</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.present}</Text>
            <Text style={styles.summaryLabel}>Hadir</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.late}</Text>
            <Text style={styles.summaryLabel}>Terlambat</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.alpha}</Text>
            <Text style={styles.summaryLabel}>Alpa</Text>
          </Card>
        </View>
      </View>

      <FlatList
        data={filteredRecords}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={loadRecords}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Belum ada data absensi</Text>
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
  filterWrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  filterCard: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.md,
    color: theme.colors.text.primary,
  },
  row: {
    flexDirection: "row",
  },
  flex1: {
    flex: 1,
  },
  gap: {
    width: 12,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8 as any,
    marginBottom: theme.spacing.md,
  },
  statusBtn: {
    minWidth: 92,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12 as any,
  },
  actionBtn: {
    flex: 1,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12 as any,
    marginBottom: theme.spacing.md,
  },
  summaryCard: {
    flexGrow: 1,
    minWidth: 150,
    alignItems: "center",
    paddingVertical: theme.spacing.lg,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  summaryLabel: {
    marginTop: 4,
    color: theme.colors.text.secondary,
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
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
  userName: {
    ...theme.typography.h3,
    fontSize: 18,
    color: theme.colors.text.primary,
  },
  date: {
    fontSize: 13,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  timesContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
  },
  timeBox: {
    flex: 1,
    alignItems: "center",
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.border,
  },
  timeLabel: {
    fontSize: 11,
    color: theme.colors.text.light,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text.primary,
  },
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    color: theme.colors.text.secondary,
  },
});
