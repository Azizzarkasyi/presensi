import {useEffect, useMemo, useState} from "react";
import {View, Text, StyleSheet, FlatList} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {useRouter} from "expo-router";
import {
  getAttendanceCorrections,
  reviewAttendanceCorrection,
} from "../../src/services/api";
import {useResponsive} from "../../src/hooks/useResponsive";
import {readCachedJson, writeCachedJson} from "../../src/utils/webCache";
import {theme} from "../../src/constants/theme";
import {ScreenHeader} from "../../src/components/ui/ScreenHeader";
import {Card} from "../../src/components/ui/Card";
import {Badge} from "../../src/components/ui/Badge";
import {Button} from "../../src/components/ui/Button";
import {Input} from "../../src/components/ui/Input";
import {useGlobalModal} from "../../src/contexts/GlobalModalContext";

interface CorrectionItem {
  id: number;
  date: string;
  status: string;
  correctionStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED";
  correctionReason?: string | null;
  correctionRequestedClockIn?: string | null;
  correctionRequestedClockOut?: string | null;
  correctionReviewNote?: string | null;
  user: {id: number; name: string; email: string};
}

export default function AdminAttendanceCorrections() {
  const router = useRouter();
  const {isDesktop, isWeb} = useResponsive();
  const {showModal} = useGlobalModal();
  const [items, setItems] = useState<CorrectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING" | "APPROVED" | "REJECTED"
  >("PENDING");
  const [searchText, setSearchText] = useState("");
  const [reviewNoteMap, setReviewNoteMap] = useState<Record<number, string>>(
    {},
  );
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [usingCache, setUsingCache] = useState(false);

  const cacheKey = `admin-attendance-corrections-${statusFilter}`;

  useEffect(() => {
    loadItems();
  }, [statusFilter]);

  const loadItems = async () => {
    setLoading(true);
    setUsingCache(false);
    try {
      const res = await getAttendanceCorrections({status: statusFilter});
      const data = res.data.data || [];
      setItems(data);
      await writeCachedJson(cacheKey, data);
    } catch (error) {
      console.error("Error loading corrections:", error);
      const cachedItems = await readCachedJson<CorrectionItem[]>(cacheKey);
      if (cachedItems && cachedItems.length > 0) {
        setItems(cachedItems);
        setUsingCache(true);
        showModal({
          title: "Offline",
          message: "Menampilkan data koreksi terakhir yang tersimpan",
          buttonText: "Tutup",
        });
      } else {
        showModal({
          title: "Error",
          message: "Gagal memuat data koreksi absensi",
          isError: true,
          buttonText: "Tutup",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    const q = searchText.toLowerCase().trim();
    return items.filter(
      item =>
        item.user.name.toLowerCase().includes(q) ||
        item.user.email.toLowerCase().includes(q),
    );
  }, [items, searchText]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const formatTime = (dateStr?: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getVariant = (status: string) => {
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

  const handleReview = async (id: number, action: "APPROVED" | "REJECTED") => {
    setUpdatingId(id);
    try {
      await reviewAttendanceCorrection(id, {
        action,
        note: reviewNoteMap[id] || undefined,
      });
      setReviewNoteMap(prev => ({...prev, [id]: ""}));
      await loadItems();
      showModal({
        title: "Sukses",
        message: `Koreksi berhasil di-${action === "APPROVED" ? "setujui" : "tolak"}`,
        buttonText: "OK",
      });
    } catch (error: any) {
      showModal({
        title: "Gagal",
        message: error.response?.data?.message || "Gagal memproses koreksi",
        isError: true,
        buttonText: "Tutup",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Koreksi Absensi" onBack={() => router.back()} />

      {isWeb && isDesktop && (
        <View style={styles.heroPanel}>
          <View style={styles.heroTextBlock}>
            <View style={styles.heroBadge}>
              <Ionicons name="time-outline" size={14} color="#fff" />
              <Text style={styles.heroBadgeText}>Correction Review</Text>
            </View>
            <Text style={styles.heroTitle}>
              Review koreksi absensi langsung dari browser.
            </Text>
            <Text style={styles.heroSubtitle}>
              Filter pengajuan, cek jam yang diminta, dan tetap lihat data
              terakhir ketika koneksi sedang tidak stabil.
            </Text>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Total</Text>
              <Text style={styles.heroStatValue}>{items.length}</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Pending</Text>
              <Text style={styles.heroStatValue}>
                {
                  items.filter(item => item.correctionStatus === "PENDING")
                    .length
                }
              </Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Approved</Text>
              <Text style={styles.heroStatValue}>
                {
                  items.filter(item => item.correctionStatus === "APPROVED")
                    .length
                }
              </Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Rejected</Text>
              <Text style={styles.heroStatValue}>
                {
                  items.filter(item => item.correctionStatus === "REJECTED")
                    .length
                }
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.content}>
        <Card style={styles.filterCard}>
          <Text style={styles.sectionTitle}>Filter</Text>
          {usingCache ? (
            <Text style={styles.cacheNote}>
              Menampilkan cache data terakhir.
            </Text>
          ) : null}
          <Input
            label="Cari nama/email"
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Nama karyawan"
          />
          <View style={styles.filterRow}>
            {(["ALL", "PENDING", "APPROVED", "REJECTED"] as const).map(
              status => (
                <Button
                  key={status}
                  title={status === "ALL" ? "Semua" : status}
                  variant={statusFilter === status ? "primary" : "outline"}
                  size="sm"
                  onPress={() => setStatusFilter(status)}
                  style={styles.filterBtn}
                />
              ),
            )}
          </View>
          <Button
            title="Muat Ulang"
            variant="outline"
            onPress={loadItems}
            loading={loading}
          />
        </Card>

        <FlatList
          data={filteredItems}
          keyExtractor={item => item.id.toString()}
          refreshing={loading}
          onRefresh={loadItems}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({item}) => (
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{flex: 1}}>
                  <Text style={styles.name}>{item.user.name}</Text>
                  <Text style={styles.email}>{item.user.email}</Text>
                </View>
                <Badge
                  label={item.correctionStatus}
                  variant={getVariant(item.correctionStatus)}
                  size="sm"
                />
              </View>

              <Text style={styles.date}>{formatDate(item.date)}</Text>
              <Text style={styles.meta}>
                Jam saat ini: Masuk{" "}
                {formatTime(item.correctionRequestedClockIn)} | Pulang{" "}
                {formatTime(item.correctionRequestedClockOut)}
              </Text>
              <Text style={styles.reason}>
                Alasan: {item.correctionReason || "-"}
              </Text>

              {item.correctionReviewNote ? (
                <Text style={styles.reviewNote}>
                  Catatan admin: {item.correctionReviewNote}
                </Text>
              ) : null}

              {item.correctionStatus === "PENDING" && (
                <View>
                  <Input
                    label="Catatan review (opsional)"
                    value={reviewNoteMap[item.id] || ""}
                    onChangeText={value =>
                      setReviewNoteMap(prev => ({...prev, [item.id]: value}))
                    }
                    placeholder="Misal: data disetujui"
                  />
                  <View style={styles.actionRow}>
                    <Button
                      title="Tolak"
                      variant="outline"
                      onPress={() => handleReview(item.id, "REJECTED")}
                      loading={updatingId === item.id}
                      style={styles.actionBtn}
                    />
                    <Button
                      title="Setujui"
                      onPress={() => handleReview(item.id, "APPROVED")}
                      loading={updatingId === item.id}
                      style={styles.actionBtn}
                    />
                  </View>
                </View>
              )}
            </Card>
          )}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  Belum ada koreksi absensi yang cocok dengan filter.
                </Text>
              </View>
            ) : null
          }
        />
      </View>
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
  content: {flex: 1, padding: theme.spacing.lg},
  filterCard: {marginBottom: theme.spacing.lg},
  sectionTitle: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.md,
    color: theme.colors.text.primary,
  },
  cacheNote: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    marginBottom: 8,
    fontStyle: "italic",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8 as any,
    marginBottom: theme.spacing.md,
  },
  filterBtn: {minWidth: 92},
  listContent: {paddingBottom: theme.spacing.lg},
  card: {marginBottom: theme.spacing.md},
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  name: {
    ...theme.typography.h3,
    fontSize: 18,
    color: theme.colors.text.primary,
  },
  email: {fontSize: 12, color: theme.colors.text.secondary},
  date: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: "600",
    marginBottom: 4,
  },
  meta: {fontSize: 13, color: theme.colors.text.secondary, marginBottom: 4},
  reason: {fontSize: 13, color: theme.colors.text.primary, marginBottom: 8},
  reviewNote: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12 as any,
    marginTop: theme.spacing.sm,
  },
  actionBtn: {flex: 1},
  emptyState: {padding: theme.spacing.xl, alignItems: "center"},
  emptyText: {color: theme.colors.text.secondary},
});
