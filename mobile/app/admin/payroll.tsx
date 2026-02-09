import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import api, { generatePayroll } from '../../src/services/api';

// UI Components
import { theme } from '../../src/constants/theme';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { SuccessModal } from '../../src/components/ui/SuccessModal';

interface Employee {
  id: number;
  name: string;
  email: string;
  salaryType: string;
  salary: number;
}

export default function AdminPayroll() {
  const { user } = useAuth();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const res = await api.get('/users');
      // Handle different API response structures safely
      const data = res.data.data || res.data;
      const allEmployees = Array.isArray(data) ? data : [];
      
      const companyEmployees = allEmployees.filter((e: any) => 
        // If companyId check is needed, ensure it exists, otherwise just filter by role
        (user?.companyId ? e.companyId === user.companyId : true) && e.role === 'USER'
      );
      setEmployees(companyEmployees);
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Gagal memuat data karyawan');
    }
  };

  const handleGenerate = async () => {
    if (!selectedEmployee || !startDate || !endDate) {
      Alert.alert('Validasi Gagal', 'Mohon pilih karyawan dan tentukan periode');
      return;
    }

    setLoading(true);
    try {
      await generatePayroll({
        userId: selectedEmployee,
        startDate,
        endDate,
      });
      setShowSuccessModal(true);
      setSelectedEmployee(null);
      setStartDate('');
      setEndDate('');
    } catch (error: any) {
      Alert.alert('Gagal', error.response?.data?.error || 'Terjadi kesalahan saat generate gaji');
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

  return (
    <View style={styles.container}>
      <ScreenHeader title="Generate Gaji" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>1. Pilih Karyawan</Text>
          
          {employees.length === 0 ? (
             <Text style={styles.emptyText}>Tidak ada karyawan yang ditemukan.</Text>
          ) : (
            <FlatList
              data={employees}
              horizontal
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <Button
                  title={`${item.name}\n${formatCurrency(item.salary)}/${item.salaryType}`}
                  variant={selectedEmployee === item.id ? 'primary' : 'outline'}
                  onPress={() => setSelectedEmployee(item.id)}
                  style={styles.empBtn}
                  textStyle={styles.empBtnText}
                />
              )}
              showsHorizontalScrollIndicator={false}
              style={styles.empList}
              contentContainerStyle={styles.empListContent}
            />
          )}

          <Text style={styles.sectionTitle}>2. Tentukan Periode</Text>
          <View style={styles.row}>
            <View style={styles.flex1}>
               <Input
                 label="Tanggal Mulai"
                 placeholder="YYYY-MM-DD"
                 value={startDate}
                 onChangeText={setStartDate}
                 hint="Contoh: 2024-01-01"
               />
            </View>
            <View style={{ width: 12 }} />
            <View style={styles.flex1}>
               <Input
                 label="Tanggal Akhir"
                 placeholder="YYYY-MM-DD"
                 value={endDate}
                 onChangeText={setEndDate}
                 hint="Contoh: 2024-01-31"
               />
            </View>
          </View>
          
          <View style={styles.divider} />

          <Button
            title="Generate Slip Gaji"
            onPress={handleGenerate}
            loading={loading}
            size="lg"
            variant="success"
            icon={<Text>💰</Text>}
          />
        </Card>
      </ScrollView>

      <SuccessModal
        visible={showSuccessModal}
        message="Slip gaji berhasil dibuat dan dikirim ke karyawan."
        onClose={() => setShowSuccessModal(false)}
        buttonText="OK"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: theme.colors.background 
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  card: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.h3,
    marginBottom: 12,
    color: theme.colors.text.primary,
    marginTop: 8,
  },
  empList: { 
    marginBottom: 24,
    marginHorizontal: -4, // compensates for padding if needed, but here mainly for look
  },
  empListContent: {
    paddingVertical: 4,
    gap: 8,
  },
  empBtn: {
    minWidth: 140,
    height: 'auto',
    paddingVertical: 12,
    marginRight: 8,
    alignItems: 'flex-start',
  },
  empBtnText: {
    textAlign: 'left',
    fontSize: 12,
  },
  emptyText: {
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 24,
  },
});

