import { View, ScrollView, StyleSheet, Alert, TouchableOpacity, Text, Modal } from 'react-native';
import * as Location from 'expo-location';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { createUser } from '../../src/services/api';

// UI Components
import { theme } from '../../src/constants/theme';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { SuccessModal } from '../../src/components/ui/SuccessModal';
import { MapPicker } from '../../src/components/ui/MapPicker';
import { useResponsive } from '../../src/hooks/useResponsive';

type SalaryType = 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
type RoleType = 'USER' | 'ADMIN' | 'LEADER';

export default function AddEmployee() {
  const router = useRouter();
  const { isDesktop } = useResponsive();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RoleType>('USER');
  const [salaryType, setSalaryType] = useState<SalaryType>('MONTHLY');
  const [salary, setSalary] = useState('');
  const [startWorkTime, setStartWorkTime] = useState('09:00');
  const [endWorkTime, setEndWorkTime] = useState('17:00');
  const [latePenalty, setLatePenalty] = useState('0');
  
  // Location Override State
  const [workLatitude, setWorkLatitude] = useState('');
  const [workLongitude, setWorkLongitude] = useState('');
  const [workRadius, setWorkRadius] = useState('');

  // Validation State
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!name.trim()) newErrors.name = 'Nama wajib diisi';
    if (!email.trim()) newErrors.email = 'Email wajib diisi';
    else if (!email.includes('@')) newErrors.email = 'Email tidak valid';
    
    if (!password) newErrors.password = 'Password wajib diisi';
    else if (password.length < 6) newErrors.password = 'Minimal 6 karakter';
    
    if (!salary) newErrors.salary = 'Gaji wajib diisi';
    else if (isNaN(Number(salary))) newErrors.salary = 'Gaji harus angka';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Success Modal State

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validasi Gagal', 'Mohon periksa kembali inputan Anda');
      return;
    }

    setLoading(true);
    try {
      await createUser({
        name,
        email,
        password,
        role,
        salaryType,
        salary: Number(salary),
        startWorkTime,
        endWorkTime,
        latePenalty: Number(latePenalty) || 0,
        workLatitude: workLatitude ? Number(workLatitude) : undefined,
        workLongitude: workLongitude ? Number(workLongitude) : undefined,
        workRadius: workRadius ? Number(workRadius) : undefined,
      });
      
      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Gagal', error.response?.data?.message || 'Terjadi kesalahan saat menyimpan data');
    } finally {
      setLoading(false);
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

  return (
    <View style={styles.container}>
      <ScreenHeader title="Tambah Karyawan" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>👤 Informasi Dasar</Text>
          <Input
            label="Nama Lengkap *"
            value={name}
            onChangeText={(text) => { setName(text); setErrors({...errors, name: ''}); }}
            placeholder="Contoh: Budi Santoso"
            error={errors.name}
          />
          <Input
            label="Email *"
            value={email}
            onChangeText={(text) => { setEmail(text); setErrors({...errors, email: ''}); }}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="email@perusahaan.com"
            error={errors.email}
          />
          <Input
            label="Password *"
            value={password}
            onChangeText={(text) => { setPassword(text); setErrors({...errors, password: ''}); }}
            secureTextEntry
            placeholder="Minimal 6 karakter"
            error={errors.password}
          />
          
          <Text style={styles.label}>Role / Jabatan</Text>
          <View style={styles.optionContainer}>
            {roles.map((r) => (
              <Button
                key={r.value}
                title={r.label}
                variant={role === r.value ? 'primary' : 'outline'}
                onPress={() => setRole(r.value)}
                style={[
                   styles.optionBtn,
                   role !== r.value && { borderColor: theme.colors.border }
                ]}
                textStyle={{ fontSize: 13, color: role === r.value ? '#fff' : theme.colors.text.secondary }}
              />
            ))}
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>💰 Pengaturan Gaji</Text>
          
          <Text style={styles.label}>Tipe Gaji</Text>
          <View style={styles.optionContainer}>
            {salaryTypes.map((type) => (
              <Button
                key={type.value}
                title={type.label}
                variant={salaryType === type.value ? 'primary' : 'outline'}
                onPress={() => setSalaryType(type.value)}
                style={[
                  styles.optionBtn, 
                  salaryType !== type.value && { borderColor: theme.colors.border }
                ]}
                textStyle={{ fontSize: 13, color: salaryType === type.value ? '#fff' : theme.colors.text.secondary }}
              />
            ))}
          </View>
          
          <View style={styles.rowInputs}>
             <View style={{ flex: 1, marginRight: 8 }}>
                <Input
                  label="Nominal Gaji *"
                  value={salary}
                  onChangeText={(text) => { setSalary(text); setErrors({...errors, salary: ''}); }}
                  keyboardType="numeric"
                  placeholder="0"
                  error={errors.salary}
                />
             </View>
             <View style={{ flex: 1, marginLeft: 8 }}>
                <Input
                  label="Denda Terlambat"
                  value={latePenalty}
                  onChangeText={setLatePenalty}
                  keyboardType="numeric"
                  placeholder="0"
                />
             </View>
          </View>
        </Card>

        {/* Working Hours Section */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>⏰ Jam Kerja</Text>
          <View style={styles.rowInputs}>
             <View style={{ flex: 1, marginRight: 8 }}>
                <Input
                  label="Jam Masuk"
                  placeholder="09:00"
                  value={startWorkTime}
                  onChangeText={setStartWorkTime}
                />
             </View>
             <View style={{ flex: 1, marginLeft: 8 }}>
                <Input
                  label="Jam Pulang"
                  placeholder="17:00"
                  value={endWorkTime}
                  onChangeText={setEndWorkTime}
                />
             </View>
          </View>
          <Text style={styles.hintText}>Format: HH:MM (contoh: 09:00)</Text>
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
              onChangeText={setWorkRadius}
              keyboardType="numeric"
              placeholder="Contoh: 50"
            />
          </View>
        </Card>

        <Button
          title="Simpan Karyawan"
          onPress={handleSubmit}
          loading={loading}
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: 8,
    marginLeft: 2,
  },
  optionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.lg,
  },
  optionBtn: {
    flex: 1,
    minWidth: '30%',
    height: 40,
    minHeight: 40,
    paddingHorizontal: 4,
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
