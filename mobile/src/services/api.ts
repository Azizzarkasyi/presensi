import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Detect platform for correct API URL
const getApiUrl = () =>{
  return 'https://api-presensi.yexsx.my.id/api';
}

const api = axios.create({
  baseURL: getApiUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token and tenant ID to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Add tenant ID header
  const tenantId = await AsyncStorage.getItem('tenantId');
  if (tenantId) {
    config.headers['X-Tenant-ID'] = tenantId;
  }
  
  return config;
});

export default api;

// ============================================
// Auth Endpoints (no tenant selection needed)
// ============================================

// Auto-login - finds tenant from email automatically
export const login = (email: string, password: string) =>
  api.post('/auth/auto-login', { email, password });

// Login with specific tenant (when email exists in multiple tenants)
export const loginWithTenant = (email: string, password: string, tenantId: number) =>
  api.post('/auth/login-with-tenant', { email, password, tenantId });

// Get list of available tenants (for reference)
export const getTenants = () => api.get('/tenants');

// Super Admin login
export const superAdminLogin = (email: string, password: string) =>
  api.post('/super-admin/login', { email, password });

// ============================================
// Tenant-specific Endpoints
// ============================================

export const getProfile = () => api.get('/users/profile');

export const updateProfile = (data: FormData) =>
  api.put('/users/profile', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// Users (Admin only)
export const getUsers = () => api.get('/users');

export const getUserById = (id: number) => api.get(`/users/${id}`);

export const createUser = (data: any) => api.post('/users', data);

export const updateUser = (userId: number, data: any) => 
  api.put(`/users/${userId}`, data);

export const deleteUser = (userId: number) => api.delete(`/users/${userId}`);

// Attendance
export const clockIn = (data: FormData) => 
  api.post('/attendance/clock-in', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const clockOut = (data: FormData) => 
  api.post('/attendance/clock-out', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getTodayAttendance = () => api.get('/attendance/today');

export const getAttendanceHistory = (params?: { page?: number; limit?: number }) =>
  api.get('/attendance/history', { params });

export const getAttendanceStatistics = (params?: { month?: number; year?: number }) =>
  api.get('/attendance/statistics', { params });

// Admin attendance endpoints
export const getAllTodayAttendance = () => api.get('/attendance/admin/today');

export const getAttendanceReport = (params?: { startDate?: string; endDate?: string; userId?: number }) =>
  api.get('/attendance/admin/report', { params });

// Break Management
export const startBreak = (data: FormData) =>
  api.post('/break/start', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const endBreak = (data: FormData) =>
  api.post('/break/end', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getTodayBreaks = () => api.get('/break/today');

export const getBreakHistory = (params?: { page?: number; limit?: number }) =>
  api.get('/break/history', { params });

// Face Recognition
export const registerFace = (data: FormData) =>
  api.post('/face/register', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const verifyFace = (faceDescriptor: number[]) =>
  api.post('/face/verify', { faceDescriptor });

export const getFaceStatus = () => api.get('/face/status');

export const deleteFace = () => api.delete('/face');

// Company Config
export const getCompanyConfig = () => api.get('/config');

export const updateCompanyConfig = (data: any) => api.put('/config', data);

// Tasks
export const getMyTasks = (params?: { status?: string }) =>
  api.get('/tasks/my', { params });

export const getTasks = (params?: { status?: string; assigneeId?: number }) =>
  api.get('/tasks', { params });

export const getTaskById = (id: number) => api.get(`/tasks/${id}`);

export const createTask = (data: any) => api.post('/tasks', data);

export const updateTask = (id: number, data: any) => api.put(`/tasks/${id}`, data);

export const updateTaskStatus = (id: number, status: string) =>
  api.patch(`/tasks/${id}/status`, { status });

export const deleteTask = (id: number) => api.delete(`/tasks/${id}`);

// Payroll
export const getMyPayrolls = () => api.get('/payroll/my');

export const getAllPayrolls = (params?: { periodStart?: string; periodEnd?: string }) =>
  api.get('/payroll', { params });

export const generatePayroll = (data: any) => api.post('/payroll/generate', data);

export const getPayrollById = (id: number) => api.get(`/payroll/${id}`);

export const getUserPayrolls = (userId: number) => api.get(`/payroll/user/${userId}`);

export const deletePayroll = (id: number) => api.delete(`/payroll/${id}`);

// Super Admin Endpoints
export const getSuperAdminTenants = () => api.get('/super-admin/tenants');

export const createTenant = (data: {
  name: string;
  adminEmail: string;
  adminPassword: string;
  adminName: string;
}) => api.post('/super-admin/tenants', data);

export const deleteTenant = (id: number) => api.delete(`/super-admin/tenants/${id}`);

export const deactivateTenant = (id: number) => api.patch(`/super-admin/tenants/${id}/deactivate`);

export const activateTenant = (id: number) => api.patch(`/super-admin/tenants/${id}/activate`);
