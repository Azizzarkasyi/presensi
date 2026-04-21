import AsyncStorage from "@react-native-async-storage/async-storage";

export async function readCachedJson<T>(key: string): Promise<T | null> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (!value) {
      return null;
    }

    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function writeCachedJson(
  key: string,
  value: unknown,
): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage failures in restricted environments.
  }
}
