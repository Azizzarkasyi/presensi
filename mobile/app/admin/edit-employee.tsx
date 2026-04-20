import { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, Text, ActivityIndicator, Modal } from 'react-native';
import * as Location from 'expo-location';
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
import { MapPicker } from '../../src/components/ui/MapPicker';
import { useResponsive } from '../../src/hooks/useResponsive';

type SalaryType = 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

type RoleType = 'USER' | 'ADMIN' | 'LEADER';

export default function EditEmployee() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<RoleType>('USER');
  const [salaryType, setSalaryType] = useState<SalaryType>('MONTHLY');
  const [salary, setSalary] = useState('');
  const [startWorkTime, setStartWorkTime] = useState('09:00');
  const [endWorkTime, setEndWorkTime] = useState('17:00');
  const [latePenalty, setLatePenalty] = useState('0');
  const [isActive, setIsActive] = useState(true);
  
  // Location Override State
  const [workLatitude, setWorkLatitude] = useState('');
  const [workLongitude, setWorkLongitude] = useState('');
  const [workRadius, setWorkRadius] = useState('');
  
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
      setEndWorkTime(user.endWorkTime || '17:00');
      setLatePenalty(user.latePenalty?.toString() || '0');
      setWorkLatitude(user.workLatitude?.toString() || '');
      setWorkLongitude(user.workLongitude?.toString() || '');
      setWorkRadius(user.workRadius?.toString() || '');
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

    if (latePenalty && isNaN(Number(latePenalty))) newErrors.latePenalty = 'Denda harus angka';
    if (workRadius && isNaN(Number(workRadius))) newErrors.workRadius = 'Radius harus angka';
    if (workLatitude && isNaN(Number(workLatitude))) newErrors.workLatitude = 'Koordinat salah';
    if (workLongitude && isNaN(Number(workLongitude))) newErrors.workLongitude = 'Koordinat salah';

    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9](,\s*([01]?[0-9]|2[0-3]):[0-5][0-9])*$/;
    const singleTimeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (!startWorkTime.trim()) {
      newErrors.startWorkTime = 'Jam Masuk wajib diisi';
    } else if (startWorkTime.toUpperCase() !== 'FLEX' && !timeRegex.test(startWorkTime.trim())) {
      newErrors.startWorkTime = 'Format jam salah (HH:MM)';
    }

    if (endWorkTime.trim() && !singleTimeRegex.test(endWorkTime.trim())) {
      newErrors.endWorkTime = 'Format jam salah (HH:MM)';
    }

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
        endWorkTime,
        latePenalty: Number(latePenalty) || 0,
        workLatitude: workLatitude ? Number(workLatitude) : null,
        workLongitude: workLongitude ? Number(workLongitude) : null,
        workRadius: workRadius ? Number(workRadius) : null,
        isActive,
      });
      setShowSuccessModal(true);
    } catch (error: any) {
      console.error('Edit employee error:', error);
      Alert.alert('Gagal', error.response?.data?.message || error.message || 'Terjadi kesalahan');
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
                  onChangeText={(text) => { setLatePenalty(text); setErrors({...errors, latePenalty: ''}); }}
                  keyboardType="numeric"
                  error={errors.latePenalty}
                />
             </View>
          </View>
        </Card>

        {/* Working Hours Section */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>⏰ Jam Kerja & Auto-Shift</Text>
          <View style={styles.rowInputs}>
             <View style={{ flex: 1, marginRight: 8 }}>
                <Input
                  label="Jam Masuk (Pisahkan dg koma)"
                  placeholder="Contoh: 08:00,14:00"
                  value={startWorkTime}
                  onChangeText={(text) => {
                    setStartWorkTime(text);
                    setErrors({...errors, startWorkTime: ''});
                  }}
                  error={errors.startWorkTime}
                />
             </View>
             <View style={{ flex: 1, marginLeft: 8 }}>
                <Input
                  label="Jam Pulang (Opsional)"
                  placeholder="17:00"
                  value={endWorkTime}
                  onChangeText={(text) => {
                    setEndWorkTime(text);
                    setErrors({...errors, endWorkTime: ''});
                  }}
                  error={errors.endWorkTime}
                />
             </View>
          </View>
          <Text style={styles.hintText}>Isi koma jika ada 2 Shift. Contoh: 06:00,12:00</Text>
        </Card>

        {/* Location Section */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📍 Lokasi Kerja Khusus (Opsional)</Text>
          <Text style={styles.hintText}>Isi area ini jika karyawan memiliki pembatasan radius absen terpisah dari kantor pusat.</Text>
          
          <View style={{ marginTop: theme.spacing.md }}>
            {workLatitude && workLongitude ? (
               <View style={{ marginBottom: 16 }}>
                 <Text style={styles.label}>Koordinat Khusus Tersimpan</Text>
                 <Text style={{ color: theme.colors.text.secondary }}>
                   {workLatitude}, {workLongitude}
                 </Text>
               </View>
            ) : (
               <View style={{ marginBottom: 16 }}>
                 <Text style={{ color: theme.colors.text.light, fontStyle: 'italic' }}>
                   Belum ada lokasi khusus, akan mengikuti pusat
                 </Text>
               </View>
            )}

            <Button 
              title="🗺️ Pilih via Peta Interaktif" 
              variant="outline"
              onPress={() => setShowMapPicker(true)}
              style={{ marginBottom: 16 }}
            />

            <Input
              label="Radius Individual (meter)"
              value={workRadius}
              onChangeText={(text) => { setWorkRadius(text); setErrors({...errors, workRadius: ''}); }}
              keyboardType="numeric"
              placeholder="Contoh: 50"
              error={errors.workRadius}
            />
          </View>
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

      {/* Map Picker Modal */}
      <Modal visible={showMapPicker} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
           <View style={[styles.mapModalContainer, isDesktop && styles.mapModalDesktop]}>
              <MapPicker 
                 initialLatitude={workLatitude ? parseFloat(workLatitude) : null}
                 initialLongitude={workLongitude ? parseFloat(workLongitude) : null}
                 onClose={() => setShowMapPicker(false)}
                 onSelect={(lat, lng) => {
                    setWorkLatitude(lat.toString()); 
                    setWorkLongitude(lng.toString());
                    setShowMapPicker(false);
                 }}
              />
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  mapModalDesktop: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  }
});
