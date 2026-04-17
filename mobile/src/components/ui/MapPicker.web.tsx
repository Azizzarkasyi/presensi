import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { theme } from '../../constants/theme';

// Fix for default marker icons in Leaflet with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapPickerProps {
  initialLatitude?: number | null;
  initialLongitude?: number | null;
  onSelect: (lat: number, lng: number) => void;
  onClose: () => void;
}

const MapEvents = ({ onLocationClick }: { onLocationClick: (e: L.LeafletMouseEvent) => void }) => {
  useMapEvents({
    click: onLocationClick,
  });
  return null;
};

export const MapPicker = ({ initialLatitude, initialLongitude, onSelect, onClose }: MapPickerProps) => {
  const [position, setPosition] = useState<L.LatLngExpression | null>(
    initialLatitude && initialLongitude ? [initialLatitude, initialLongitude] : null
  );

  const defaultCenter: L.LatLngExpression = position || [-6.200000, 106.816666]; // Default to Jakarta
  
  const handleMapClick = (e: L.LeafletMouseEvent) => {
    setPosition([e.latlng.lat, e.latlng.lng]);
  };

  const handleConfirm = () => {
    if (!position) return;
    
    if (Array.isArray(position)) {
      onSelect(position[0], position[1]);
    } else if ('lat' in (position as any)) {
      onSelect((position as any).lat, (position as any).lng);
    }
    
    onClose();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Buka Peta & Klik Titik Lokasi</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>Tutup Peta</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.mapContainer}>
        <MapContainer center={defaultCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEvents onLocationClick={handleMapClick} />
          {position && <Marker position={position} />}
        </MapContainer>
      </View>

      <View style={styles.footer}>
         <TouchableOpacity 
           style={[styles.confirmButton, !position && styles.disabledButton]} 
           onPress={handleConfirm}
           disabled={!position}
         >
           <Text style={styles.confirmText}>Pilih Titik Lokasi Ini</Text>
         </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 500,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fafafa'
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  closeButton: {
    padding: 6,
    paddingHorizontal: 12,
    backgroundColor: '#eee',
    borderRadius: 6,
  },
  closeText: {
    color: theme.colors.text.secondary,
    fontWeight: '600',
    fontSize: 12,
  },
  mapContainer: {
    flex: 1,
    minHeight: 400,
    zIndex: 0,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: '#fff'
  },
  confirmButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: theme.colors.border,
  },
  confirmText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  }
});
