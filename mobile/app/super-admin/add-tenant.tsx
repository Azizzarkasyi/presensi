import { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useResponsive } from '../../src/hooks/useResponsive';
import { createTenant } from '../../src/services/api';
import { theme } from '../../src/constants/theme';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { SuccessModal } from '../../src/components/ui/SuccessModal';

export default function AddTenant() {
  const router = useRouter();
  const { isDesktop, isWeb } = useResponsive();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.adminName || !formData.adminEmail || !formData.adminPassword) {
      Alert.alert('Eror', 'Semua field wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const res = await createTenant(formData);
      if (res.data.success) {
        setSuccess(true);
      }
    } catch (error: any) {
      console.error('Create tenant error:', error);
      const msg = error.response?.data?.message || 'Gagal membuat perusahaan';
      Alert.alert('Gagal', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    setSuccess(false);
    router.replace('/super-admin');
  };

  return (
    <View style={[styles.container, isWeb && styles.containerWeb]}>
      <ScreenHeader title="Tambah Perusahaan Baru" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.contentWrapper, isDesktop && styles.contentDesktop]}>
          <Card>
            <Input
              label="Nama Perusahaan"
              placeholder="Contoh: PT. Maju Jaya"
              value={formData.name}
              onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
            />

            <Input
              label="Nama Admin"
              placeholder="Nama Lengkap Admin"
              value={formData.adminName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, adminName: text }))}
            />

            <Input
              label="Email Admin"
              placeholder="admin@perusahaan.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.adminEmail}
              onChangeText={(text) => setFormData(prev => ({ ...prev, adminEmail: text }))}
              hint="Email ini akan digunakan untuk login admin"
            />

            <Input
              label="Password Admin"
              placeholder="Minimal 6 karakter"
              secureTextEntry
              value={formData.adminPassword}
              onChangeText={(text) => setFormData(prev => ({ ...prev, adminPassword: text }))}
            />

            <Button
              title="Simpan & Buat Perusahaan"
              onPress={handleSubmit}
              loading={loading}
              size="lg"
              style={styles.submitBtn}
            />
          </Card>
        </View>
      </ScrollView>

      <SuccessModal
        visible={success}
        title="Berhasil!"
        message="Perusahaan baru dan akun admin berhasil dibuat."
        buttonText="Kembali ke Dashboard"
        onClose={handleCloseSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  containerWeb: {
    minHeight: '100vh',
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  contentWrapper: {
    width: '100%',
  },
  contentDesktop: {
    maxWidth: 600,
    alignSelf: 'center',
  },
  submitBtn: {
    marginTop: theme.spacing.md,
  },
});
