import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as apiLogin, loginWithTenant as apiLoginWithTenant } from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  photo?: string;
  faceRegistered?: boolean;
  salaryType?: string;
  salary?: number;
  startWorkTime?: string;
}

interface Tenant {
  id: number;
  name: string;
}

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  isLoading: boolean;
  isSuperAdmin: boolean;
  requireTenantSelection: boolean;
  availableTenants: Tenant[];
  login: (email: string, password: string) => Promise<void>;
  loginWithTenant: (email: string, password: string, tenantId: number) => Promise<void>;
  logout: () => Promise<void>;
  clearTenantSelection: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenantState] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [requireTenantSelection, setRequireTenantSelection] = useState(false);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);

  useEffect(() => {
    loadStoredData();
  }, []);

  const loadStoredData = async () => {
    try {
      const [userData, tenantData, superAdminFlag] = await Promise.all([
        AsyncStorage.getItem('user'),
        AsyncStorage.getItem('tenant'),
        AsyncStorage.getItem('isSuperAdmin'),
      ]);

      if (userData) {
        setUser(JSON.parse(userData));
      }
      if (tenantData) {
        setTenantState(JSON.parse(tenantData));
      }
      if (superAdminFlag === 'true') {
        setIsSuperAdmin(true);
      }
    } catch (error) {
      console.error('Error loading stored data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await apiLogin(email, password);
    
    if (response.data.success) {
      // Check if tenant selection is required
      if (response.data.requireTenantSelection) {
        setAvailableTenants(response.data.data.tenants);
        setRequireTenantSelection(true);
        throw new Error('TENANT_SELECTION_REQUIRED');
      }

      // Succeeded
      const { token, user: userData, tenant: tenantData, isSuperAdmin: isSuperAdminResp } = response.data.data;
      
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      if (tenantData) {
        await AsyncStorage.setItem('tenant', JSON.stringify(tenantData));
        await AsyncStorage.setItem('tenantId', String(tenantData.id));
        setTenantState(tenantData);
      } else {
        // Clear tenant data if not present (e.g. Super Admin)
        await AsyncStorage.removeItem('tenant');
        await AsyncStorage.removeItem('tenantId');
        setTenantState(null);
      }
      
      const superAdminStatus = String(!!isSuperAdminResp); // "true" or "false"
      await AsyncStorage.setItem('isSuperAdmin', superAdminStatus);
      
      setUser(userData);
      setIsSuperAdmin(!!isSuperAdminResp);
      setRequireTenantSelection(false);
    } else {
      throw new Error(response.data.message || 'Login gagal');
    }
  };

  const loginWithTenant = async (email: string, password: string, tenantId: number) => {
    const response = await apiLoginWithTenant(email, password, tenantId);
    
    if (response.data.success) {
      const { token, user: userData, tenant: tenantData } = response.data.data;
      
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('tenant', JSON.stringify(tenantData));
      await AsyncStorage.setItem('tenantId', String(tenantData.id));
      await AsyncStorage.setItem('isSuperAdmin', 'false');
      
      setUser(userData);
      setTenantState(tenantData);
      setIsSuperAdmin(false);
      setRequireTenantSelection(false);
      setAvailableTenants([]);
    } else {
      throw new Error(response.data.message || 'Login gagal');
    }
  };

  const clearTenantSelection = () => {
    setRequireTenantSelection(false);
    setAvailableTenants([]);
  };

  const logout = async () => {
    await AsyncStorage.multiRemove([
      'user',
      'token',
      'tenant',
      'tenantId',
      'isSuperAdmin',
    ]);
    setUser(null);
    setTenantState(null);
    setIsSuperAdmin(false);
    setRequireTenantSelection(false);
    setAvailableTenants([]);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        isLoading,
        isSuperAdmin,
        requireTenantSelection,
        availableTenants,
        login,
        loginWithTenant,
        logout,
        clearTenantSelection,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
