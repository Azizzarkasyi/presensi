import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useResponsive } from '../../src/hooks/useResponsive';
import api from '../../src/services/api';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { isDesktop, isTablet, isWeb } = useResponsive();
  const [employeeCount, setEmployeeCount] = useState(0);
  const [presentCount, setPresentCount] = useState(0);
  const [activeTaskCount, setActiveTaskCount] = useState(0);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // Fetch Employees count
      const empRes = await api.get('/users');
      // Filter for current tenant ideally, but API might already filter. 
      // Assuming 'users' returns all users for the tenant if standard admin login.
      const employees = empRes.data.data || empRes.data; 
      // The API return format might vary, being safe here.
      // Based on controller, it likely returns array directly or inside data.
      setEmployeeCount(Array.isArray(employees) ? employees.length : 0);

      // Fetch Today's Attendance count
      // We need an endpoint for counting ALL present today, or reuse existing one.
      // api.getAllTodayAttendance() seems appropriate if it exists in services/api
      try {
         const attRes = await api.get('/attendance/admin/today'); // getAllTodayAttendance url
         const attendees = attRes.data.data || [];
         setPresentCount(attendees.length);
      } catch (e) { console.log('Attendance stats error', e);}

      // Fetch Active Tasks
      try {
         const taskRes = await api.get('/tasks', { params: { status: 'IN_PROGRESS' } });
         const tasks = taskRes.data.data || [];
         setActiveTaskCount(tasks.length);
      } catch (e) { console.log('Task stats error', e);}

    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const menuItems = [
    { icon: '👥', title: 'Karyawan', subtitle: `${employeeCount} terdaftar`, route: '/admin/employees' },
    { icon: '📋', title: 'Absensi', subtitle: 'Lihat rekap', route: '/admin/attendance' },
    { icon: '💰', title: 'Gaji', subtitle: 'Generate slip', route: '/admin/payroll' },
    { icon: '📝', title: 'Tugas', subtitle: 'Kelola tugas', route: '/admin/tasks' },
    { icon: '⚙️', title: 'Pengaturan', subtitle: 'Atur jam & istirahat', route: '/admin/settings' },
  ];

  return (
    <View style={[styles.container, isWeb && styles.containerWeb]}>
      {/* Sidebar for Desktop */}
      {isDesktop && (
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Admin Panel</Text>
          {menuItems.map((item, i) => (
            <TouchableOpacity key={i} style={styles.sidebarItem} onPress={() => router.push(item.route as any)}>
              <Text style={styles.sidebarItemText}>{item.icon} {item.title}</Text>
            </TouchableOpacity>
          ))}
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
            <Text style={[styles.title, isDesktop && styles.titleDesktop]}>Admin Perusahaan</Text>
            <Text style={styles.welcome}>Halo, {user?.name}!</Text>
          </View>
          {!isDesktop && (
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Menu Grid (Mobile/Tablet only) */}
        {!isDesktop && (
          <View style={[styles.menu, isTablet && styles.menuTablet]}>
            {menuItems.map((item, i) => (
              <TouchableOpacity 
                key={i}
                style={[styles.menuCard, isTablet && styles.menuCardTablet]}
                onPress={() => router.push(item.route as any)}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Stats for Desktop */}
        {isDesktop && (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{employeeCount}</Text>
              <Text style={styles.statLabel}>Total Karyawan</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{presentCount}</Text>
              <Text style={styles.statLabel}>Hadir Hari Ini</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{activeTaskCount}</Text>
              <Text style={styles.statLabel}>Tugas Aktif</Text>
            </View>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.addButton, isDesktop && styles.addButtonDesktop]}
          onPress={() => router.push('/admin/add-employee')}
        >
          <Text style={styles.addButtonText}>+ Tambah Karyawan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  containerWeb: { flexDirection: 'row', minHeight: '100vh' as any, padding: 0 },
  sidebar: { 
    width: 250, 
    backgroundColor: '#1e293b', 
    padding: 24,
    minHeight: '100vh' as any,
  },
  sidebarTitle: { color: '#f1f5f9', fontSize: 20, fontWeight: 'bold', marginBottom: 24 },
  sidebarItem: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginBottom: 4 },
  sidebarItemText: { color: '#f1f5f9', fontSize: 15 },
  sidebarSpacer: { flex: 1 },
  sidebarLogout: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#374151' },
  sidebarLogoutText: { color: '#fca5a5', fontSize: 15 },
  main: { flex: 1, padding: 16 },
  mainDesktop: { padding: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  titleDesktop: { fontSize: 32 },
  welcome: { fontSize: 16, color: '#64748b', marginTop: 4 },
  logoutBtn: { padding: 8 },
  logoutText: { color: '#ef4444', fontWeight: '600' },
  menu: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  menuTablet: { gap: 16 as any },
  menuCard: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '48%', marginBottom: 12, elevation: 2, alignItems: 'center' },
  menuCardTablet: { width: 'calc(25% - 12px)' as any },
  menuIcon: { fontSize: 32, marginBottom: 8 },
  menuTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
  menuSubtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },
  statsGrid: { flexDirection: 'row', gap: 20 as any, marginBottom: 24 },
  statCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, flex: 1, elevation: 2 },
  statValue: { fontSize: 36, fontWeight: 'bold', color: '#3b82f6' },
  statLabel: { fontSize: 14, color: '#64748b', marginTop: 4 },
  addButton: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  addButtonDesktop: { alignSelf: 'flex-start', paddingHorizontal: 32 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
