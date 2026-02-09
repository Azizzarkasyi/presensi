import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { getPayrollHistory } from '../../src/services/api';

interface Payroll {
  id: number;
  periodStart: string;
  periodEnd: string;
  baseSalary: number;
  deductions: number;
  netSalary: number;
  createdAt: string;
}

export default function PayrollView() {
  const { user } = useAuth();
  const router = useRouter();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayrolls();
  }, []);

  const loadPayrolls = async () => {
    try {
      const res = await getPayrollHistory(user!.id);
      setPayrolls(res.data);
    } catch (error) {
      console.error('Error loading payrolls:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Slip Gaji</Text>
      </View>

      <FlatList
        data={payrolls}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.periodRow}>
              <Text style={styles.periodLabel}>Periode</Text>
              <Text style={styles.periodValue}>
                {formatDate(item.periodStart)} - {formatDate(item.periodEnd)}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.salaryRow}>
              <Text style={styles.salaryLabel}>Gaji Pokok</Text>
              <Text style={styles.salaryValue}>{formatCurrency(item.baseSalary)}</Text>
            </View>

            <View style={styles.salaryRow}>
              <Text style={styles.salaryLabel}>Potongan</Text>
              <Text style={styles.deductionValue}>- {formatCurrency(item.deductions)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.salaryRow}>
              <Text style={styles.netLabel}>Total Diterima</Text>
              <Text style={styles.netValue}>{formatCurrency(item.netSalary)}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={styles.emptyText}>
              {loading ? 'Memuat...' : 'Belum ada slip gaji'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { color: '#3b82f6', fontSize: 16, marginRight: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 3 },
  periodRow: { marginBottom: 12 },
  periodLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  periodValue: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 12 },
  salaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  salaryLabel: { fontSize: 14, color: '#64748b' },
  salaryValue: { fontSize: 14, color: '#1e293b' },
  deductionValue: { fontSize: 14, color: '#ef4444' },
  netLabel: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  netValue: { fontSize: 18, fontWeight: 'bold', color: '#22c55e' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: '#94a3b8', fontSize: 16 },
});
