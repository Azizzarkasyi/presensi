import { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { useResponsive } from '../src/hooks/useResponsive';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTenantModal, setShowTenantModal] = useState(false);
  
  const { 
    login, 
    loginWithTenant, 
    requireTenantSelection, 
    availableTenants,
    clearTenantSelection,
  } = useAuth();
  const router = useRouter();
  const { isDesktop, isTablet, isWeb } = useResponsive();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email dan password harus diisi');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (error: any) {
      if (error.message === 'TENANT_SELECTION_REQUIRED') {
        // Show tenant selection modal
        setShowTenantModal(true);
      } else {
        const message = error.response?.data?.message || error.message || 'Terjadi kesalahan';
        Alert.alert('Login Gagal', message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTenantSelect = async (tenantId: number) => {
    setShowTenantModal(false);
    setLoading(true);
    try {
      await loginWithTenant(email, password, tenantId);
      router.replace('/');
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Terjadi kesalahan';
      Alert.alert('Login Gagal', message);
    } finally {
      setLoading(false);
    }
  };

  const closeTenantModal = () => {
    setShowTenantModal(false);
    clearTenantSelection();
  };

  return (
    <ScrollView 
      contentContainerStyle={[styles.container, isWeb && styles.containerWeb]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Tenant Selection Modal */}
      <Modal
        visible={showTenantModal}
        transparent
        animationType="fade"
        onRequestClose={closeTenantModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Pilih Perusahaan</Text>
            <Text style={styles.modalSubtitle}>
              Email Anda terdaftar di beberapa perusahaan
            </Text>
            <FlatList
              data={availableTenants}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.tenantItem}
                  onPress={() => handleTenantSelect(item.id)}
                >
                  <Text style={styles.tenantName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={closeTenantModal}
            >
              <Text style={styles.cancelButtonText}>Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={[
        styles.card, 
        isTablet && styles.cardTablet,
        isDesktop && styles.cardDesktop
      ]}>
        <Text style={[styles.title, isDesktop && styles.titleDesktop]}>
          Absensi App
        </Text>
        <Text style={styles.subtitle}>Multi-Tenant Attendance System</Text>

        {/* Login Form */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, isWeb && styles.inputWeb]}
            placeholder="Masukkan email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={[styles.input, isWeb && styles.inputWeb]}
            placeholder="Masukkan password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[
            styles.button, 
            loading && styles.buttonDisabled, 
            isWeb && styles.buttonWeb
          ]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Login</Text>
          )}
        </TouchableOpacity>

        {/* Demo Credentials */}
        <View style={styles.demoCredentials}>
          <Text style={styles.demoTitle}>Demo Credentials:</Text>
          <Text style={styles.demoText}>Admin: admin@demo.com / admin123</Text>
          <Text style={styles.demoText}>Leader: leader@demo.com / leader123</Text>
          <Text style={styles.demoText}>User: user@demo.com / user123</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f1f5f9',
  },
  containerWeb: {
    alignItems: 'center',
    minHeight: '100vh' as any,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    width: '100%',
  },
  cardTablet: {
    maxWidth: 400,
  },
  cardDesktop: {
    maxWidth: 450,
    padding: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1e293b',
    marginBottom: 4,
  },
  titleDesktop: {
    fontSize: 36,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#64748b',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
  },
  inputWeb: {
    outlineStyle: 'none' as any,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonWeb: {
    cursor: 'pointer' as any,
  },
  buttonDisabled: {
    backgroundColor: '#93c5fd',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  demoCredentials: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  demoText: {
    fontSize: 11,
    color: '#92400e',
    marginBottom: 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  tenantItem: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  tenantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  cancelButton: {
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 14,
  },
});
