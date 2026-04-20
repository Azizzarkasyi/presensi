import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { requestLeave } from '../../src/services/api';
import { useResponsive } from '../../src/hooks/useResponsive';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { theme } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { SuccessModal } from '../../src/components/ui/SuccessModal';

export default function LeaveRequest() {
  const router = useRouter();
  const { isDesktop, isWeb } = useResponsive();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [status, setStatus] = useState<'SICK' | 'LEAVE'>('SICK');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const pickImage = async (useCamera: boolean = false) => {
    try {
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan akses kamera lho.');
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          setPhotoUri(result.assets[0].uri);
        }
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          setPhotoUri(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Gagal', 'Tidak dapat memuat gambar');
    }
  };

  const handleSubmit = async () => {
    if (!photoUri) {
      Alert.alert('Peringatan', 'Anda wajib melampirkan foto / surat bukti!');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('status', status);

      // Handle file upload
      const fallbackName = `document-${Date.now()}.jpg`;
      let filename = fallbackName;
      let type = 'image/jpeg';
      
      if (isWeb) {
        // Fetch blob from blob URL for web React Native Image Picker
        const res = await fetch(photoUri);
        const blob = await res.blob();
        formData.append('photo', blob as any, fallbackName);
      } else {
        // Mobile platform handling
        filename = photoUri.split('/').pop() || fallbackName;
        const match = /\.(\w+)$/.exec(filename);
        type = match ? `image/${match[1]}` : `image`;
        formData.append('photo', {
          uri: photoUri,
          name: filename,
          type,
        } as any);
      }

      await requestLeave(formData);
      setSuccess(true);
    } catch (error: any) {
      console.error('Request leave error:', error);
      const msg = error.response?.data?.message || 'Gagal mengajukan izin';
      Alert.alert('Gagal', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    setSuccess(false);
    router.replace('/');
  };

  return (
    <View style={[styles.container, isWeb && styles.containerWeb]}>
      <ScreenHeader title="Pengajuan Izin & Sakit" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.contentWrapper, isDesktop && styles.contentDesktop]}>
          <Card>
            <Text style={styles.label}>Pilih Kategori:</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.statusBox, status === 'SICK' && styles.statusBoxActive]}
                onPress={() => setStatus('SICK')}
              >
                <Ionicons name="medkit-outline" size={24} color={status === 'SICK' ? theme.colors.primary : '#64748b'} />
                <Text style={[styles.statusText, status === 'SICK' && styles.statusTextActive]}>Sakit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.statusBox, status === 'LEAVE' && styles.statusBoxActive]}
                onPress={() => setStatus('LEAVE')}
              >
                <Ionicons name="airplane-outline" size={24} color={status === 'LEAVE' ? theme.colors.primary : '#64748b'} />
                <Text style={[styles.statusText, status === 'LEAVE' && styles.statusTextActive]}>Izin / Cuti</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <Text style={styles.label}>Lampirkan Bukti (Surat Dokter / Dokumen):</Text>
            {photoUri ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => setPhotoUri(null)}>
                  <Ionicons name="close-circle" size={28} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.row}>
                <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage(true)}>
                  <Ionicons name="camera-outline" size={24} color="#64748b" />
                  <Text style={styles.uploadText}>Kamera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.uploadBtn} onPress={() => pickImage(false)}>
                  <Ionicons name="image-outline" size={24} color="#64748b" />
                  <Text style={styles.uploadText}>Galeri</Text>
                </TouchableOpacity>
              </View>
            )}

            <Button
              title="Kirim Pengajuan"
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
        title="Berhasil Terkirim"
        message="Pengajuan Izin / Sakit Anda telah berhasil dicatat."
        buttonText="Ke Dashboard"
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
    minHeight: '100vh' as any,
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  statusBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    gap: 8,
  },
  statusBoxActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  statusTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 20,
  },
  uploadBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#fff',
    gap: 8,
  },
  uploadText: {
    color: '#64748b',
    fontSize: 14,
  },
  photoPreviewContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: 4/3,
    backgroundColor: '#e2e8f0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
  },
  submitBtn: {
    marginTop: 24,
  },
});
