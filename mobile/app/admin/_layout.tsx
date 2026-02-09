import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="employees" />
      <Stack.Screen name="add-employee" />
      <Stack.Screen name="attendance" />
      <Stack.Screen name="payroll" />
      <Stack.Screen name="tasks" />
    </Stack>
  );
}
