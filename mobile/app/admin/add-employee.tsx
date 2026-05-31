import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  Modal,
} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import * as Location from "expo-location";
import {useState} from "react";
import {useRouter} from "expo-router";
import {useAuth} from "../../src/contexts/AuthContext";
import {createUser} from "../../src/services/api";

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
};

const createLocationId = () =>
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function AddEmployee() {
  const router = useRouter();
  const {isDesktop, isWeb} = useResponsive();
  const {showModal} = useGlobalModal();
  const [loading, setLoading] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<RoleType>("USER");
  const [salaryType, setSalaryType] = useState<SalaryType>("MONTHLY");
  const [salary, setSalary] = useState("");
  const [startWorkTime, setStartWorkTime] = useState("09:00");
  const [endWorkTime, setEndWorkTime] = useState("17:00");
  const [latePenalty, setLatePenalty] = useState("0");

  // Location Override State
  const [workLocations, setWorkLocations] = useState<WorkLocationItem[]>([]);

  // Validation State
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!name.trim()) newErrors.name = "Nama wajib diisi";
    if (!email.trim()) newErrors.email = "Email wajib diisi";
    else if (!email.includes("@")) newErrors.email = "Email tidak valid";

    if (!password) newErrors.password = "Password wajib diisi";
    else if (password.length < 6) newErrors.password = "Minimal 6 karakter";

    if (!salary) newErrors.salary = "Gaji wajib diisi";
    else if (isNaN(Number(salary))) newErrors.salary = "Gaji harus angka";

    if (latePenalty && isNaN(Number(latePenalty)))
      newErrors.latePenalty = "Denda harus angka";

    workLocations.forEach((location, index) => {
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

  // Success Modal State

  const handleSubmit = async () => {
    if (!validateForm()) {
      showModal({
        title: "Validasi Gagal",
        message: "Mohon periksa kembali inputan Anda",
        isError: true,
        buttonText: "Tutup",
      });
      return;
    }

    setLoading(true);
    try {
      await createUser({
        name,
        email,
        password,
        role,
        salaryType,
        salary: Number(salary),
        startWorkTime,
        endWorkTime,
        latePenalty: Number(latePenalty) || 0,
        workLocations:
          workLocations.length > 0
            ? workLocations.map(location => ({
                latitude: Number(location.latitude),
                longitude: Number(location.longitude),
                radius: Number(location.radius) || 50,
              }))
            : undefined,
      });
      showModal({
        title: "Sukses",
        message: "Data Karyawan berhasil disimpan.",
        buttonText: "OK, Kembali ke List",
        onPrimaryPress: () => router.back(),
      });
    } catch (error: any) {
      console.error("Save employee error:", error);
      showModal({
        title: "Gagal",
        message:
          error.response?.data?.message || error.message || "Terjadi kesalahan",
        isError: true,
        buttonText: "Tutup",
      });
    } finally {
      setLoading(false);
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

  return (
    <View style={styles.container}>
      <ScreenHeader title="Tambah Karyawan" />

      {isWeb && isDesktop && (
        <View style={styles.heroPanel}>
          <View style={styles.heroTextBlock}>
            <View style={styles.heroBadge}>
              <Ionicons name="person-add-outline" size={14} color="#fff" />
              <Text style={styles.heroBadgeText}>Employee Setup</Text>
            </View>
            <Text style={styles.heroTitle}>
              Tambahkan karyawan dari browser dengan alur yang lebih jelas.
            </Text>
            <Text style={styles.heroSubtitle}>
              Atur role, jam kerja, lokasi, dan radius absen dalam satu layar
              tanpa keluar dari web.
            </Text>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Role</Text>
              <Text style={styles.heroStatValue}>{role}</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Jam Masuk</Text>
              <Text style={styles.heroStatValue}>{startWorkTime}</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Jam Pulang</Text>
              <Text style={styles.heroStatValue}>{endWorkTime || "-"}</Text>
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
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>👤 Informasi Dasar</Text>
          <Input
            label="Nama Lengkap *"
            value={name}
            onChangeText={text => {
              setName(text);
              setErrors({...errors, name: ""});
            }}
            placeholder="Contoh: Budi Santoso"
            error={errors.name}
          />
          <Input
            label="Email *"
            value={email}
            onChangeText={text => {
              setEmail(text);
              setErrors({...errors, email: ""});
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="email@perusahaan.com"
            error={errors.email}
          />
          <Input
            label="Password *"
            value={password}
            onChangeText={text => {
              setPassword(text);
              setErrors({...errors, password: ""});
            }}
            placeholder="Minimal 6 karakter"
            secureTextEntry={!showPassword}
            rightIcon={
              <TouchableOpacity
                onPress={() => setShowPassword(prev => !prev)}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword ? "Sembunyikan password" : "Tampilkan password"
                }
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={theme.colors.text.light}
                />
              </TouchableOpacity>
            }
            error={errors.password}
          />

          <Text style={styles.label}>Role / Jabatan</Text>
          <View style={styles.optionContainer}>
            {roles.map(r => (
              <Button
                key={r.value}
                title={r.label}
                variant={role === r.value ? "primary" : "outline"}
                onPress={() => setRole(r.value)}
                style={[
                  styles.optionBtn,
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

        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>💰 Pengaturan Gaji</Text>

          <Text style={styles.label}>Tipe Gaji</Text>
          <View style={styles.optionContainer}>
            {salaryTypes.map(type => (
              <Button
                key={type.value}
                title={type.label}
                variant={salaryType === type.value ? "primary" : "outline"}
                onPress={() => setSalaryType(type.value)}
                style={[
                  styles.optionBtn,
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
                label="Nominal Gaji *"
                value={salary}
                onChangeText={text => {
                  setSalary(text);
                  setErrors({...errors, salary: ""});
                }}
                keyboardType="numeric"
                placeholder="0"
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
                placeholder="0"
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
                label="Jam Masuk (Pisahkan dg koma)"
                placeholder="Contoh: 08:00,14:00"
                value={startWorkTime}
                onChangeText={text => {
                  setStartWorkTime(text);
                  setErrors({...errors, startWorkTime: ""});
                }}
                error={errors.startWorkTime}
              />
            </View>
            <View style={{flex: 1, marginLeft: 8}}>
              <Input
                label="Jam Pulang (Pisahkan dg koma)"
                placeholder="Contoh: 17:00,21:00"
                value={endWorkTime}
                onChangeText={text => {
                  setEndWorkTime(text);
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
                      {location.latitude}, {location.longitude}
                    </Text>
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
          title="Simpan Karyawan"
          onPress={handleSubmit}
          loading={loading}
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
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text.secondary,
    marginBottom: 8,
    marginLeft: 2,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: theme.spacing.lg,
  },
  optionBtn: {
    flex: 1,
    minWidth: "30%",
    height: 40,
    minHeight: 40,
    paddingHorizontal: 4,
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
