import React, {useState, useEffect} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import {useRouter} from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {Ionicons} from "@expo/vector-icons";
import {useAuth} from "../../src/contexts/AuthContext";
import {useResponsive} from "../../src/hooks/useResponsive";
import {useGlobalModal} from "../../src/contexts/GlobalModalContext";
import {getProfile, updateProfile} from "../../src/services/api";
import api from "../../src/services/api";
import {theme} from "../../src/constants/theme";
import {ScreenHeader} from "../../src/components/ui/ScreenHeader";
import {Card} from "../../src/components/ui/Card";
import {Button} from "../../src/components/ui/Button";
import {Input} from "../../src/components/ui/Input";

export default function UserProfile() {
  const router = useRouter();
  const {user} = useAuth();
  const {isDesktop, isWeb} = useResponsive();
  const {showModal} = useGlobalModal();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [existingPhoto, setExistingPhoto] = useState<string | null>(null);

  // Change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await getProfile();
      if (res.data.success) {
        const profile = res.data.data;
        setName(profile.name);
        if (profile.photo) {
          setExistingPhoto(profile.photo);
        }
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const pickPhoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.3,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      showModal({
        title: "Error",
        message: "Nama tidak boleh kosong",
        isError: true,
        buttonText: "Tutup",
      });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name.trim());

      if (photoUri) {
        if (isWeb) {
          const res = await fetch(photoUri);
          const blob = await res.blob();
          formData.append("photo", blob as any, `profile-${Date.now()}.jpg`);
        } else {
          const filename = photoUri.split("/").pop() || "profile.jpg";
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : "image/jpeg";
          formData.append("photo", {
            uri: photoUri,
            name: filename,
            type,
          } as any);
        }
      }

      await updateProfile(formData);
      showModal({
        title: "Sukses",
        message: "Profil berhasil diperbarui!",
        buttonText: "OK",
      });
    } catch (error: any) {
      showModal({
        title: "Gagal",
        message:
          error.response?.data?.message || "Gagal memperbarui profil",
        isError: true,
        buttonText: "Tutup",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      showModal({
        title: "Error",
        message: "Password lama dan baru harus diisi",
        isError: true,
        buttonText: "Tutup",
      });
      return;
    }

    if (newPassword.length < 6) {
      showModal({
        title: "Error",
        message: "Password baru minimal 6 karakter",
        isError: true,
        buttonText: "Tutup",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      showModal({
        title: "Error",
        message: "Konfirmasi password tidak cocok",
        isError: true,
        buttonText: "Tutup",
      });
      return;
    }

    setChangingPassword(true);
    try {
      await api.put("/users/change-password", {
        currentPassword,
        newPassword,
      });
      showModal({
        title: "Sukses",
        message: "Password berhasil diubah!",
        buttonText: "OK",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      showModal({
        title: "Gagal",
        message:
          error.response?.data?.message || "Gagal mengubah password",
        isError: true,
        buttonText: "Tutup",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const displayPhoto = photoUri || (existingPhoto ? existingPhoto : null);

  return (
    <View style={[styles.container, isWeb && styles.containerWeb]}>
      <ScreenHeader title="Profil Saya" onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View
          style={[styles.contentWrapper, isDesktop && styles.contentDesktop]}
        >
          {/* Profile Info */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>👤 Informasi Profil</Text>

            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={pickPhoto}
            >
              {displayPhoto ? (
                <Image
                  source={{uri: displayPhoto}}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons
                    name="person-outline"
                    size={40}
                    color="#94a3b8"
                  />
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera-outline" size={16} color="#fff" />
              </View>
            </TouchableOpacity>

            <Input
              label="Nama Lengkap"
              value={name}
              onChangeText={setName}
              placeholder="Nama Anda"
            />

            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyLabel}>Email</Text>
              <Text style={styles.readOnlyValue}>{user?.email}</Text>
            </View>

            <View style={styles.readOnlyField}>
              <Text style={styles.readOnlyLabel}>Role</Text>
              <Text style={styles.readOnlyValue}>
                {user?.role === "USER"
                  ? "Karyawan"
                  : user?.role === "LEADER"
                    ? "Leader"
                    : user?.role}
              </Text>
            </View>

            <Button
              title="Simpan Profil"
              onPress={handleSaveProfile}
              loading={loading}
              size="lg"
              style={{marginTop: 16}}
            />
          </Card>

          {/* Change Password */}
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>🔒 Ganti Password</Text>

            <Input
              label="Password Lama"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrentPassword}
              placeholder="Masukkan password saat ini"
              rightIcon={
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword((v) => !v)}
                >
                  <Ionicons
                    name={
                      showCurrentPassword
                        ? "eye-off-outline"
                        : "eye-outline"
                    }
                    size={18}
                    color={theme.colors.text.light}
                  />
                </TouchableOpacity>
              }
            />

            <Input
              label="Password Baru"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              placeholder="Minimal 6 karakter"
              rightIcon={
                <TouchableOpacity
                  onPress={() => setShowNewPassword((v) => !v)}
                >
                  <Ionicons
                    name={
                      showNewPassword
                        ? "eye-off-outline"
                        : "eye-outline"
                    }
                    size={18}
                    color={theme.colors.text.light}
                  />
                </TouchableOpacity>
              }
            />

            <Input
              label="Konfirmasi Password Baru"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Ulangi password baru"
            />

            <Button
              title="Ubah Password"
              onPress={handleChangePassword}
              loading={changingPassword}
              variant="outline"
              size="lg"
              style={{marginTop: 16}}
            />
          </Card>

          <View style={{height: 40}} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  containerWeb: {
    minHeight: "100vh" as any,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  contentWrapper: {
    width: "100%",
  },
  contentDesktop: {
    maxWidth: 600,
    alignSelf: "center",
  },
  sectionCard: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  avatarContainer: {
    alignSelf: "center",
    marginBottom: 20,
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  readOnlyField: {
    marginBottom: 16,
  },
  readOnlyLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text.secondary,
    marginBottom: 6,
  },
  readOnlyValue: {
    fontSize: 16,
    color: theme.colors.text.primary,
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 8,
  },
});
