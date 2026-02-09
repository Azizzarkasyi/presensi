import { Stack } from 'expo-router';

export default function UserLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="history" />
      <Stack.Screen name="payroll" />
      <Stack.Screen name="tasks" />
      <Stack.Screen name="leave" />
    </Stack>
  );
}
