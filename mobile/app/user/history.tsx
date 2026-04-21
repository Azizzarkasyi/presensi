import {useEffect, useState} from "react";
import {View, FlatList, StyleSheet, Text} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {useRouter} from "expo-router";
import {getAttendanceHistory} from "../../src/services/api";
import {useResponsive} from "../../src/hooks/useResponsive";
import {readCachedJson, writeCachedJson} from "../../src/utils/webCache";

// Modern UI Components
import {theme} from "../../src/constants/theme";
import {ScreenHeader} from "../../src/components/ui/ScreenHeader";
import {Card} from "../../src/components/ui/Card";
import {Badge} from "../../src/components/ui/Badge";

interface Attendance {
  id: number;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: string;
  leaveApprovalStatus?: "PENDING" | "APPROVED" | "REJECTED";
  leaveReviewNote?: string | null;
  correctionStatus?: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  correctionReason?: string | null;
  correctionReviewNote?: string | null;
}

export default function AttendanceHistory() {
  const router = useRouter();
  const {isDesktop, isWeb} = useResponsive();
  const [history, setHistory] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingCache, setUsingCache] = useState(false);

  const cacheKey = "user-attendance-history-cache";

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setUsingCache(false);
    try {
      const res = await getAttendanceHistory();
      const data = res.data.data || [];
      setHistory(data);
      await writeCachedJson(cacheKey, data);
    } catch (error) {
      console.error("Error loading history:", error);
      const cachedHistory = await readCachedJson<Attendance[]>(cacheKey);
      if (cachedHistory && cachedHistory.length > 0) {
        setHistory(cachedHistory);
        setUsingCache(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "--:--";
    return new Date(dateStr).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTimeValue = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
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

  const getApprovalVariant = (status?: string) => {
    switch (status) {
      case "APPROVED":
        return "success";
      case "REJECTED":
        return "error";
      case "PENDING":
      default:
        return "warning";
    }
  };

  const getCorrectionVariant = (status?: string) => {
    switch (status) {
      case "APPROVED":
        return "success";
      case "REJECTED":
        return "error";
      case "PENDING":
        return "warning";
      default:
        return "default";
    }
  };

  const renderItem = ({item}: {item: Attendance}) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{formatDate(item.date)}</Text>
        <Badge
          label={item.status}
          variant={getStatusVariant(item.status)}
          size="sm"
        />
      </View>

      {(item.status === "SICK" || item.status === "LEAVE") && (
        <View style={styles.approvalRow}>
          <Badge
            label={item.leaveApprovalStatus || "PENDING"}
            variant={getApprovalVariant(item.leaveApprovalStatus)}
            size="sm"
          />
          {item.leaveReviewNote ? (
            <Text style={styles.reviewNote}>
              Catatan admin: {item.leaveReviewNote}
            </Text>
          ) : null}
        </View>
      )}

      {(item.status === "PRESENT" || item.status === "LATE") &&
        item.correctionStatus &&
        item.correctionStatus !== "NONE" && (
          <View style={styles.approvalRow}>
            <Badge
              label={`Koreksi ${item.correctionStatus}`}
              variant={getCorrectionVariant(item.correctionStatus)}
              size="sm"
            />
            {item.correctionReason ? (
              <Text style={styles.reviewNote}>
                Alasan: {item.correctionReason}
              </Text>
            ) : null}
          </View>
        )}

      <View style={styles.timeRow}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Masuk</Text>
          <Text style={styles.timeValue}>{formatTime(item.clockIn)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>Pulang</Text>
          <Text style={styles.timeValue}>{formatTime(item.clockOut)}</Text>
        </View>
      </View>

      {(item.status === "PRESENT" || item.status === "LATE") &&
        item.correctionStatus !== "PENDING" && (
          <View style={{marginTop: theme.spacing.md}}>
            <Text
              style={styles.correctionLink}
              onPress={() =>
                router.push(
                  `/user/attendance-correction?id=${item.id}&date=${encodeURIComponent(item.date)}&clockIn=${encodeURIComponent(formatTimeValue(item.clockIn))}&clockOut=${encodeURIComponent(formatTimeValue(item.clockOut))}`,
                )
              }
            >
              Ajukan Koreksi Absensi
            </Text>
          </View>
        )}
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Riwayat Absensi" />

      <FlatList
        data={history}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={loadHistory}
        ListHeaderComponent={
          <View>
            {isWeb && isDesktop && (
              <View style={styles.heroPanel}>
                <View style={styles.heroTextBlock}>
                  <View style={styles.heroBadge}>
                    <Ionicons name="time-outline" size={14} color="#fff" />
                    <Text style={styles.heroBadgeText}>Attendance History</Text>
                  </View>
                  <Text style={styles.heroTitle}>
                    Riwayat absensi yang mudah dibaca di browser.
                  </Text>
                  <Text style={styles.heroSubtitle}>
                    Lihat status, approval izin, dan koreksi absensi dalam satu
                    tampilan yang rapi.
                  </Text>
                </View>
              </View>
            )}

            {usingCache ? (
              <Text style={styles.cacheNote}>
                Menampilkan cache riwayat terakhir.
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Belum ada riwayat absensi</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: theme.colors.background},
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
    minWidth: 160,
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
  cacheNote: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    marginTop: 8,
    fontStyle: "italic",
  },
  listContent: {padding: theme.spacing.lg, paddingBottom: theme.spacing.xl},
  card: {marginBottom: theme.spacing.md},
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  date: {
    ...theme.typography.h3,
    fontSize: 18,
    color: theme.colors.text.primary,
  },
  approvalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8 as any,
    marginBottom: theme.spacing.sm,
  },
  reviewNote: {flex: 1, fontSize: 12, color: theme.colors.text.secondary},
  correctionLink: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  timeRow: {
    flexDirection: "row",
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
  },
  timeBlock: {flex: 1, alignItems: "center"},
  timeLabel: {
    fontSize: 11,
    color: theme.colors.text.light,
    marginBottom: 2,
    textTransform: "uppercase",
  },
  timeValue: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text.primary,
  },
  divider: {width: 1, backgroundColor: theme.colors.border},
  emptyState: {padding: theme.spacing.xl, alignItems: "center"},
  emptyText: {color: theme.colors.text.secondary},
});
