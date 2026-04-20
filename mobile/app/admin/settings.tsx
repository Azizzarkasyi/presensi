import { View, Text, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
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
import { MapPicker } from '../../src/components/ui/MapPicker';

export default function AdminSettings() {
  const { user } = useAuth();
  const router = useRouter();
  const { isDesktop, isWeb } = useResponsive();
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [config, setConfig] = useState<any>({
    maxBreakMinutesPerDay: 60,
    lateThresholdMinutes: 15,
    overtimeRateMultiplier: 1.5,
    officeLatitude: null,
    officeLongitude: null,
    allowedRadiusMeters: 50,
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
      console.error('Save config error:', error);
      Alert.alert('Gagal', error.response?.data?.message || error.response?.data?.error || error.message || 'Gagal menyimpan pengaturan');
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
            <Text style={styles.sectionTitle}>⏰ Waktu Kerja</Text>

            <Input
              label="Toleransi Keterlambatan (menit)"
              value={(config.lateThresholdMinutes ?? 0).toString()}
              onChangeText={(text) => setConfig({ ...config, lateThresholdMinutes: parseInt(text) || 0 })}
              keyboardType="numeric"
              placeholder="15"
              hint={`Karyawan dianggap telat jika absen setelah jadwal masuk mereka + ${config.lateThresholdMinutes} menit`}
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

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>📍 Jangkauan Lokasi M-Absen</Text>
            
            {config.officeLatitude && config.officeLongitude ? (
               <View style={{ marginBottom: 16 }}>
                 <Text style={styles.label}>Koordinat Tersimpan</Text>
                 <Text style={{ color: theme.colors.text.secondary }}>
                   {config.officeLatitude}, {config.officeLongitude}
                 </Text>
               </View>
            ) : (
               <View style={{ marginBottom: 16 }}>
                 <Text style={{ color: theme.colors.text.light, fontStyle: 'italic' }}>
                   Belum ada lokasi yang diatur
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
              label="Maksimal Radius (meter)"
              value={(config.allowedRadiusMeters ?? 50).toString()}
              onChangeText={(text) => setConfig({ ...config, allowedRadiusMeters: parseInt(text) || 0 })}
              keyboardType="numeric"
              placeholder="50"
              hint="Karyawan tidak bisa absen jika jarak ke kantor melebihi batas meter di atas."
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

      {/* Map Picker Modal */}
      <Modal visible={showMapPicker} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
           <View style={[styles.mapModalContainer, isDesktop && styles.mapModalDesktop]}>
              <MapPicker 
                 initialLatitude={config.officeLatitude}
                 initialLongitude={config.officeLongitude}
                 onClose={() => setShowMapPicker(false)}
                 onSelect={(lat, lng) => {
                    setConfig({ ...config, officeLatitude: lat, officeLongitude: lng });
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
  containerWeb: {
    minHeight: '100vh' as any, // removed 'as any' since styles.create treats it loosely or we ignore specific web types here
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: 8,
    marginLeft: 2,
  },
  flex1: {
    flex: 1,
  },
  saveBtn: {
    marginTop: 8,
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

