import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { clockIn } from '../../src/services/api';

export default function LeaveRequest() {
  const { user } = useAuth();
  const router = useRouter();
  const [type, setType] = useState<'SICK' | 'LEAVE'>('SICK');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Error', 'Alasan harus diisi');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('userId', user!.id.toString());
      formData.append('status', type);
      // Note: In production, you might want a separate endpoint for leave requests
      
      await clockIn(formData);
      Alert.alert('Berhasil', `Pengajuan ${type === 'SICK' ? 'sakit' : 'izin'} berhasil`);
      router.back();
    } catch (error: any) {
      Alert.alert('Gagal', error.response?.data?.error || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pengajuan Izin/Sakit</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Jenis Pengajuan</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity 
            style={[styles.typeBtn, type === 'SICK' && styles.typeBtnActive]}
            onPress={() => setType('SICK')}
          >
            <Text style={[styles.typeBtnText, type === 'SICK' && styles.typeBtnTextActive]}>
              🤒 Sakit
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.typeBtn, type === 'LEAVE' && styles.typeBtnActive]}
            onPress={() => setType('LEAVE')}
          >
            <Text style={[styles.typeBtnText, type === 'LEAVE' && styles.typeBtnTextActive]}>
              📅 Izin
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Alasan</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Jelaskan alasan..."
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity 
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitBtnText}>
            {loading ? 'Mengirim...' : 'Kirim Pengajuan'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  backBtn: { color: '#3b82f6', fontSize: 16, marginRight: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 3 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 },
  typeRow: { flexDirection: 'row', marginBottom: 20 },
  typeBtn: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0', marginHorizontal: 4, alignItems: 'center' },
  typeBtnActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  typeBtnText: { fontSize: 16, color: '#64748b' },
  typeBtnTextActive: { color: '#3b82f6', fontWeight: '600' },
  textArea: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 20, minHeight: 120 },
  submitBtn: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: '#93c5fd' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
