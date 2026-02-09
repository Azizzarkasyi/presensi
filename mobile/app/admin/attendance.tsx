import { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { getAttendanceReport } from '../../src/services/api';

// UI Components
import { theme } from '../../src/constants/theme';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';

interface AttendanceRecord {
  id: number;
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  status: string;
  user: { name: string; email: string };
}

export default function AdminAttendance() {
  const router = useRouter();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    setLoading(true);
    try {
      // Use getAttendanceReport for better report data
      const res = await getAttendanceReport();
      setRecords(res.data.data || []);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Gagal memuat data absensi');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
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

  const renderItem = ({ item }: { item: AttendanceRecord }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
           <Text style={styles.userName}>{item.user?.name || 'Unknown'}</Text>
           <Text style={styles.date}>{new Date(item.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
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

      <FlatList
        data={records}
        keyExtractor={(item) => item.id.toString()}
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
    backgroundColor: theme.colors.background 
  },
  listContent: {
    padding: theme.spacing.lg,
  },
  card: {
    marginBottom: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    padding: theme.spacing.sm,
  },
  timeBox: {
    flex: 1,
    alignItems: 'center',
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.text.secondary,
  }
});
