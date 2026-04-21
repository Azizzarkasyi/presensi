import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text,
  Modal,
} from "react-native";
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
import {SuccessModal} from "../../src/components/ui/SuccessModal";
import {MapPicker} from "../../src/components/ui/MapPicker";
import {useResponsive} from "../../src/hooks/useResponsive";

type SalaryType = "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY";
type RoleType = "USER" | "ADMIN" | "LEADER";

export default function AddEmployee() {
  const router = useRouter();
  const {isDesktop} = useResponsive();
  const [loading, setLoading] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    visible: false,
    isError: false,
    message: "",
  });
  const [showMapPicker, setShowMapPicker] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<RoleType>("USER");
  const [salaryType, setSalaryType] = useState<SalaryType>("MONTHLY");
  const [salary, setSalary] = useState("");
  const [startWorkTime, setStartWorkTime] = useState("09:00");
  const [endWorkTime, setEndWorkTime] = useState("17:00");
  const [latePenalty, setLatePenalty] = useState("0");

  // Location Override State
  const [workLatitude, setWorkLatitude] = useState("");
  const [workLongitude, setWorkLongitude] = useState("");
  const [workRadius, setWorkRadius] = useState("");

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
    if (workRadius && isNaN(Number(workRadius)))
      newErrors.workRadius = "Radius harus angka";
    if (workLatitude && isNaN(Number(workLatitude)))
      newErrors.workLatitude = "Koordinat salah";
    if (workLongitude && isNaN(Number(workLongitude)))
      newErrors.workLongitude = "Koordinat salah";

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
      Alert.alert("Validasi Gagal", "Mohon periksa kembali inputan Anda");
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
        workLatitude: workLatitude ? Number(workLatitude) : undefined,
        workLongitude: workLongitude ? Number(workLongitude) : undefined,
        workRadius: workRadius ? Number(workRadius) : undefined,
      });

      setModalConfig({
        visible: true,
        isError: false,
        message: "Data Karyawan berhasil disimpan.",
      });
    } catch (error: any) {
      console.error("Save employee error:", error);
      setModalConfig({
        visible: true,
        isError: true,
        message:
          error.response?.data?.message || error.message || "Terjadi kesalahan",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    const wasSuccess = !modalConfig.isError;
    setModalConfig({...modalConfig, visible: false});
    if (wasSuccess) {
      router.back();
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
            secureTextEntry
            placeholder="Minimal 6 karakter"
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
            Isi area ini jika karyawan memiliki pembatasan radius absen terpisah
            dari kantor pusat.
          </Text>

          <View style={{marginTop: theme.spacing.md}}>
            {workLatitude && workLongitude ? (
              <View style={{marginBottom: 16}}>
                <Text style={styles.label}>Koordinat Khusus Tersimpan</Text>
                <Text style={{color: theme.colors.text.secondary}}>
                  {workLatitude}, {workLongitude}
                </Text>
              </View>
            ) : (
              <View style={{marginBottom: 16}}>
                <Text
                  style={{color: theme.colors.text.light, fontStyle: "italic"}}
                >
                  Belum ada lokasi khusus, akan mengikuti pusat
                </Text>
              </View>
            )}

            <Button
              title="🗺️ Pilih via Peta Interaktif"
              variant="outline"
              onPress={() => setShowMapPicker(true)}
              style={{marginBottom: 16}}
            />

            <Input
              label="Radius Individual (meter)"
              value={workRadius}
              onChangeText={text => {
                setWorkRadius(text);
                setErrors({...errors, workRadius: ""});
              }}
              keyboardType="numeric"
              placeholder="Contoh: 50"
              error={errors.workRadius}
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

      <SuccessModal
        visible={modalConfig.visible}
        isError={modalConfig.isError}
        message={modalConfig.message}
        onClose={handleModalClose}
        buttonText={modalConfig.isError ? "Tutup" : "OK, Kembali ke List"}
      />

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
              initialLatitude={workLatitude ? parseFloat(workLatitude) : null}
              initialLongitude={
                workLongitude ? parseFloat(workLongitude) : null
              }
              onClose={() => setShowMapPicker(false)}
              onSelect={(lat, lng) => {
                setWorkLatitude(lat.toString());
                setWorkLongitude(lng.toString());
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
