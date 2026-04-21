import {Slot} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import {useEffect} from "react";
import {AuthProvider} from "../src/contexts/AuthContext";
import {GlobalModalProvider} from "../src/contexts/GlobalModalContext";
import {GlobalModal} from "../src/components/GlobalModal";
import {WebInstallPrompt} from "../src/components/WebInstallPrompt";
import {WebOfflineBanner} from "../src/components/WebOfflineBanner";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from "@expo-google-fonts/plus-jakarta-sans";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <GlobalModalProvider>
        <Slot />
        <GlobalModal />
        <WebInstallPrompt />
        <WebOfflineBanner />
      </GlobalModalProvider>
    </AuthProvider>
  );
}
