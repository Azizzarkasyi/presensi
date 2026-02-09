import { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Text, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { getMyTasks, updateTaskStatus } from '../../src/services/api';

// UI Components
import { theme } from '../../src/constants/theme';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';

export default function UserTasks() {
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const res = await getMyTasks();
      setTasks(res.data.data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (taskId: number, currentStatus: string) => {
    let newStatus = '';
    
    // Logic: PENDING -> IN_PROGRESS -> DONE
    if (currentStatus === 'PENDING') newStatus = 'IN_PROGRESS';
    else if (currentStatus === 'IN_PROGRESS') newStatus = 'DONE';
    else return; // Already Done

    setUpdatingId(taskId);
    try {
      await updateTaskStatus(taskId, newStatus);
      // Optimistic update or reload
      loadTasks(); 
      Alert.alert('Sukses', `Status diubah menjadi ${newStatus}`);
    } catch (error: any) {
      Alert.alert('Gagal', error.response?.data?.message || 'Gagal update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'DONE': return 'success';
      case 'IN_PROGRESS': return 'info';
      default: return 'warning';
    }
  };

  const getActionButton = (status: string, id: number) => {
    if (status === 'PENDING') {
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
    } else if (status === 'IN_PROGRESS') {
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

  const renderItem = ({ item }: { item: any }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.title}</Text>
        <Badge 
          label={item.status.replace('_', ' ')} 
          variant={getStatusVariant(item.status)}
          size="sm"
        />
      </View>
      
      <Text style={styles.description}>{item.description}</Text>
      
      <View style={styles.metaRow}>
        <Text style={styles.creator}>Dari: {item.creator?.name || 'Admin'}</Text>
        {item.dueDate && (
          <Text style={styles.dueDate}>Deadline: {new Date(item.dueDate).toLocaleDateString('id-ID')}</Text>
        )}
      </View>

      <View style={styles.footer}>
        {getActionButton(item.status, item.id)}
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Daftar Tugas Saya" />

      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={loadTasks}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Tidak ada tugas saat ini. Santuy! 🌴</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { padding: theme.spacing.lg },
  card: { marginBottom: theme.spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  title: { ...theme.typography.h4, color: theme.colors.text.primary, flex: 1, marginRight: 8 },
  description: { fontSize: 14, color: theme.colors.text.secondary, marginBottom: 12, lineHeight: 20 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  creator: { fontSize: 12, color: theme.colors.text.light },
  dueDate: { fontSize: 12, color: theme.colors.error },
  footer: { borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12, alignItems: 'flex-end' },
  actionBtn: { width: 140 },
  doneContainer: { flexDirection: 'row', alignItems: 'center' },
  doneText: { color: theme.colors.success, fontWeight: '600', fontSize: 14 },
  emptyState: { padding: 32, alignItems: 'center' },
  emptyText: { color: theme.colors.text.secondary, fontStyle: 'italic' },
});
