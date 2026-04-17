import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { getSuperAdminTenants, updateTenant, deleteTenant } from '../../src/services/api';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { useResponsive } from '../../src/hooks/useResponsive';
import { ScreenHeader } from '../../src/components/ui/ScreenHeader';
import { theme } from '../../src/constants/theme';
import { Card } from '../../src/components/ui/Card';

interface Tenant {
  id: number;
  name: string;
  adminName: string;
  adminEmail: string;
  isActive: boolean;
  createdAt: string;
  _count?: { users: number };
}

export default function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { isDesktop, isTablet, isWeb } = useResponsive();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const res = await getSuperAdminTenants();
      if (res.data && res.data.data) {
        setTenants(res.data.data);
      } else if (Array.isArray(res.data)) {
        setTenants(res.data);
      }
    } catch (error) {
      console.error('Error loading tenants:', error);
      Alert.alert('Error', 'Gagal memuat data perusahaan');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingId(tenant.id);
    setEditName(tenant.name);
  };

  const saveEdit = async (id: number) => {
    try {
      if (!editName) return;
      await updateTenant(id, { name: editName });
      setEditingId(null);
      loadTenants();
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Gagal mengedit';
      Alert.alert('Error', msg);
    }
  };

  const executeDelete = async (id: number) => {
    try {
      await deleteTenant(id);
      loadTenants();
    } catch (error) {
      Alert.alert('Error', 'Gagal menghapus perusahaan');
    }
  };

  const confirmDelete = (id: number) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Hapus perusahaan ini secara permanen beserta seluruh datanya?')) {
        executeDelete(id);
      }
    } else {
      Alert.alert('Konfirmasi', 'Hapus perusahaan ini?', [
        { text: 'Batal', style: 'cancel' },
        { text: 'Hapus', style: 'destructive', onPress: () => executeDelete(id) }
      ]);
    }
  };

  return (
    <View style={[styles.container, isWeb && styles.containerWeb]}>
      {/* Sidebar for Desktop */}
      {isDesktop && (
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Super Admin</Text>
          <TouchableOpacity style={styles.sidebarItem}>
            <Text style={styles.sidebarItemText}>🏢 Perusahaan</Text>
          </TouchableOpacity>
          <View style={styles.sidebarSpacer} />
          <TouchableOpacity onPress={handleLogout} style={styles.sidebarLogout}>
            <Text style={styles.sidebarLogoutText}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content */}
      <View style={[styles.main, isDesktop && styles.mainDesktop]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, isDesktop && styles.titleDesktop]}>Dashboard Super Admin</Text>
            <Text style={styles.welcome}>Halo, {user?.name}!</Text>
          </View>
          {!isDesktop && (
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.actionsBar}>
          <Text style={styles.subtitle}>Daftar Perusahaan Terdaftar</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push('/super-admin/add-tenant')}
          >
            <Text style={styles.addButtonText}>+ Tambah Perusahaan</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.grid, isDesktop && styles.gridDesktop, isTablet && styles.gridTablet]}>
            {tenants.map((item) => (
              <Card 
                key={item.id}
                style={[styles.card, isDesktop && styles.cardDesktop, isTablet && styles.cardTablet]}
              >
                <View style={styles.cardHeader}>
                  {editingId === item.id ? (
                    <View style={{ flex: 1, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <Input 
                        value={editName}
                        onChangeText={setEditName}
                        style={{ flex: 1, marginBottom: 0 }}
                        placeholder="Nama Baru"
                      />
                      <TouchableOpacity onPress={() => saveEdit(item.id)} style={[styles.badge, styles.badgeSuccess]}>
                        <Text style={styles.textSuccess}>Simpan</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setEditingId(null)} style={[styles.badge]}>
                        <Text style={{color: '#64748b'}}>Batal</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.companyName}>{item.name}</Text>
                      <View style={[styles.badge, item.isActive ? styles.badgeSuccess : styles.badgeError]}>
                        <Text style={[styles.badgeText, item.isActive ? styles.textSuccess : styles.textError]}>
                          {item.isActive ? 'Aktif' : 'Non-Aktif'}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
                
                <View style={styles.cardInfo}>
                  <Text style={styles.infoLabel}>Admin:</Text>
                  <Text style={styles.infoValue}>{item.adminName}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>{item.adminEmail}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.infoLabel}>Terdaftar:</Text>
                  <Text style={styles.infoValue}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                </View>

                {editingId !== item.id && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity onPress={() => handleEdit(item)} style={styles.editBtn}>
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete(item.id)} style={styles.deleteBtn}>
                      <Text style={styles.deleteBtnText}>Hapus</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Card>
            ))}
            
            {tenants.length === 0 && !loading && (
              <Text style={styles.emptyText}>Belum ada perusahaan yang terdaftar.</Text>
            )}
            
            {loading && <Text style={styles.emptyText}>Memuat data...</Text>}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  containerWeb: { flexDirection: 'row', minHeight: '100vh' as any }, // Removed padding: 0 to check
  sidebar: { 
    width: 250, 
    backgroundColor: '#1e293b', 
    padding: 24,
    minHeight: '100vh' as any,
  },
  sidebarTitle: { color: '#f1f5f9', fontSize: 20, fontWeight: 'bold', marginBottom: 24 },
  sidebarItem: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginBottom: 4, backgroundColor: '#334155' },
  sidebarItemText: { color: '#f1f5f9', fontSize: 15, fontWeight: '500' },
  sidebarSpacer: { flex: 1 },
  sidebarLogout: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#374151' },
  sidebarLogoutText: { color: '#fca5a5', fontSize: 15 },
  main: { flex: 1, padding: 16 },
  mainDesktop: { padding: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { ...theme.typography.h2, color: theme.colors.text.primary },
  titleDesktop: { ...theme.typography.h1 },
  welcome: { fontSize: 16, color: theme.colors.text.secondary, marginTop: 4 },
  logoutBtn: { padding: 8 },
  logoutText: { color: theme.colors.status.error, fontWeight: '600' },
  actionsBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 },
  subtitle: { ...theme.typography.h3, color: theme.colors.text.primary },
  scrollContent: { paddingBottom: 32 },
  grid: { flexDirection: 'column', gap: 16 },
  gridTablet: { flexDirection: 'row', flexWrap: 'wrap' },
  gridDesktop: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  card: { width: '100%', marginBottom: 0 },
  cardTablet: { width: '48%' }, // calc helper not strictly needed with simple percentage in RN web sometimes, but flex basis better. 
  // Using simple percentage for simplicity in RN:
  cardDesktop: { width: '32%' },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  companyName: { fontSize: 18, fontWeight: 'bold', color: theme.colors.text.primary },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#e2e8f0' },
  badgeSuccess: { backgroundColor: '#dcfce7' },
  badgeError: { backgroundColor: '#fee2e2' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  textSuccess: { color: '#166534' },
  textError: { color: '#991b1b' },
  
  cardInfo: { flexDirection: 'row', marginBottom: 8 },
  infoLabel: { width: 80, color: theme.colors.text.secondary, fontSize: 14 },
  infoValue: { flex: 1, color: theme.colors.text.primary, fontSize: 14, fontWeight: '500' },
  
  emptyText: { textAlign: 'center', color: theme.colors.text.secondary, marginTop: 40, width: '100%' },
  addButton: { backgroundColor: theme.colors.primary, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16 },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 16 },
  editBtn: { flex: 1, backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderWidth: 1, padding: 8, borderRadius: 6, alignItems: 'center' },
  editBtnText: { color: theme.colors.primary, fontWeight: '500' },
  deleteBtn: { flex: 1, backgroundColor: '#fee2e2', padding: 8, borderRadius: 6, alignItems: 'center' },
  deleteBtnText: { color: theme.colors.status.error, fontWeight: '500' },
});
