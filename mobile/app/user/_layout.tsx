import {Stack} from "expo-router";
import {theme} from "../../src/constants/theme";

export default function UserLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {backgroundColor: theme.colors.background},
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="history" />
      <Stack.Screen name="attendance-correction" />
      <Stack.Screen name="payroll" />
      <Stack.Screen name="tasks" />
      <Stack.Screen name="leave" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
