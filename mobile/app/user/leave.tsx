import React, {useState} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import {useRouter} from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {requestLeave} from "../../src/services/api";
import {useResponsive} from "../../src/hooks/useResponsive";
import {ScreenHeader} from "../../src/components/ui/ScreenHeader";
import {Card} from "../../src/components/ui/Card";
import {Button} from "../../src/components/ui/Button";
import {Input} from "../../src/components/ui/Input";
import {theme} from "../../src/constants/theme";
import {Ionicons} from "@expo/vector-icons";
import {useGlobalModal} from "../../src/contexts/GlobalModalContext";

export default function LeaveRequest() {
  const router = useRouter();
  const {isDesktop, isWeb} = useResponsive();
  const {showModal} = useGlobalModal();
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState<"SICK" | "LEAVE">("SICK");
  const [description, setDescription] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const pickImage = async (useCamera: boolean = false) => {
    try {
      if (useCamera) {
        const {status} = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          showModal({
            title: "Izin Ditolak",
            message: "Aplikasi membutuhkan akses kamera lho.",
            buttonText: "Tutup",
          });
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.2,
          allowsEditing: true,
          aspect: [3, 4],
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          setPhotoUri(result.assets[0].uri);
        }
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.2,
          allowsEditing: true,
          aspect: [3, 4],
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          setPhotoUri(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      showModal({
        title: "Gagal",
        message: "Tidak dapat memuat gambar",
        isError: true,
        buttonText: "Tutup",
      });
    }
  };

  const handleSubmit = async () => {
    if (!photoUri) {
      showModal({
        title: "Error",
        message: "Anda wajib melampirkan foto / surat bukti!",
        isError: true,
        buttonText: "Tutup",
      });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("status", status);
      if (description) {
        formData.append("description", description);
      }

      // Handle file upload
      const fallbackName = `document-${Date.now()}.jpg`;
      let filename = fallbackName;
      let type = "image/jpeg";

      if (isWeb) {
        // Fetch blob from blob URL for web React Native Image Picker
        const res = await fetch(photoUri);
        let blob = await res.blob();
        
        // Aggressive web compression using Canvas
        try {
          blob = await new Promise((resolve) => {
            const globalWindow = window as any;
            const globalDocument = document as any;
            const img = new globalWindow.Image();
            img.onload = () => {
              const canvas = globalDocument.createElement("canvas");
              const MAX_WIDTH = 800;
              let width = img.width;
              let height = img.height;
              if (width > MAX_WIDTH) {
                height = Math.round((height * MAX_WIDTH) / width);
                width = MAX_WIDTH;
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((b: Blob | null) => resolve(b || blob), "image/jpeg", 0.6);
              } else {
                resolve(blob);
              }
            };
            img.onerror = () => resolve(blob);
            img.src = URL.createObjectURL(blob);
          }) as Blob;
        } catch (e) {
          console.warn("Canvas compression failed", e);
        }

        formData.append("photo", blob as any, fallbackName);
      } else {
        // Mobile platform handling
        filename = photoUri.split("/").pop() || fallbackName;
        const match = /\.(\w+)$/.exec(filename);
        type = match ? `image/${match[1]}` : `image`;
        formData.append("photo", {
          uri: photoUri,
          name: filename,
          type,
        } as any);
      }

      await requestLeave(formData);
      showModal({
        title: "Sukses",
        message: "Pengajuan berhasil dicatat dan menunggu persetujuan admin.",
        buttonText: "Ke Dashboard",
      });
    } catch (error: any) {
      console.error("Request leave error:", error);
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Gagal mengajukan izin";
      showModal({
        title: "Gagal",
        message: msg,
        isError: true,
        buttonText: "Tutup",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, isWeb && styles.containerWeb]}>
      <ScreenHeader
        title="Pengajuan Izin & Sakit"
        onBack={() => router.back()}
      />

      {isWeb && isDesktop && (
        <View style={styles.heroPanel}>
          <View style={styles.heroTextBlock}>
            <View style={styles.heroBadge}>
              <Ionicons name="medical-outline" size={14} color="#fff" />
              <Text style={styles.heroBadgeText}>Leave Request</Text>
            </View>
            <Text style={styles.heroTitle}>
              Ajukan izin atau sakit langsung dari browser.
            </Text>
            <Text style={styles.heroSubtitle}>
              Unggah bukti, kirim alasan, dan pantau pengajuan tanpa perlu
              pindah ke aplikasi lain.
            </Text>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Kategori</Text>
              <Text style={styles.heroStatValue}>
                {status === "SICK" ? "Sakit" : "Izin"}
              </Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Lampiran</Text>
              <Text style={styles.heroStatValue}>
                {photoUri ? "Ada" : "Belum"}
              </Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View
          style={[styles.contentWrapper, isDesktop && styles.contentDesktop]}
        >
          <Card>
            <Text style={styles.label}>Pilih Kategori:</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[
                  styles.statusBox,
                  status === "SICK" && styles.statusBoxActive,
                ]}
                onPress={() => setStatus("SICK")}
              >
                <Ionicons
                  name="medkit-outline"
                  size={24}
                  color={status === "SICK" ? theme.colors.primary : "#64748b"}
                />
                <Text
                  style={[
                    styles.statusText,
                    status === "SICK" && styles.statusTextActive,
                  ]}
                >
                  Sakit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.statusBox,
                  status === "LEAVE" && styles.statusBoxActive,
                ]}
                onPress={() => setStatus("LEAVE")}
              >
                <Ionicons
                  name="airplane-outline"
                  size={24}
                  color={status === "LEAVE" ? theme.colors.primary : "#64748b"}
                />
                <Text
                  style={[
                    styles.statusText,
                    status === "LEAVE" && styles.statusTextActive,
                  ]}
                >
                  Izin / Cuti
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <Input
              label="Keterangan / Alasan"
              placeholder="Contoh: Demam tinggi, perlu istirahat 2 hari"
              value={description}
              onChangeText={setDescription}
            />

            <View style={styles.divider} />

            <Text style={styles.label}>
              Lampirkan Bukti (Surat Dokter / Dokumen):
            </Text>
            {photoUri ? (
              <View style={styles.photoPreviewContainer}>
                <Image source={{uri: photoUri}} style={styles.photoPreview} />
                <TouchableOpacity
                  style={styles.photoRemoveBtn}
                  onPress={() => setPhotoUri(null)}
                >
                  <Ionicons name="close-circle" size={28} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={() => pickImage(true)}
                >
                  <Ionicons name="camera-outline" size={24} color="#64748b" />
                  <Text style={styles.uploadText}>Kamera</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.uploadBtn}
                  onPress={() => pickImage(false)}
                >
                  <Ionicons name="image-outline" size={24} color="#64748b" />
                  <Text style={styles.uploadText}>Galeri</Text>
                </TouchableOpacity>
              </View>
            )}

            <Button
              title="Kirim Pengajuan"
              onPress={handleSubmit}
              disabled={loading}
              style={styles.submitBtn}
            />
          </Card>
        </View>
      </ScrollView>

      {/* Uploading Animation Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Mengunggah Data...</Text>
            <Text style={styles.loadingSubText}>Mohon tunggu sebentar, jangan tutup aplikasi.</Text>
          </View>
        </View>
      )}
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
  heroPanel: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 20,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 16 as any,
  },
  heroTextBlock: {flex: 1},
  heroBadge: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 6 as any,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.22)",
    marginBottom: 12,
  },
  heroBadgeText: {color: "#fff", fontSize: 12, fontWeight: "700"},
  heroTitle: {
    color: "#fff",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    maxWidth: 620,
  },
  heroSubtitle: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 680,
  },
  heroStats: {
    flexDirection: "row",
    gap: 12 as any,
    flexWrap: "wrap",
    justifyContent: "flex-end",
    alignItems: "stretch",
    minWidth: 220,
  },
  heroStatCard: {
    minWidth: 96,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  heroStatLabel: {color: "#94a3b8", fontSize: 12, marginBottom: 4},
  heroStatValue: {color: "#fff", fontSize: 16, fontWeight: "800"},
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
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text.primary,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  statusBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    gap: 8,
  },
  statusBoxActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + "10",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
  },
  statusTextActive: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#f1f5f9",
    marginVertical: 20,
  },
  uploadBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    backgroundColor: "#fff",
    gap: 8,
  },
  uploadText: {
    color: "#64748b",
    fontSize: 14,
  },
  photoPreviewContainer: {
    position: "relative",
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: "#e2e8f0",
    borderRadius: 8,
    overflow: "hidden",
  },
  photoPreview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  photoRemoveBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
  },
  submitBtn: {
    marginTop: 24,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loadingCard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
    width: "80%",
    maxWidth: 320,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
  },
  loadingSubText: {
    marginTop: 8,
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
  },
});
