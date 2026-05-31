import {useEffect, useState} from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Modal,
} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import * as Location from "expo-location";
import {useRouter, useLocalSearchParams} from "expo-router";
import {useAuth} from "../../src/contexts/AuthContext";
import {getUserById, updateUser} from "../../src/services/api";

// UI Components
import {theme} from "../../src/constants/theme";
import {ScreenHeader} from "../../src/components/ui/ScreenHeader";
import {Card} from "../../src/components/ui/Card";
import {Button} from "../../src/components/ui/Button";
import {Input} from "../../src/components/ui/Input";
import {MapPicker} from "../../src/components/ui/MapPicker";
import {useResponsive} from "../../src/hooks/useResponsive";
import {useGlobalModal} from "../../src/contexts/GlobalModalContext";

type SalaryType = "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY";

type RoleType = "USER" | "ADMIN" | "LEADER";
type WorkLocationItem = {
  id: string;
  latitude: string;
  longitude: string;
  radius: string;
  name: string;
};

const createLocationId = () =>
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function EditEmployee() {
  const {id} = useLocalSearchParams();
  const router = useRouter();
  const {isDesktop, isWeb} = useResponsive();
  const {showModal} = useGlobalModal();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleType>("USER");
  const [salaryType, setSalaryType] = useState<SalaryType>("MONTHLY");
  const [salary, setSalary] = useState("");
  const [startWorkTime, setStartWorkTime] = useState("09:00");
  const [endWorkTime, setEndWorkTime] = useState("17:00");
  const [latePenalty, setLatePenalty] = useState("0");
  const [isActive, setIsActive] = useState(true);

  // Location Override State
  const [workLocations, setWorkLocations] = useState<WorkLocationItem[]>([]);

  // Validation
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    fetchEmployee();
  }, [id]);

  const fetchEmployee = async () => {
    try {
      const res = await getUserById(Number(id));
      const user = res.data.data;

      setName(user.name);
      setEmail(user.email);
      setRole(user.role || "USER");
      setSalaryType(user.salaryType || "MONTHLY");
      setSalary(user.salary?.toString() || "0");
      setStartWorkTime(user.startWorkTime || "09:00");
      setEndWorkTime(user.endWorkTime || "17:00");
      setLatePenalty(user.latePenalty?.toString() || "0");
      setIsActive(user.isActive);

      const savedLocations = Array.isArray(user.workLocations)
        ? user.workLocations
        : [];
      const normalizedLocations = savedLocations
        .map((location: any) => {
          const latitude = Number(location?.latitude);
          const longitude = Number(location?.longitude);
          if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
            return null;
          }

          const radiusValue =
            location?.radius !== undefined && location?.radius !== null
              ? Number(location.radius)
              : 50;

          return {
            id: createLocationId(),
            name: location?.name || `Cabang ${savedLocations.indexOf(location) + 1}`,
            latitude: latitude.toString(),
            longitude: longitude.toString(),
            radius:
              !Number.isNaN(radiusValue) && radiusValue > 0
                ? radiusValue.toString()
                : "50",
          };
        })
        .filter(Boolean) as WorkLocationItem[];

      if (normalizedLocations.length > 0) {
        setWorkLocations(normalizedLocations);
      } else if (user.workLatitude && user.workLongitude) {
        setWorkLocations([
          {
            id: createLocationId(),
            name: "Lokasi Pusat",
            latitude: user.workLatitude.toString(),
            longitude: user.workLongitude.toString(),
            radius: user.workRadius?.toString() || "50",
          },
        ]);
      } else {
        setWorkLocations([]);
      }
    } catch (error) {
      console.error(error);
      showModal({
        title: "Error",
        message: "Gagal memuat data karyawan",
        isError: true,
        buttonText: "Tutup",
      });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!name.trim()) newErrors.name = "Nama wajib diisi";
    if (!email.trim()) newErrors.email = "Email wajib diisi";

    if (!salary) newErrors.salary = "Gaji wajib diisi";
    else if (isNaN(Number(salary))) newErrors.salary = "Gaji harus angka";

    if (latePenalty && isNaN(Number(latePenalty)))
      newErrors.latePenalty = "Denda harus angka";

    workLocations.forEach((location, index) => {
      if (!location.name || !location.name.trim()) {
        newErrors[`location-name-${index}`] = "Nama lokasi wajib diisi";
      }
      if (
        isNaN(Number(location.latitude)) ||
        isNaN(Number(location.longitude))
      ) {
        newErrors[`location-${index}`] = "Koordinat lokasi harus valid";
      }
      if (!location.radius || isNaN(Number(location.radius))) {
        newErrors[`location-radius-${index}`] = "Radius harus angka";
      } else if (Number(location.radius) <= 0) {
        newErrors[`location-radius-${index}`] = "Radius harus lebih dari 0";
      }
    });

    const timeRegex =
      /^([01]?[0-9]|2[0-3]):[0-5][0-9](,\s*([01]?[0-9]|2[0-3]):[0-5][0-9])*$/;
    const singleTimeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (!startWorkTime.trim()) {
      newErrors.startWorkTime = "Jam Masuk wajib diisi";
    } else if (
      startWorkTime.toUpperCase() !== "FLEX" &&
      !timeRegex.test(startWorkTime.trim())
    ) {
      newErrors.startWorkTime = "Format jam salah (HH:MM)";
    }

    if (endWorkTime.trim() && !singleTimeRegex.test(endWorkTime.trim())) {
      newErrors.endWorkTime = "Format jam salah (HH:MM)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showModal({
        title: "Validasi Gagal",
        message: "Mohon periksa inputan yang merah",
        isError: true,
        buttonText: "Tutup",
      });
      return;
    }

    setSaving(true);
    try {
      await updateUser(Number(id), {
        name,
        email,
        role,
        salaryType,
        salary: Number(salary),
        startWorkTime,
        endWorkTime,
        latePenalty: Number(latePenalty) || 0,
        workLocations:
          workLocations.length > 0
            ? workLocations.map(location => ({
                name: location.name.trim() || `Cabang ${workLocations.indexOf(location) + 1}`,
                latitude: Number(location.latitude),
                longitude: Number(location.longitude),
                radius: Number(location.radius) || 50,
              }))
            : null,
        isActive,
      });
      showModal({
        title: "Sukses",
        message: "Data karyawan telah berhasil disimpan.",
        buttonText: "OK, Kembali ke List",
        onPrimaryPress: () => router.back(),
      });
    } catch (error: any) {
      console.error("Edit employee error:", error);
      showModal({
        title: "Gagal",
        message:
          error.response?.data?.message || error.message || "Terjadi kesalahan",
        isError: true,
        buttonText: "Tutup",
      });
    } finally {
      setSaving(false);
    }
  };

  const salaryTypes: {value: SalaryType; label: string}[] = [
    {value: "HOURLY", label: "Per Jam"},
    {value: "DAILY", label: "Harian"},
    {value: "WEEKLY", label: "Mingguan"},
    {value: "MONTHLY", label: "Bulanan"},
  ];

  const roles: {value: RoleType; label: string}[] = [
    {value: "USER", label: "Karyawan"},
    {value: "LEADER", label: "Leader"},
    {value: "ADMIN", label: "Admin"},
  ];

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Edit Karyawan" />

      {isWeb && isDesktop && (
        <View style={styles.heroPanel}>
          <View style={styles.heroTextBlock}>
            <View style={styles.heroBadge}>
              <Ionicons name="create-outline" size={14} color="#fff" />
              <Text style={styles.heroBadgeText}>Employee Edit</Text>
            </View>
            <Text style={styles.heroTitle}>
              Perbarui data karyawan dengan tampilan yang konsisten.
            </Text>
            <Text style={styles.heroSubtitle}>
              Edit role, jam kerja, status aktif, dan radius lokasi tanpa keluar
              dari web admin.
            </Text>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Status</Text>
              <Text style={styles.heroStatValue}>
                {isActive ? "Aktif" : "Non-Aktif"}
              </Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Role</Text>
              <Text style={styles.heroStatValue}>{role}</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Jam Masuk</Text>
              <Text style={styles.heroStatValue}>{startWorkTime}</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Lokasi</Text>
              <Text style={styles.heroStatValue}>{workLocations.length}</Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Toggle */}
        <Card style={styles.sectionCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitleNoMargin}>Status Akun</Text>
            <Button
              title={isActive ? "Aktif" : "Non-Aktif"}
              size="sm"
              onPress={() => setIsActive(!isActive)}
            />
          </View>
        </Card>

        {/* Basic Information Section */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>👤 Informasi Dasar</Text>
          <Input
            label="Nama Lengkap"
            value={name}
            onChangeText={text => {
              setName(text);
              setErrors({...errors, name: ""});
            }}
            error={errors.name}
          />
          <Input
            label="Email"
            value={email}
            onChangeText={text => {
              setEmail(text);
              setErrors({...errors, email: ""});
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <Text style={styles.label}>Role / Jabatan</Text>
          <View style={styles.salaryTypeContainer}>
            {roles.map(r => (
              <Button
                key={r.value}
                title={r.label}
                variant={role === r.value ? "primary" : "outline"}
                onPress={() => setRole(r.value)}
                style={[
                  styles.salaryTypeBtn,
                  role !== r.value && {borderColor: theme.colors.border},
                ]}
                textStyle={{
                  fontSize: 13,
                  color:
                    role === r.value ? "#fff" : theme.colors.text.secondary,
                }}
              />
            ))}
          </View>
        </Card>

        {/* Salary Configuration Section */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>💰 Pengaturan Gaji</Text>

          <Text style={styles.label}>Tipe Gaji</Text>
          <View style={styles.salaryTypeContainer}>
            {salaryTypes.map(type => (
              <Button
                key={type.value}
                title={type.label}
                variant={salaryType === type.value ? "primary" : "outline"}
                onPress={() => setSalaryType(type.value)}
                style={[
                  styles.salaryTypeBtn,
                  salaryType !== type.value && {
                    borderColor: theme.colors.border,
                  },
                ]}
                textStyle={{
                  fontSize: 13,
                  color:
                    salaryType === type.value
                      ? "#fff"
                      : theme.colors.text.secondary,
                }}
              />
            ))}
          </View>

          <View style={styles.rowInputs}>
            <View style={{flex: 1, marginRight: 8}}>
              <Input
                label="Nominal Gaji"
                value={salary}
                onChangeText={text => {
                  setSalary(text);
                  setErrors({...errors, salary: ""});
                }}
                keyboardType="numeric"
                error={errors.salary}
              />
            </View>
            <View style={{flex: 1, marginLeft: 8}}>
              <Input
                label="Denda Terlambat"
                value={latePenalty}
                onChangeText={text => {
                  setLatePenalty(text);
                  setErrors({...errors, latePenalty: ""});
                }}
                keyboardType="numeric"
                error={errors.latePenalty}
              />
            </View>
          </View>
        </Card>

        {/* Working Hours Section */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>⏰ Jam Kerja & Auto-Shift</Text>
          <View style={styles.rowInputs}>
            <View style={{flex: 1, marginRight: 8}}>
              <Input
                label="Jam Masuk *"
                placeholder="Wajib isi, misal: 08:00"
                value={startWorkTime}
                onChangeText={text => {
                  setStartWorkTime(text.replace(/\./g, ":"));
                  setErrors({...errors, startWorkTime: ""});
                }}
                error={errors.startWorkTime}
              />
            </View>
            <View style={{flex: 1, marginLeft: 8}}>
              <Input
                label="Jam Pulang *"
                placeholder="Wajib isi, misal: 17:00"
                value={endWorkTime}
                onChangeText={text => {
                  setEndWorkTime(text.replace(/\./g, ":"));
                  setErrors({...errors, endWorkTime: ""});
                }}
                error={errors.endWorkTime}
              />
            </View>
          </View>
          <Text style={styles.hintText}>
            Isi koma jika ada 2 Shift. Contoh: 06:00,12:00 (masuk) dan
            17:00,21:00 (pulang)
          </Text>
        </Card>

        {/* Location Section */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            📍 Lokasi Kerja Khusus (Opsional)
          </Text>
          <Text style={styles.hintText}>
            Tambahkan satu atau lebih titik lokasi kerja dari peta. Setiap titik
            punya radius absen sendiri.
          </Text>

          <View style={{marginTop: theme.spacing.md}}>
            {workLocations.length === 0 ? (
              <View style={{marginBottom: 16}}>
                <Text
                  style={{color: theme.colors.text.light, fontStyle: "italic"}}
                >
                  Belum ada lokasi khusus, akan mengikuti pusat
                </Text>
              </View>
            ) : (
              <View style={{gap: 12, marginBottom: 16}}>
                {workLocations.map((location, index) => (
                  <View key={location.id} style={styles.locationCard}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.label}>Titik {index + 1}</Text>
                      <TouchableOpacity
                        onPress={() =>
                          setWorkLocations(prev =>
                            prev.filter(item => item.id !== location.id),
                          )
                        }
                      >
                        <Text style={styles.removeLocationText}>Hapus</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.locationValue}>
                      Koordinat: {location.latitude}, {location.longitude}
                    </Text>
                    <Input
                      label="Nama Lokasi (Cabang/Proyek)"
                      value={location.name}
                      onChangeText={text => {
                        setWorkLocations(prev =>
                          prev.map(item =>
                            item.id === location.id
                              ? {...item, name: text}
                              : item,
                          ),
                        );
                        setErrors({
                          ...errors,
                          [`location-name-${index}`]: "",
                        });
                      }}
                      placeholder="Contoh: Kantor Pusat, Cabang 1"
                      error={errors[`location-name-${index}`]}
                    />
                    <Input
                      label="Radius Titik Ini (meter)"
                      value={location.radius}
                      onChangeText={text => {
                        setWorkLocations(prev =>
                          prev.map(item =>
                            item.id === location.id
                              ? {...item, radius: text}
                              : item,
                          ),
                        );
                        setErrors({
                          ...errors,
                          [`location-radius-${index}`]: "",
                        });
                      }}
                      keyboardType="numeric"
                      placeholder="Contoh: 50"
                      error={errors[`location-radius-${index}`]}
                    />
                  </View>
                ))}
              </View>
            )}

            <Button
              title="🗺️ Tambah Titik via Peta Interaktif"
              variant="outline"
              onPress={() => setShowMapPicker(true)}
              style={{marginBottom: 16}}
            />
          </View>
        </Card>

        <Button
          title="Simpan Perubahan"
          onPress={handleSave}
          loading={saving}
          size="lg"
          style={styles.submitBtn}
        />

        <View style={{height: 40}} />
      </ScrollView>

      {/* Map Picker Modal */}
      <Modal visible={showMapPicker} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.mapModalContainer,
              isDesktop && styles.mapModalDesktop,
            ]}
          >
            <MapPicker
              initialLatitude={null}
              initialLongitude={null}
              onClose={() => setShowMapPicker(false)}
              onSelect={(lat, lng) => {
                setWorkLocations(prev => [
                  ...prev,
                  {
                    id: createLocationId(),
                    name: `Cabang ${prev.length + 1}`,
                    latitude: lat.toString(),
                    longitude: lng.toString(),
                    radius: "50",
                  },
                ]);
                setShowMapPicker(false);
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    minWidth: 320,
  },
  heroStatCard: {
    minWidth: 100,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  heroStatLabel: {color: "#94a3b8", fontSize: 12, marginBottom: 4},
  heroStatValue: {color: "#fff", fontSize: 16, fontWeight: "800"},
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  sectionCard: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
  },
  sectionTitleNoMargin: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text.secondary,
    marginBottom: 8,
    marginLeft: 2,
  },
  salaryTypeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: theme.spacing.lg,
  },
  salaryTypeBtn: {
    minWidth: "48%",
    flexGrow: 1,
    height: 40,
  },
  rowInputs: {
    flexDirection: "row",
  },
  hintText: {
    ...theme.typography.small,
    color: theme.colors.text.light,
    marginTop: -8,
    marginLeft: 4,
  },
  locationCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#fff",
  },
  locationValue: {
    color: theme.colors.text.secondary,
    marginBottom: 10,
    marginTop: -2,
  },
  removeLocationText: {
    color: theme.colors.status.error,
    fontSize: 12,
    fontWeight: "700",
  },
  submitBtn: {
    marginTop: theme.spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 16,
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    maxHeight: "90%",
  },
  mapModalDesktop: {
    maxWidth: 600,
    alignSelf: "center",
    width: "100%",
  },
});
