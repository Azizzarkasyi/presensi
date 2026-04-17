import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { theme } from '../../constants/theme';

interface MapPickerProps {
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  onSelect: (lat: number, lng: number) => void;
  onClose: () => void;
}

export const MapPicker = ({ onClose }: MapPickerProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🚫🗺️</Text>
        <Text style={styles.title}>Peta Interaktif Belum Didukung</Text>
        <Text style={styles.subtitle}>
          Fitur geser-geser Peta Visual ini hanya tersedia di Web Dashboard (Akses Lewat Browser / Komputer). 
          Silakan gunakan fitur pencet &quot;Ambil Koordinat Perangkat&quot; di versi mobile.
        </Text>
        
        <TouchableOpacity style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
  },
  content: {
    alignItems: 'center',
    maxWidth: 300,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});
