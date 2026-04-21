import {useEffect, useState} from "react";
import {View, FlatList, StyleSheet, Modal, Text} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {useRouter} from "expo-router";
import {useAuth} from "../../src/contexts/AuthContext";
import {getTasks, getUsers, createTask} from "../../src/services/api";
import {useResponsive} from "../../src/hooks/useResponsive";
import {readCachedJson, writeCachedJson} from "../../src/utils/webCache";

// UI Components
import {theme} from "../../src/constants/theme";
import {ScreenHeader} from "../../src/components/ui/ScreenHeader";
import {Card} from "../../src/components/ui/Card";
import {Button} from "../../src/components/ui/Button";
import {Input} from "../../src/components/ui/Input";
import {Badge} from "../../src/components/ui/Badge";
import {useGlobalModal} from "../../src/contexts/GlobalModalContext";

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  assignee: {name: string};
  dueDate: string;
  createdAt: string;
}

interface Employee {
  id: number;
  name: string;
}

export default function AdminTasks() {
  const {user} = useAuth();
  const {isDesktop, isWeb} = useResponsive();
  const {showModal} = useGlobalModal();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [usingCache, setUsingCache] = useState(false);

  const tasksCacheKey = "admin-tasks-cache";
  const employeesCacheKey = "admin-tasks-employees-cache";

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setUsingCache(false);
    try {
      const [tasksRes, usersRes] = await Promise.all([getTasks(), getUsers()]);
      const nextTasks = tasksRes.data.data || [];
      const nextEmployees = usersRes.data.data || [];
      setTasks(nextTasks);
      setEmployees(nextEmployees);
      await writeCachedJson(tasksCacheKey, nextTasks);
      await writeCachedJson(employeesCacheKey, nextEmployees);
    } catch (error) {
      console.error("Error:", error);
      const cachedTasks = await readCachedJson<Task[]>(tasksCacheKey);
      const cachedEmployees =
        await readCachedJson<Employee[]>(employeesCacheKey);
      if (
        (cachedTasks && cachedTasks.length > 0) ||
        (cachedEmployees && cachedEmployees.length > 0)
      ) {
        setTasks(cachedTasks || []);
        setEmployees(cachedEmployees || []);
        setUsingCache(true);
        showModal({
          title: "Offline",
          message: "Menampilkan data tugas terakhir yang tersimpan",
          buttonText: "Tutup",
        });
      } else {
        showModal({
          title: "Error",
          message: "Gagal memuat data tugas",
          isError: true,
          buttonText: "Tutup",
        });
      }
    }
  };

  const handleCreateTask = async () => {
    if (!title || !description || !selectedEmployee) {
      showModal({
        title: "Error",
        message: "Semua field harus diisi",
        isError: true,
        buttonText: "Tutup",
      });
      return;
    }

    setLoading(true);
    try {
      await createTask({
        title,
        description,
        assigneeId: selectedEmployee,
      });
      setShowModal(false);
      setTitle("");
      setDescription("");
      setSelectedEmployee(null);
      loadData();
      showModal({
        title: "Sukses",
        message: "Tugas berhasil ditambahkan",
        buttonText: "OK",
      });
    } catch (error: any) {
      console.error("Create task error:", error);
      showModal({
        title: "Gagal",
        message:
          error.response?.data?.message || error.message || "Terjadi kesalahan",
        isError: true,
        buttonText: "Tutup",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "PENDING":
        return "warning";
      case "IN_PROGRESS":
        return "info";
      case "DONE":
        return "success";
      default:
        return "default";
    }
  };

  const renderTaskItem = ({item}: {item: Task}) => (
    <Card style={styles.taskCard}>
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.taskTitle}>{item.title}</Text>
          <Text style={styles.assigneeText}>
            👤 {item.assignee?.name || "Unassigned"}
          </Text>
        </View>
        <Badge
          label={item.status}
          variant={getStatusVariant(item.status)}
          size="sm"
        />
      </View>

      <Text style={styles.taskDesc} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>
          📅 {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Kelola Tugas"
        rightElement={
          <Button
            title="+ Baru"
            onPress={() => setShowModal(true)}
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
              <Ionicons name="list-outline" size={14} color="#fff" />
              <Text style={styles.heroBadgeText}>Task Console</Text>
            </View>
            <Text style={styles.heroTitle}>
              Kelola tugas dari browser dengan tampilan yang lebih ringan.
            </Text>
            <Text style={styles.heroSubtitle}>
              Buat tugas, cek siapa yang ditugaskan, dan tetap lihat data
              terakhir saat koneksi tidak stabil.
            </Text>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Total</Text>
              <Text style={styles.heroStatValue}>{tasks.length}</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Pending</Text>
              <Text style={styles.heroStatValue}>
                {tasks.filter(item => item.status === "PENDING").length}
              </Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Proses</Text>
              <Text style={styles.heroStatValue}>
                {tasks.filter(item => item.status === "IN_PROGRESS").length}
              </Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Selesai</Text>
              <Text style={styles.heroStatValue}>
                {tasks.filter(item => item.status === "DONE").length}
              </Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.listWrap}>
        {usingCache ? (
          <Text style={styles.cacheNote}>Menampilkan cache data terakhir.</Text>
        ) : null}
        <FlatList
          data={tasks}
          keyExtractor={item => item.id.toString()}
          renderItem={renderTaskItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Belum ada tugas</Text>
            </View>
          }
        />
      </View>

      {/* Modern Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Buat Tugas Baru</Text>
              <Button
                title="✕"
                variant="ghost"
                onPress={() => setShowModal(false)}
                style={{width: 40, paddingHorizontal: 0}}
              />
            </View>

            <Input
              label="Judul Tugas"
              placeholder="Contoh: Perbaiki Bug Login"
              value={title}
              onChangeText={setTitle}
            />

            <Input
              label="Deskripsi"
              placeholder="Jelaskan detail tugas..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              style={{height: 80, textAlignVertical: "top"}}
            />

            <Text style={styles.sectionLabel}>Ditugaskan Kepada</Text>
            <FlatList
              data={employees}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={{paddingVertical: 8}}
              renderItem={({item}) => (
                <Button
                  title={item.name}
                  variant={selectedEmployee === item.id ? "primary" : "outline"}
                  onPress={() => setSelectedEmployee(item.id)}
                  style={[
                    styles.employeeChip,
                    selectedEmployee !== item.id && {
                      borderColor: theme.colors.border,
                    },
                  ]}
                  textStyle={{
                    fontSize: 13,
                    color:
                      selectedEmployee === item.id
                        ? "#fff"
                        : theme.colors.text.secondary,
                  }}
                />
              )}
            />

            <View style={styles.modalButtons}>
              <Button
                title="Simpan Tugas"
                onPress={handleCreateTask}
                loading={loading}
                style={{flex: 1}}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  listWrap: {
    flex: 1,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  cacheNote: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    marginHorizontal: theme.spacing.lg,
    marginTop: 8,
    fontStyle: "italic",
  },
  taskCard: {
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: theme.spacing.sm,
  },
  titleContainer: {
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  taskTitle: {
    ...theme.typography.h3,
    fontSize: 18,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  assigneeText: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  taskDesc: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: theme.colors.background,
    paddingTop: theme.spacing.sm,
  },
  dateText: {
    ...theme.typography.small,
    color: theme.colors.text.light,
  },
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    color: theme.colors.text.secondary,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  employeeChip: {
    marginRight: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    minHeight: 36,
    borderRadius: theme.radius.full,
  },
  modalButtons: {
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
});
