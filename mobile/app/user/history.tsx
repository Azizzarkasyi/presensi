import { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { getAttendanceHistory } from '../../src/services/api';

// Modern UI Components
import { theme } from '../../src/constants/theme';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';

interface Attendance {
  id: number;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: string;
}

export default function AttendanceHistory() {
  const { user } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await getAttendanceHistory(user!.id);
      setHistory(res.data.data || []); 
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'PRESENT': return 'success';
      case 'LATE': return 'warning';
      case 'SICK': return 'info';
      case 'LEAVE': return 'default';
      case 'ALPHA': return 'error';
      default: return 'default';
    }
  };

  const renderItem = ({ item }: { item: Attendance }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>{formatDate(item.date)}</Text>
        <Badge 
           label={item.status} 
           variant={getStatusVariant(item.status)}
           size="sm" 
        />
      </View>
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
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Riwayat Absensi" />

      <FlatList
        data={history}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={loadHistory}
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
  container: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { padding: theme.spacing.lg },
  card: { marginBottom: theme.spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: theme.spacing.md },
  date: { ...theme.typography.h4, color: theme.colors.text.primary },
  timeRow: { 
    flexDirection: 'row', 
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
  },
  timeBlock: { flex: 1, alignItems: 'center' },
  timeLabel: { fontSize: 11, color: theme.colors.text.light, marginBottom: 2, textTransform: 'uppercase' },
  timeValue: { fontSize: 16, fontWeight: '700', color: theme.colors.text.primary },
  divider: { width: 1, backgroundColor: theme.colors.border },
  emptyState: { padding: theme.spacing.xl, alignItems: 'center' },
  emptyText: { color: theme.colors.text.secondary },
});
