import {useEffect, useMemo, useState} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {useRouter} from "expo-router";
import api, {
  getLeaveRequests,
  reviewLeaveRequest,
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

interface LeaveItem {
  id: number;
  date: string;
  status: "SICK" | "LEAVE";
  leaveApprovalStatus: "PENDING" | "APPROVED" | "REJECTED";
  leaveReviewNote?: string | null;
  leaveReviewedAt?: string | null;
  leaveDescription?: string | null;
  clockInPhoto?: string | null;
  clockOutPhoto?: string | null;
  user: {id: number; name: string; email: string};
}

const getImageUri = (path?: string | null) => {
  if (!path) {
    return null;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const baseUrl = api.defaults.baseURL?.replace(/\/api\/?$/, "");
  // Encode URI to handle spaces or special characters in filename
  const normalizedPath = path.startsWith("/") ? path : `/uploads/${path}`;

  if (!baseUrl) {
    return encodeURI(normalizedPath);
  }

  return encodeURI(`${baseUrl}${normalizedPath}`);
};

export default function AdminLeaveRequests() {
  const router = useRouter();
  const {isDesktop, isWeb} = useResponsive();
  const {showModal} = useGlobalModal();
  const [requests, setRequests] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING" | "APPROVED" | "REJECTED"
  >("PENDING");
  const [searchText, setSearchText] = useState("");
  const [noteMap, setNoteMap] = useState<Record<number, string>>({});
  const [usingCache, setUsingCache] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LeaveItem | null>(null);

  const cacheKey = `admin-leave-requests-${statusFilter}`;

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const loadRequests = async () => {
    setLoading(true);
    setUsingCache(false);
    try {
      const res = await getLeaveRequests({
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });
      const data = res.data.data || [];
      setRequests(data);
      await writeCachedJson(cacheKey, data);
    } catch (error) {
      console.error("Error loading leave requests:", error);
      const cachedRequests = await readCachedJson<LeaveItem[]>(cacheKey);
      if (cachedRequests && cachedRequests.length > 0) {
        setRequests(cachedRequests);
        setUsingCache(true);
        showModal({
          title: "Offline",
          message: "Menampilkan pengajuan izin terakhir yang tersimpan",
          buttonText: "Tutup",
        });
      } else {
        showModal({
          title: "Error",
          message: "Gagal memuat pengajuan izin",
          isError: true,
          buttonText: "Tutup",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(item => {
      const q = searchText.toLowerCase().trim();
      return (
        item.user.name.toLowerCase().includes(q) ||
        item.user.email.toLowerCase().includes(q)
      );
    });
  }, [requests, searchText]);

  const getStatusVariant = (value: string) => {
    switch (value) {
      case "APPROVED":
        return "success";
      case "REJECTED":
        return "error";
      case "PENDING":
      default:
        return "warning";
    }
  };

  const handleReview = async (id: number, action: "APPROVED" | "REJECTED") => {
    setUpdatingId(id);
    try {
      await reviewLeaveRequest(id, {
        action,
        note: noteMap[id]?.trim() || undefined,
      });
      setNoteMap(prev => ({...prev, [id]: ""}));
      await loadRequests();
      setSelectedItem(null); // Close modal on success
      showModal({
        title: "Sukses",
        message: `Pengajuan berhasil di-${action === "APPROVED" ? "setujui" : "tolak"}`,
        buttonText: "OK",
      });
    } catch (error: any) {
      showModal({
        title: "Gagal",
        message: error.response?.data?.message || "Gagal memproses pengajuan",
        isError: true,
        buttonText: "Tutup",
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const getImageUri = (path?: string | null) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return path;
    const baseUrl = api.defaults.baseURL?.replace(/\/api\/?$/, "");
    return baseUrl ? `${baseUrl}${path}` : path;
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Approval Izin" onBack={() => router.back()} />
      <FlatList
        data={filteredRequests}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshing={loading}
        onRefresh={loadRequests}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {isWeb && isDesktop && (
              <View style={styles.heroPanel}>
                <View style={styles.heroTextBlock}>
                  <View style={styles.heroBadge}>
                    <Ionicons
                      name="document-text-outline"
                      size={14}
                      color="#fff"
                    />
                    <Text style={styles.heroBadgeText}>
                      Leave Review Console
                    </Text>
                  </View>
                  <Text style={styles.heroTitle}>
                    Setujui atau tolak izin dari browser dengan cepat.
                  </Text>
                  <Text style={styles.heroSubtitle}>
                    Daftar pengajuan bisa difilter tanpa blok statistik
                    tambahan.
                  </Text>
                </View>
              </View>
            )}

            <Card style={styles.filterCard}>
              <Text style={styles.sectionTitle}>Filter Pengajuan</Text>
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
                  item => (
                    <Button
                      key={item}
                      title={item === "ALL" ? "Semua" : item}
                      variant={statusFilter === item ? "primary" : "outline"}
                      size="sm"
                      onPress={() => setStatusFilter(item)}
                      style={styles.filterBtn}
                    />
                  ),
                )}
              </View>
              <Button
                title="Muat Ulang"
                variant="outline"
                onPress={loadRequests}
                loading={loading}
              />
            </Card>
          </View>
        }
        renderItem={({item}) => (
          <TouchableOpacity onPress={() => setSelectedItem(item)} activeOpacity={0.7}>
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{flex: 1}}>
                  <Text style={styles.name}>{item.user.name}</Text>
                  <Text style={styles.date}>{formatDate(item.date)}</Text>
                </View>
                <View style={{alignItems: 'flex-end', gap: 4}}>
                  <Badge
                    label={item.leaveApprovalStatus}
                    variant={getStatusVariant(item.leaveApprovalStatus)}
                    size="sm"
                  />
                  <Text style={styles.typeSmall}>
                    {item.status === "SICK" ? "Sakit" : "Izin/Cuti"}
                  </Text>
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                Belum ada pengajuan yang cocok dengan filter.
              </Text>
            </View>
          ) : null
        }
      />

      {/* Detail Modal */}
      <Modal
        visible={!!selectedItem}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Izin</Text>
              <TouchableOpacity onPress={() => setSelectedItem(null)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Karyawan</Text>
                  <Text style={styles.detailValue}>{selectedItem.user.name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tanggal</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedItem.date)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Kategori</Text>
                  <Text style={styles.detailValue}>
                    {selectedItem.status === "SICK" ? "Sakit" : "Izin / Cuti"}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <Badge
                    label={selectedItem.leaveApprovalStatus}
                    variant={getStatusVariant(selectedItem.leaveApprovalStatus)}
                    size="sm"
                  />
                </View>

                {selectedItem.leaveDescription ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Keterangan</Text>
                    <Text style={styles.detailDesc}>{selectedItem.leaveDescription}</Text>
                  </View>
                ) : null}

                {selectedItem.clockInPhoto ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Bukti Foto (Klik/Zoom untuk perbesar)</Text>
                    <Image
                      source={{uri: getImageUri(selectedItem.clockInPhoto) || undefined}}
                      style={styles.detailImage}
                      resizeMode="contain"
                    />
                  </View>
                ) : null}

                {selectedItem.leaveReviewNote ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Catatan Admin Sebelumnya</Text>
                    <Text style={styles.detailDesc}>{selectedItem.leaveReviewNote}</Text>
                  </View>
                ) : null}

                {selectedItem.leaveApprovalStatus === "PENDING" && (
                  <View style={styles.actionContainer}>
                    <Input
                      label="Catatan baru (opsional)"
                      placeholder="Misal: disetujui, silakan istirahat"
                      value={noteMap[selectedItem.id] || ""}
                      onChangeText={value =>
                        setNoteMap(prev => ({...prev, [selectedItem.id]: value}))
                      }
                    />
                    <View style={styles.actionRow}>
                      <Button
                        title="Tolak"
                        variant="danger"
                        onPress={() => handleReview(selectedItem.id, "REJECTED")}
                        loading={updatingId === selectedItem.id}
                        style={styles.actionBtn}
                      />
                      <Button
                        title="Setujui"
                        variant="primary"
                        onPress={() => handleReview(selectedItem.id, "APPROVED")}
                        loading={updatingId === selectedItem.id}
                        style={styles.actionBtn}
                      />
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
  listContent: {padding: theme.spacing.lg, paddingBottom: theme.spacing.xl},
  card: {
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: {...theme.typography.h3, color: theme.colors.text.primary, fontSize: 16},
  date: {fontSize: 13, color: theme.colors.text.secondary, marginTop: 4},
  typeSmall: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontWeight: "500",
  },
  emptyState: {padding: theme.spacing.xl, alignItems: "center"},
  emptyText: {color: theme.colors.text.secondary},
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: theme.spacing.lg,
    maxHeight: "90%",
  },
  modalContentDesktop: {
    width: 600,
    alignSelf: "center",
    borderRadius: 20,
    marginBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
  },
  modalScroll: {
    marginBottom: theme.spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 15,
    color: theme.colors.text.primary,
    fontWeight: "600",
  },
  detailSection: {
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  detailDesc: {
    fontSize: 15,
    color: theme.colors.text.primary,
    marginTop: 8,
    lineHeight: 22,
  },
  detailImage: {
    width: "100%",
    height: 300,
    borderRadius: theme.radius.md,
    backgroundColor: "#e2e8f0",
    marginTop: 12,
  },
  actionContainer: {
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12 as any,
    marginTop: theme.spacing.md,
  },
  actionBtn: {flex: 1},
});
