import { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Alert, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { getUsers, deleteUser } from '../../src/services/api';

// UI Components
import { theme } from '../../src/constants/theme';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';

interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  salaryType: string;
  salary: number;
}

export default function AdminEmployees() {
  const { user } = useAuth();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await getUsers();
      setEmployees(res.data.data || []);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Gagal memuat data karyawan');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: number, name: string) => {
    Alert.alert(
      'Hapus Karyawan',
      `Yakin ingin menghapus ${name}?`,
      [
        { text: 'Batal', style: 'cancel' },
        { 
          text: 'Hapus', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(id);
              Alert.alert('Sukses', 'Karyawan berhasil dihapus');
              loadEmployees();
            } catch (error: any) {
              Alert.alert('Gagal', error.response?.data?.message || 'Terjadi kesalahan');
            }
          }
        }
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderItem = ({ item }: { item: Employee }) => (
    <Card 
      style={styles.card} 
      onPress={() => router.push(`/admin/edit-employee?id=${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.empName}>{item.name}</Text>
          <Text style={styles.empEmail}>{item.email}</Text>
        </View>
        <Badge 
          label={item.role} 
          variant={item.role === 'ADMIN' ? 'info' : 'default'}
          size="sm"
        />
      </View>
      
      <View style={styles.detailsRow}>
        <View>
           <Text style={styles.label}>Gaji</Text>
           <Text style={styles.value}>{formatCurrency(item.salary)}</Text>
        </View>
        <View>
           <Text style={styles.label}>Tipe</Text>
           <Text style={styles.value}>{item.salaryType}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Button 
          title="Edit" 
          variant="outline" 
          onPress={() => router.push(`/admin/edit-employee?id=${item.id}`)}
          style={styles.actionBtn}
          textStyle={{ fontSize: 12 }}
        />
        <Button 
          title="Hapus" 
          variant="danger" 
          onPress={() => handleDelete(item.id, item.name)}
          style={styles.actionBtn}
          textStyle={{ fontSize: 12 }}
        />
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader 
        title="Daftar Karyawan" 
        rightElement={
          <Button 
            title="+ Baru" 
            onPress={() => router.push('/admin/add-employee')}
            variant="primary"
            style={{ paddingHorizontal: 16, height: 40, minHeight: 40 }}
            textStyle={{ fontSize: 14 }}
          />
        }
      />

      <FlatList
        data={employees}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={loadEmployees}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Belum ada karyawan</Text>
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
  titleContainer: {
    flex: 1,
  },
  empName: {
    ...theme.typography.h3,
    fontSize: 18,
    color: theme.colors.text.primary,
  },
  empEmail: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 12,
    color: theme.colors.text.light,
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionBtn: {
    height: 32,
    minHeight: 32,
    paddingVertical: 0,
    paddingHorizontal: 16,
  },
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.text.secondary,
  }
});
