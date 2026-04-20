import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
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
  const [errorMessage, setErrorMessage] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!formData.name.trim()) newErrors.name = 'Nama Perusahaan wajib diisi';
    if (!formData.adminName.trim()) newErrors.adminName = 'Nama Admin wajib diisi';
    
    if (!formData.adminEmail.trim()) {
      newErrors.adminEmail = 'Email wajib diisi';
    } else if (!emailRegex.test(formData.adminEmail.trim())) {
      newErrors.adminEmail = 'Format email tidak valid';
    }
    
    if (!formData.adminPassword) {
      newErrors.adminPassword = 'Password wajib diisi';
    } else if (formData.adminPassword.length < 6) {
      newErrors.adminPassword = 'Password minimal 6 karakter';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setErrorMessage('Mohon periksa kembali form Anda');
      return;
    }

    setErrorMessage('');

    setLoading(true);
    try {
      const res = await createTenant(formData);
      if (res.data.success) {
        setSuccess(true);
      }
    } catch (error: any) {
      console.error('Create tenant error:', error);
      const msg = error.response?.data?.message || 'Gagal membuat perusahaan. Pastikan nama tidak duplikat.';
      setErrorMessage(msg);
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
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Card>
            <Input
              label="Nama Perusahaan"
              placeholder="Contoh: PT. Maju Jaya"
              value={formData.name}
              onChangeText={(text) => { setFormData(prev => ({ ...prev, name: text })); setErrors({...errors, name: ''}); }}
              error={errors.name}
            />

            <Input
              label="Nama Admin"
              placeholder="Nama Lengkap Admin"
              value={formData.adminName}
              onChangeText={(text) => { setFormData(prev => ({ ...prev, adminName: text })); setErrors({...errors, adminName: ''}); }}
              error={errors.adminName}
            />

            <Input
              label="Email Admin"
              placeholder="admin@perusahaan.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.adminEmail}
              onChangeText={(text) => { setFormData(prev => ({ ...prev, adminEmail: text })); setErrors({...errors, adminEmail: ''}); }}
              hint="Email ini akan digunakan untuk login admin"
              error={errors.adminEmail}
            />

            <Input
              label="Password Admin"
              placeholder="Minimal 6 karakter"
              secureTextEntry
              value={formData.adminPassword}
              onChangeText={(text) => { setFormData(prev => ({ ...prev, adminPassword: text })); setErrors({...errors, adminPassword: ''}); }}
              error={errors.adminPassword}
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
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f87171',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});
