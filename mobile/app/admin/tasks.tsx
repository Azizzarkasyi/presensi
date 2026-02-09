import { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert, Modal, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { getTasks, getUsers, createTask } from '../../src/services/api';

// UI Components
import { theme } from '../../src/constants/theme';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Badge } from '../../src/components/ui/Badge';

interface Task {
  id: number;
  title: string;
  description: string;
  status: string;
  assignee: { name: string };
  dueDate: string;
}

interface Employee {
  id: number;
  name: string;
}

export default function AdminTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tasksRes, usersRes] = await Promise.all([
        getTasks(),
        getUsers(),
      ]);
      setTasks(tasksRes.data.data || []);
      setEmployees(usersRes.data.data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCreateTask = async () => {
    if (!title || !description || !selectedEmployee) {
      Alert.alert('Error', 'Semua field harus diisi');
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
      setTitle('');
      setDescription('');
      setSelectedEmployee(null);
      loadData();
      Alert.alert('Sukses', 'Tugas berhasil ditambahkan');
    } catch (error: any) {
      Alert.alert('Gagal', error.response?.data?.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'PENDING': return 'warning';
      case 'IN_PROGRESS': return 'info';
      case 'DONE': return 'success';
      default: return 'default';
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <Card style={styles.taskCard}>
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.taskTitle}>{item.title}</Text>
          <Text style={styles.assigneeText}>👤 {item.assignee?.name || 'Unassigned'}</Text>
        </View>
        <Badge label={item.status} variant={getStatusVariant(item.status)} size="sm" />
      </View>
      
      <Text style={styles.taskDesc} numberOfLines={2}>{item.description}</Text>
      
      <View style={styles.cardFooter}>
         <Text style={styles.dateText}>📅 {new Date(item.createdAt).toLocaleDateString()}</Text>
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
            style={{ paddingHorizontal: 16, height: 40, minHeight: 40 }}
            textStyle={{ fontSize: 14 }}
          />
        }
      />

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderTaskItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Belum ada tugas</Text>
          </View>
        }
      />

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
                style={{ width: 40, paddingHorizontal: 0 }} 
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
              style={{ height: 80, textAlignVertical: 'top' }}
            />

            <Text style={styles.sectionLabel}>Ditugaskan Kepada</Text>
            <FlatList
              data={employees}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={{ paddingVertical: 8 }}
              renderItem={({ item }) => (
                <Button
                  title={item.name}
                  variant={selectedEmployee === item.id ? 'primary' : 'outline'}
                  onPress={() => setSelectedEmployee(item.id)}
                  style={[styles.employeeChip, selectedEmployee !== item.id && { borderColor: theme.colors.border }]}
                  textStyle={{ fontSize: 13, color: selectedEmployee === item.id ? '#fff' : theme.colors.text.secondary }}
                />
              )}
            />

            <View style={styles.modalButtons}>
              <Button 
                title="Simpan Tugas" 
                onPress={handleCreateTask}
                loading={loading}
                style={{ flex: 1 }}
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
    backgroundColor: theme.colors.background 
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  taskCard: {
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    flexDirection: 'row',
    justifyContent: 'flex-end',
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
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.text.secondary,
  },
  // Modal Styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: theme.colors.card, 
    borderTopLeftRadius: theme.radius.xl, 
    borderTopRightRadius: theme.radius.xl, 
    padding: theme.spacing.lg, 
    maxHeight: '85%' 
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
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
  }
});
