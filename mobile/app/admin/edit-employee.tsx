import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SuccessModal } from '../../src/components/ui/SuccessModal';
import { useAuth } from '../../src/contexts/AuthContext';
import { getUserById, updateUser } from '../../src/services/api';

// UI Components
import { theme } from '../../src/constants/theme';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';

type SalaryType = 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

type RoleType = 'USER' | 'ADMIN' | 'LEADER';

export default function EditEmployee() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<RoleType>('USER');
  const [salaryType, setSalaryType] = useState<SalaryType>('MONTHLY');
  const [salary, setSalary] = useState('');
  const [startWorkTime, setStartWorkTime] = useState('09:00');
  const [latePenalty, setLatePenalty] = useState('0');
  const [isActive, setIsActive] = useState(true);
  
  // Validation
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  const fetchEmployee = async () => {
    try {
      const res = await getUserById(Number(id));
      const user = res.data.data;
      
      setName(user.name);
      setEmail(user.email);
      setRole(user.role || 'USER');
      setSalaryType(user.salaryType || 'MONTHLY');
      setSalary(user.salary?.toString() || '0');
      setStartWorkTime(user.startWorkTime || '09:00');
      setLatePenalty(user.latePenalty?.toString() || '0');
      setIsActive(user.isActive);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Gagal memuat data karyawan');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!name.trim()) newErrors.name = 'Nama wajib diisi';
    if (!email.trim()) newErrors.email = 'Email wajib diisi';
    
    if (!salary) newErrors.salary = 'Gaji wajib diisi';
    else if (isNaN(Number(salary))) newErrors.salary = 'Gaji harus angka';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSave = async () => {
    if (!validateForm()) {
        Alert.alert('Validasi Gagal', 'Mohon periksa inputan yang merah');
        return;
    }

    setSaving(true);
    try {
      await updateUser(Number(id), {
        name,
        email,
        role,
        salaryType,
        salary: Number(salary),
        startWorkTime,
        latePenalty: Number(latePenalty) || 0,
        isActive,
      });
      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Gagal', error.response?.data?.message || 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    router.back();
  };

  const salaryTypes: { value: SalaryType; label: string }[] = [
    { value: 'HOURLY', label: 'Per Jam' },
    { value: 'DAILY', label: 'Harian' },
    { value: 'WEEKLY', label: 'Mingguan' },
    { value: 'MONTHLY', label: 'Bulanan' },
  ];

  const roles: { value: RoleType; label: string }[] = [
    { value: 'USER', label: 'Karyawan' },
    { value: 'LEADER', label: 'Leader' },
    { value: 'ADMIN', label: 'Admin' },
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Edit Karyawan" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Status Toggle */}
        <Card style={styles.sectionCard}>
          <View style={styles.rowBetween}>
             <Text style={styles.sectionTitleNoMargin}>Status Akun</Text>
             <Button 
                title={isActive ? "Aktif" : "Non-Aktif"}
                variant={isActive ? 'success' : 'secondary'}
                size="sm"
                onPress={() => setIsActive(!isActive)}
             />
          </View>
        </Card>

        {/* Basic Information Section */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>👤 Informasi Dasar</Text>
          <Input
            label="Nama Lengkap"
            value={name}
            onChangeText={(text) => { setName(text); setErrors({...errors, name: ''}); }}
            error={errors.name}
          />
          <Input
            label="Email"
            value={email}
            onChangeText={(text) => { setEmail(text); setErrors({...errors, email: ''}); }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <Text style={styles.label}>Role / Jabatan</Text>
          <View style={styles.salaryTypeContainer}>
            {roles.map((r) => (
              <Button
                key={r.value}
                title={r.label}
                variant={role === r.value ? 'primary' : 'outline'}
                onPress={() => setRole(r.value)}
                style={[
                   styles.salaryTypeBtn,
                   role !== r.value && { borderColor: theme.colors.border }
                ]}
                textStyle={{ fontSize: 13, color: role === r.value ? '#fff' : theme.colors.text.secondary }}
              />
            ))}
          </View>
        </Card>

        {/* Salary Configuration Section */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>💰 Pengaturan Gaji</Text>
          
          <Text style={styles.label}>Tipe Gaji</Text>
          <View style={styles.salaryTypeContainer}>
            {salaryTypes.map((type) => (
              <Button
                key={type.value}
                title={type.label}
                variant={salaryType === type.value ? 'primary' : 'outline'}
                onPress={() => setSalaryType(type.value)}
                style={[
                  styles.salaryTypeBtn, 
                  salaryType !== type.value && { borderColor: theme.colors.border }
                ]}
                textStyle={{ fontSize: 13, color: salaryType === type.value ? '#fff' : theme.colors.text.secondary }}
              />
            ))}
          </View>
          
          <View style={styles.rowInputs}>
             <View style={{ flex: 1, marginRight: 8 }}>
                <Input
                  label="Nominal Gaji"
                  value={salary}
                  onChangeText={(text) => { setSalary(text); setErrors({...errors, salary: ''}); }}
                  keyboardType="numeric"
                  error={errors.salary}
                />
             </View>
             <View style={{ flex: 1, marginLeft: 8 }}>
                <Input
                  label="Denda Terlambat"
                  value={latePenalty}
                  onChangeText={setLatePenalty}
                  keyboardType="numeric"
                />
             </View>
          </View>
        </Card>

        {/* Working Hours Section */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>⏰ Jam Kerja</Text>
          <Input
            label="Jam Masuk"
            placeholder="09:00"
            value={startWorkTime}
            onChangeText={setStartWorkTime}
          />
          <Text style={styles.hintText}>Format: HH:MM (contoh: 09:00)</Text>
        </Card>

        <Button
          title="Simpan Perubahan"
          onPress={handleSave}
          loading={saving}
          size="lg"
          style={styles.submitBtn}
        />
        
        <View style={{ height: 40 }} /> 
      </ScrollView>

      <SuccessModal 
        visible={showSuccessModal}
        message="Data karyawan telah berhasil disimpan."
        onClose={handleSuccessClose}
        buttonText="OK, Kembali ke List"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  sectionCard: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  sectionTitleNoMargin: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: 8,
    marginLeft: 2,
  },
  salaryTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.lg,
  },
  salaryTypeBtn: {
    minWidth: '48%',
    flexGrow: 1,
    height: 40,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  hintText: {
    ...theme.typography.small,
    color: theme.colors.text.light,
    marginTop: -8,
    marginLeft: 4,
  },
  submitBtn: {
    marginTop: theme.spacing.sm,
  },
});
