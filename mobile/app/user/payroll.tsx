import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { getMyPayrolls } from '../../src/services/api';
import api from '../../src/services/api';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Button } from '../../src/components/ui/Button';
import { theme } from '../../src/constants/theme';

interface Payroll {
  id: number;
  periodStart: string;
  periodEnd: string;
  baseSalary: number;
  deductions: number;
  netSalary: number;
  paymentStatus: string;
  paymentProof: string | null;
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
      const res = await getMyPayrolls();
      setPayrolls(res.data.data);
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

  const handleExportExcel = async () => {
    try {
      setLoading(true);
      const res = await api.get('/payroll/my/export/excel', { responseType: 'blob' });
      if (Platform.OS === 'web') {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'gaji_saya.xlsx');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const fr = new FileReader();
        fr.onload = async () => {
           const fileUri = `${FileSystem.documentDirectory}gaji_saya.xlsx`;
           await FileSystem.writeAsStringAsync(fileUri, (fr.result as string).split(',')[1], { encoding: FileSystem.EncodingType.Base64 });
           await Sharing.shareAsync(fileUri);
        };
        fr.readAsDataURL(res.data);
      }
    } catch (error) {
      Alert.alert('Error', 'Gagal mengekspor laporan excel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScreenHeader 
         title="Slip Gaji" 
         rightElement={
             <Button 
                title="📥 Excel" 
                variant="success" 
                size="sm" 
                onPress={handleExportExcel} 
             />
         }
      />

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

            <View style={[styles.divider, { marginTop: 12, marginBottom: 12 }]} />
            
            <View style={styles.salaryRow}>
               <Text style={styles.salaryLabel}>Status Pencairan</Text>
               <Text style={{ fontWeight: 'bold', color: item.paymentStatus === 'PAID' ? theme.colors.status.success : theme.colors.status.warning }}>
                  {item.paymentStatus}
               </Text>
            </View>

            {item.paymentStatus === 'PAID' && item.paymentProof && (
               <TouchableOpacity onPress={() => window.open(api.defaults.baseURL?.replace('/api', '') + item.paymentProof, '_blank')} style={{ marginTop: 8 }}>
                  <Text style={{ color: theme.colors.status.info, textAlign: 'center', fontWeight: '500' }}>📄 Lihat Bukti Transfer</Text>
               </TouchableOpacity>
            )}
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, marginHorizontal: 16, elevation: 3 },
  periodRow: { marginBottom: 12 },
  periodLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  periodValue: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 12 },
  salaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  salaryLabel: { fontSize: 14, color: '#64748b' },
  salaryValue: { fontSize: 14, color: '#1e293b' },
  deductionValue: { fontSize: 14, color: theme.colors.status.error },
  netLabel: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  netValue: { fontSize: 18, fontWeight: 'bold', color: theme.colors.status.success },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: '#94a3b8', fontSize: 16 },
});
