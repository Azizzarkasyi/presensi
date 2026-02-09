import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

interface FaceCameraProps {
  onFaceDetected: (faceData: any, photoUri: string) => void;
  onCancel: () => void;
  mode: 'register' | 'verify';
}

export default function FaceCamera({ onFaceDetected, onCancel, mode }: FaceCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<any>(null);

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Aplikasi memerlukan akses kamera untuk pengenalan wajah
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Berikan Izin</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Batal</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const capturePhoto = async () => {
    if (!cameraRef.current || capturing) return;

    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
      });

      // Generate a simple descriptor based on timestamp and random values
      // In production, you would use a proper face recognition model
      const descriptor = generateSimpleDescriptor();

      onFaceDetected({ descriptor }, photo.uri);
    } catch (error) {
      console.error('Error capturing photo:', error);
      Alert.alert('Error', 'Gagal mengambil foto');
      setCapturing(false);
    }
  };

  // Generate a simple descriptor (placeholder for real face recognition)
  const generateSimpleDescriptor = (): number[] => {
    const descriptor = [];
    const timestamp = Date.now();
    
    // Generate 20 pseudo-random but consistent values
    for (let i = 0; i < 20; i++) {
      descriptor.push(Math.sin(timestamp + i * 1000) * 0.5 + 0.5);
    }
    
    return descriptor;
  };

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front"
      >
        {/* Overlay */}
        <View style={styles.overlay}>
          <View style={styles.faceFrame} />
          <Text style={styles.instructionText}>
            Posisikan wajah Anda dalam bingkai, lalu tekan tombol
          </Text>
        </View>
      </CameraView>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Batal</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.captureBtn, capturing && styles.captureBtnDisabled]}
          onPress={capturePhoto}
          disabled={capturing}
        >
          {capturing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.captureBtnText}>
              {mode === 'register' ? '📸 Daftar Wajah' : '✓ Verifikasi'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f1f5f9',
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#374151',
  },
  permissionButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 12,
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 14,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceFrame: {
    width: 250,
    height: 300,
    borderWidth: 3,
    borderColor: '#22c55e',
    borderRadius: 150,
    opacity: 0.9,
  },
  instructionText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  cancelBtn: {
    padding: 12,
  },
  cancelBtnText: {
    color: '#fff',
    fontSize: 16,
  },
  captureBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    minWidth: 160,
    alignItems: 'center',
  },
  captureBtnDisabled: {
    backgroundColor: '#6b7280',
  },
  captureBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

