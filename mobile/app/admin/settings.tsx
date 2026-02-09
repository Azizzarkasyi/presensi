import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useResponsive } from '../../src/hooks/useResponsive';
import { getCompanyConfig, updateCompanyConfig } from '../../src/services/api';

// UI Components
import { theme } from '../../src/constants/theme';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { SuccessModal } from '../../src/components/ui/SuccessModal';

export default function AdminSettings() {
  const { user } = useAuth();
  const router = useRouter();
  const { isDesktop, isWeb } = useResponsive();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [config, setConfig] = useState({
    maxBreakMinutesPerDay: 60,
    lateThresholdMinutes: 15,
    overtimeRateMultiplier: 1.5,
    workStartTime: '09:00',
    workEndTime: '17:00',
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await getCompanyConfig();
      if (res.data) {
        // Merge with defaults to ensure no keys are missing
        setConfig(prev => ({ ...prev, ...res.data }));
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateCompanyConfig(config);
      setShowSuccessModal(true);
    } catch (error: any) {
      Alert.alert('Gagal', error.response?.data?.error || 'Gagal menyimpan pengaturan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, isWeb && styles.containerWeb]}>
      <ScreenHeader title="Pengaturan Perusahaan" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.contentWrapper, isDesktop && styles.contentDesktop]}>
          
          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>⏰ Jam Kerja</Text>
            
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Input
                  label="Jam Masuk"
                  value={config.workStartTime || ''}
                  onChangeText={(text) => setConfig({ ...config, workStartTime: text })}
                  placeholder="09:00"
                />
              </View>
              <View style={{ width: 12 }} />
              <View style={styles.flex1}>
                <Input
                  label="Jam Pulang"
                  value={config.workEndTime || ''}
                  onChangeText={(text) => setConfig({ ...config, workEndTime: text })}
                  placeholder="17:00"
                />
              </View>
            </View>

            <Input
              label="Toleransi Keterlambatan (menit)"
              value={(config.lateThresholdMinutes ?? 0).toString()}
              onChangeText={(text) => setConfig({ ...config, lateThresholdMinutes: parseInt(text) || 0 })}
              keyboardType="numeric"
              placeholder="15"
              hint={`Karyawan dianggap telat jika absen setelah jam ${config.workStartTime} + ${config.lateThresholdMinutes} menit`}
            />
          </Card>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>☕ Istirahat</Text>
            
            <Input
              label="Maks. Istirahat / Hari (menit)"
              value={(config.maxBreakMinutesPerDay ?? 0).toString()}
              onChangeText={(text) => setConfig({ ...config, maxBreakMinutesPerDay: parseInt(text) || 0 })}
              keyboardType="numeric"
              placeholder="60"
              hint="Batas total waktu istirahat akumulatif per hari"
            />
          </Card>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>💰 Lembur</Text>
            
            <Input
              label="Pengali Gaji Lembur"
              value={(config.overtimeRateMultiplier ?? 0).toString()}
              onChangeText={(text) => setConfig({ ...config, overtimeRateMultiplier: parseFloat(text) || 0 })}
              keyboardType="decimal-pad"
              placeholder="1.5"
              hint={`Rumus: Gaji per jam × ${config.overtimeRateMultiplier}`}
            />
          </Card>

          <Button
            title="Simpan Pengaturan"
            onPress={handleSave}
            loading={loading}
            size="lg"
            style={styles.saveBtn}
          />
          
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      <SuccessModal
        visible={showSuccessModal}
        message="Pengaturan perusahaan berhasil diperbarui."
        onClose={() => setShowSuccessModal(false)}
        buttonText="OK"
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
    minHeight: '100vh', // removed 'as any' since styles.create treats it loosely or we ignore specific web types here
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
  card: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
  },
  flex1: {
    flex: 1,
  },
  saveBtn: {
    marginTop: 8,
  },
});

