import {useEffect, useState} from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  Alert,
  TouchableOpacity,
  import {View, FlatList, StyleSheet, Text, TouchableOpacity} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {useRouter} from "expo-router";
import {getMyTasks, updateTaskStatus} from "../../src/services/api";
import {useResponsive} from "../../src/hooks/useResponsive";
import {readCachedJson, writeCachedJson} from "../../src/utils/webCache";

// UI Components
import {theme} from "../../src/constants/theme";
import {ScreenHeader} from "../../src/components/ui/ScreenHeader";
import {Card} from "../../src/components/ui/Card";
import {Badge} from "../../src/components/ui/Badge";
import {Button} from "../../src/components/ui/Button";
  import {useGlobalModal} from "../../src/contexts/GlobalModalContext";

export default function UserTasks() {
  const router = useRouter();
  const {isDesktop, isWeb} = useResponsive();
    const {showModal} = useGlobalModal();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [usingCache, setUsingCache] = useState(false);

  const cacheKey = "user-tasks-cache";

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setUsingCache(false);
    try {
      const res = await getMyTasks();
      const data = res.data.data || [];
      setTasks(data);
      await writeCachedJson(cacheKey, data);
    } catch (error) {
      console.error("Error loading tasks:", error);
      const cachedTasks = await readCachedJson<any[]>(cacheKey);
      if (cachedTasks && cachedTasks.length > 0) {
        setTasks(cachedTasks);
        setUsingCache(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (taskId: number, currentStatus: string) => {
    let newStatus = "";

    // Logic: PENDING -> IN_PROGRESS -> DONE
    if (currentStatus === "PENDING") newStatus = "IN_PROGRESS";
    else if (currentStatus === "IN_PROGRESS") newStatus = "DONE";
    else return; // Already Done

    setUpdatingId(taskId);
    try {
      await updateTaskStatus(taskId, newStatus);
      // Optimistic update or reload
      loadTasks();
        showModal({
          title: "Sukses",
          message: `Status diubah menjadi ${newStatus}`,
          buttonText: "OK",
        });
    } catch (error: any) {
      console.error("Update task error:", error);
        showModal({
          title: "Gagal",
          message:
            error.response?.data?.message || error.message || "Gagal update status",
          isError: true,
          buttonText: "Tutup",
        });
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "DONE":
        return "success";
      case "IN_PROGRESS":
        return "info";
      default:
        return "warning";
    }
  };

  const getActionButton = (status: string, id: number) => {
    if (status === "PENDING") {
      return (
        <Button
          title="Mulai Kerjakan"
          variant="primary"
          size="sm"
          onPress={() => handleUpdateStatus(id, status)}
          loading={updatingId === id}
          style={styles.actionBtn}
        />
      );
    } else if (status === "IN_PROGRESS") {
      return (
        <Button
          title="Selesaikan"
          variant="success"
          size="sm"
          onPress={() => handleUpdateStatus(id, status)}
          loading={updatingId === id}
          style={styles.actionBtn}
        />
      );
    }
    return (
      <View style={styles.doneContainer}>
        <Text style={styles.doneText}>✓ Selesai</Text>
      </View>
    );
  };

  const renderItem = ({item}: {item: any}) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.title}</Text>
        <Badge
          label={item.status.replace("_", " ")}
          variant={getStatusVariant(item.status)}
          size="sm"
        />
      </View>

      <Text style={styles.description}>{item.description}</Text>

      <View style={styles.metaRow}>
        <Text style={styles.creator}>
          Dari: {item.creator?.name || "Admin"}
        </Text>
        {item.dueDate && (
          <Text style={styles.dueDate}>
            Deadline: {new Date(item.dueDate).toLocaleDateString("id-ID")}
          </Text>
        )}
      </View>

      <View style={styles.footer}>{getActionButton(item.status, item.id)}</View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Daftar Tugas Saya" />

      {isWeb && isDesktop && (
        <View style={styles.heroPanel}>
          <View style={styles.heroTextBlock}>
            <View style={styles.heroBadge}>
              <Ionicons name="clipboard-outline" size={14} color="#fff" />
              <Text style={styles.heroBadgeText}>Task Overview</Text>
            </View>
            <Text style={styles.heroTitle}>
              Tugas harian yang lebih nyaman dibaca di browser.
            </Text>
            <Text style={styles.heroSubtitle}>
              Lihat status, deadline, dan lanjutkan tugas langsung tanpa perlu
              buka tampilan mobile.
            </Text>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Total</Text>
              <Text style={styles.heroStatValue}>{tasks.length}</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Offline</Text>
              <Text style={styles.heroStatValue}>
                {usingCache ? "Cache" : "Live"}
              </Text>
            </View>
          </View>
        </View>
      )}

      {usingCache ? (
        <Text style={styles.cacheNote}>Menampilkan cache tugas terakhir.</Text>
      ) : null}

      <FlatList
        data={tasks}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={loadTasks}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                Tidak ada tugas saat ini. Santuy! 🌴
              </Text>
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
    color: theme.colors.text.secondary,
    fontSize: 12,
    marginHorizontal: theme.spacing.lg,
    marginTop: 8,
    fontStyle: "italic",
  },
  listContent: {padding: theme.spacing.lg},
  card: {marginBottom: theme.spacing.md},
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  title: {
    ...theme.typography.h4,
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  description: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  creator: {fontSize: 12, color: theme.colors.text.light},
  dueDate: {fontSize: 12, color: theme.colors.error},
  footer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
    alignItems: "flex-end",
  },
  actionBtn: {width: 140},
  doneContainer: {flexDirection: "row", alignItems: "center"},
  doneText: {color: theme.colors.success, fontWeight: "600", fontSize: 14},
  emptyState: {padding: 32, alignItems: "center"},
  emptyText: {color: theme.colors.text.secondary, fontStyle: "italic"},
});
