import {useEffect, useState} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  ScrollView,
} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import * as Location from "expo-location";
import {useRouter} from "expo-router";
import {useAuth} from "../../src/contexts/AuthContext";
import {useResponsive} from "../../src/hooks/useResponsive";
import {useGlobalModal} from "../../src/contexts/GlobalModalContext";
import {
  clockIn,
  clockOut,
  getTodayAttendance,
  startBreak,
  endBreak,
  getTodayBreaks,
  getCompanyConfig,
  registerFace,
  verifyFace,
  getFaceStatus,
} from "../../src/services/api";
import FaceCamera from "../../src/components/FaceCamera";
import {theme} from "../../src/constants/theme";

export default function UserDashboard() {
  const {user, logout} = useAuth();
  const router = useRouter();
  const {isDesktop, isTablet, isWeb} = useResponsive();
  const {showModal} = useGlobalModal();
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [todayBreaks, setTodayBreaks] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<
    "clockIn" | "clockOut" | "breakStart" | "breakEnd" | "register"
  >("clockIn");
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [workValidation, setWorkValidation] = useState<{
    latitude: number;
    longitude: number;
    radius: number;
  } | null>(null);
  // Shift detection handled server-side; no local shift selection needed

  type LocationResult = {
    coords: {
      latitude: number;
      longitude: number;
    };
  };

  useEffect(() => {
    loadData();
    checkFaceStatus();
  }, []);

  const checkFaceStatus = async () => {
    try {
      const res = await getFaceStatus();
      if (res.data.success) {
        setFaceRegistered(res.data.data.faceRegistered);
      }
    } catch (error) {
      console.error("Error checking face status:", error);
    }
  };

  const loadData = async () => {
    try {
      const [attendanceRes, breaksRes] = await Promise.all([
        getTodayAttendance(),
        getTodayBreaks(),
      ]);
      if (attendanceRes.data.success) {
        setTodayAttendance(attendanceRes.data.data);
      }
      if (breaksRes.data.success) {
        setTodayBreaks(breaksRes.data.data);
      }

      try {
        const configRes = await getCompanyConfig();
        const config = configRes.data?.data;

        if (
          config?.officeLatitude !== null &&
          config?.officeLatitude !== undefined &&
          config?.officeLongitude !== null &&
          config?.officeLongitude !== undefined
        ) {
          setWorkValidation({
            latitude: Number(config.officeLatitude),
            longitude: Number(config.officeLongitude),
            radius: Number(config.allowedRadiusMeters) || 3000,
          });
        } else {
          setWorkValidation(null);
        }
      } catch (error) {
        console.error("Error loading profile:", error);
        setWorkValidation(null);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleFaceAction = (
    mode: "clockIn" | "clockOut" | "breakStart" | "breakEnd" | "register",
  ) => {
    setCameraMode(mode);
    setShowCamera(true);
  };

  const handleFaceDetected = async (faceData: any, photoUri: string) => {
    setShowCamera(false);
    setLoading(true);

    try {
      let currentLat: number | null = null;
      let currentLon: number | null = null;

      // Wajib mengambil lokasi khusus untuk validasi absen masuk & pulang
      if (cameraMode === "clockIn" || cameraMode === "clockOut") {
        const {status} = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          showModal({
            title: "Error",
            message:
              "Izin akses lokasi (GPS) diperlukan untuk melakukan absen.",
            isError: true,
            buttonText: "Tutup",
          });
          setLoading(false);
          return;
        }

        // Timeout GPS 3 detik
        const locationPromise = Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Pencarian GPS terlalu lama (Timeout)")),
            3000,
          ),
        );
        let location: LocationResult;
        try {
          location = (await Promise.race([
            locationPromise,
            timeoutPromise,
          ])) as LocationResult;
        } catch (err) {
          showModal({
            title: "Error",
            message:
              "Gagal mendapatkan lokasi, pastikan GPS aktif dan sinyal bagus.",
            isError: true,
            buttonText: "Tutup",
          });
          setLoading(false);
          return;
        }
        currentLat = location.coords.latitude;
        currentLon = location.coords.longitude;

        // Validasi radius lokasi kantor
        function getDistanceFromLatLonInMeters(
          lat1: number,
          lon1: number,
          lat2: number,
          lon2: number,
        ) {
          const R = 6371000; // Radius bumi dalam meter
          const dLat = ((lat2 - lat1) * Math.PI) / 180;
          const dLon = ((lon2 - lon1) * Math.PI) / 180;
          const a =
            0.5 -
            Math.cos(dLat) / 2 +
            (Math.cos((lat1 * Math.PI) / 180) *
              Math.cos((lat2 * Math.PI) / 180) *
              (1 - Math.cos(dLon))) /
              2;
          return R * 2 * Math.asin(Math.sqrt(a));
        }
        if (workValidation) {
          const distance = getDistanceFromLatLonInMeters(
            currentLat,
            currentLon,
            workValidation.latitude,
            workValidation.longitude,
          );
          if (distance > workValidation.radius) {
            showModal({
              title: "Error",
              message: `Anda di luar jangkauan lokasi kantor. Jarak Anda ${Math.round(distance)} meter, batas maksimal ${workValidation.radius} meter.`,
              isError: true,
              buttonText: "Tutup",
            });
            setLoading(false);
            return;
          }
        }
      }

      const formData = new FormData();
      formData.append("userId", user!.id.toString());
      formData.append("faceDescriptor", JSON.stringify(faceData.descriptor));
      formData.append("faceVerified", "true");

      if (currentLat !== null)
        formData.append("latitude", currentLat.toString());
      if (currentLon !== null)
        formData.append("longitude", currentLon.toString());
      // Convert photo URI to blob for upload
      const response = await fetch(photoUri);
      const blob = await response.blob();
      formData.append("photo", blob as any, "face.jpg");

      switch (cameraMode) {
        case "register":
          await registerFace(formData);
          showModal({
            title: "Sukses",
            message: "Wajah berhasil didaftarkan!",
            buttonText: "Tutup",
          });
          setFaceRegistered(true);
          break;
        case "clockIn":
          await clockIn(formData);
          showModal({
            title: "Sukses",
            message: `Clock-in berhasil!`,
            buttonText: "Tutup",
          });
          break;
        case "clockOut":
          await clockOut(formData);
          showModal({
            title: "Sukses",
            message: `Clock-out berhasil!`,
            buttonText: "Tutup",
          });
          break;
        case "breakStart":
          await startBreak(formData);
          showModal({
            title: "Sukses",
            message: "Istirahat dimulai!",
            buttonText: "Tutup",
          });
          break;
        case "breakEnd":
          await endBreak(formData);
          showModal({
            title: "Sukses",
            message: "Istirahat selesai!",
            buttonText: "Tutup",
          });
          break;
      }
      loadData();
    } catch (error: any) {
      console.error("Action error:", error);
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Terjadi kesalahan saat memproses data.";
      showModal({
        title: "Gagal",
        message: errorMsg,
        isError: true,
        buttonText: "Tutup",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const hasActiveBreak = todayBreaks?.activeBreak != null;
  const canClockIn = !todayAttendance?.clockIn;
  const canClockOut = todayAttendance?.clockIn && !todayAttendance?.clockOut;
  const canStartBreak =
    todayAttendance?.clockIn && !todayAttendance?.clockOut && !hasActiveBreak;
  const canEndBreak = hasActiveBreak;
  const attendanceLabel = todayAttendance
    ? todayAttendance.status === "LATE"
      ? "Hari ini terlambat"
      : todayAttendance.status === "PRESENT"
        ? "Hari ini hadir"
        : "Status absensi tersedia"
    : "Belum ada absensi hari ini";
  const clockInLabel = todayAttendance?.clockIn
    ? new Date(todayAttendance.clockIn).toLocaleTimeString("id-ID")
    : "-";
  const clockOutLabel = todayAttendance?.clockOut
    ? new Date(todayAttendance.clockOut).toLocaleTimeString("id-ID")
    : "-";

  const menuItems = [
    {icon: "📋", title: "Riwayat", route: "/user/history"},
    {icon: "💰", title: "Slip Gaji", route: "/user/payroll"},
    {icon: "📝", title: "Tugas", route: "/user/tasks"},
    {icon: "📅", title: "Izin", route: "/user/leave"},
  ];

  return (
    <View style={[styles.container, isWeb && styles.containerWeb]}>
      {/* Face Camera Modal */}
      <Modal visible={showCamera} animationType="slide">
        <FaceCamera
          mode={cameraMode === "register" ? "register" : "verify"}
          onFaceDetected={handleFaceDetected}
          onCancel={() => setShowCamera(false)}
        />
      </Modal>

      {/* Sidebar for Desktop */}
      {isDesktop && (
        <View style={styles.sidebar}>
          <Text style={styles.sidebarTitle}>Absensi</Text>
          <TouchableOpacity
            style={[styles.sidebarItem, styles.sidebarItemActive]}
          >
            <Text style={styles.sidebarItemText}>🏠 Dashboard</Text>
          </TouchableOpacity>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.sidebarItem}
              onPress={() => router.push(item.route as any)}
            >
              <Text style={styles.sidebarItemText}>
                {item.icon} {item.title}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.sidebarSpacer} />
          <TouchableOpacity onPress={handleLogout} style={styles.sidebarLogout}>
            <Text style={styles.sidebarLogoutText}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content */}
      <ScrollView style={[styles.main, isDesktop && styles.mainDesktop]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, isDesktop && styles.titleDesktop]}>
              Dashboard
            </Text>
            <Text style={styles.subtitle}>{attendanceLabel}</Text>
          </View>
          {!isDesktop && (
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          )}
        </View>

        {isWeb && isDesktop && (
          <View style={styles.heroBar}>
            <View style={styles.heroTextBlock}>
              <View style={styles.heroBadge}>
                <Ionicons
                  name="phone-portrait-outline"
                  size={14}
                  color="#fff"
                />
                <Text style={styles.heroBadgeText}>Web Ready</Text>
              </View>
              <Text style={styles.heroTitle}>
                Absensi harian yang siap dipakai langsung dari browser.
              </Text>
              <Text style={styles.heroSubtitle}>
                Cek status hari ini, ajukan izin, lihat slip gaji, dan akses
                seluruh fitur tanpa pindah aplikasi.
              </Text>
            </View>

            <View style={styles.heroStats}>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatLabel}>Masuk</Text>
                <Text style={styles.heroStatValue}>{clockInLabel}</Text>
              </View>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatLabel}>Pulang</Text>
                <Text style={styles.heroStatValue}>{clockOutLabel}</Text>
              </View>
              <View style={styles.heroStatCard}>
                <Text style={styles.heroStatLabel}>Istirahat</Text>
                <Text style={styles.heroStatValue}>
                  {todayBreaks?.totalBreakMinutes || 0} mnt
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Face Registration Alert */}
        {!faceRegistered && (
          <TouchableOpacity
            style={styles.faceRegisterAlert}
            onPress={() => handleFaceAction("register")}
          >
            <Text style={styles.faceRegisterText}>
              👤 Wajah belum terdaftar. Tap untuk mendaftarkan wajah Anda
            </Text>
          </TouchableOpacity>
        )}

        <View style={[styles.content, isDesktop && styles.contentDesktop]}>
          {/* User Card */}
          <View style={[styles.userCard, isDesktop && styles.userCardDesktop]}>
            <View style={styles.userCardTopRow}>
              <Ionicons name="person-circle-outline" size={28} color="#fff" />
              <View style={styles.userCardPill}>
                <Text style={styles.userCardPillText}>
                  {faceRegistered ? "Wajah Terdaftar" : "Belum Terdaftar"}
                </Text>
              </View>
            </View>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {faceRegistered && (
              <View style={styles.faceRegisteredBadge}>
                <Text style={styles.faceRegisteredText}>✓ Wajah Terdaftar</Text>
              </View>
            )}
          </View>

          {/* Attendance Card */}
          <View
            style={[
              styles.attendanceCard,
              isDesktop && styles.attendanceCardDesktop,
            ]}
          >
            <Text style={styles.sectionTitle}>Absensi Hari Ini</Text>

            {todayAttendance ? (
              <View>
                <Text style={styles.timeText}>Masuk: {clockInLabel}</Text>
                <Text style={styles.timeText}>Pulang: {clockOutLabel}</Text>
                <Text style={styles.timeText}>
                  Total Istirahat: {todayBreaks?.totalBreakMinutes || 0} menit
                </Text>
                {todayAttendance.status && (
                  <View
                    style={[
                      styles.statusBadge,
                      todayAttendance.status === "LATE" && styles.statusLate,
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {todayAttendance.status}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.noRecord}>Belum ada record hari ini</Text>
            )}

            {/* Break Status */}
            {hasActiveBreak && (
              <View style={styles.breakActive}>
                <Text style={styles.breakActiveText}>⏸️ Sedang Istirahat</Text>
                <Text style={styles.breakStartTime}>
                  Mulai:{" "}
                  {new Date(
                    todayBreaks.activeBreak.startTime,
                  ).toLocaleTimeString("id-ID")}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              {canClockIn && (
                <TouchableOpacity
                  style={[
                    styles.clockButton,
                    styles.clockInBtn,
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={() => handleFaceAction("clockIn")}
                  disabled={loading}
                >
                  <Text style={styles.clockButtonText}>🔓 Clock In</Text>
                </TouchableOpacity>
              )}

              {canClockOut && !hasActiveBreak && (
                <TouchableOpacity
                  style={[
                    styles.clockButton,
                    styles.clockOutBtn,
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={() => handleFaceAction("clockOut")}
                  disabled={loading}
                >
                  <Text style={styles.clockButtonText}>🔒 Clock Out</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Break Buttons */}
            {(canStartBreak || canEndBreak) && (
              <View style={styles.buttonRow}>
                {canStartBreak && (
                  <TouchableOpacity
                    style={[
                      styles.clockButton,
                      styles.breakStartBtn,
                      loading && styles.buttonDisabled,
                    ]}
                    onPress={() => handleFaceAction("breakStart")}
                    disabled={loading}
                  >
                    <Text style={styles.clockButtonText}>
                      ☕ Mulai Istirahat
                    </Text>
                  </TouchableOpacity>
                )}

                {canEndBreak && (
                  <TouchableOpacity
                    style={[
                      styles.clockButton,
                      styles.breakEndBtn,
                      loading && styles.buttonDisabled,
                    ]}
                    onPress={() => handleFaceAction("breakEnd")}
                    disabled={loading}
                  >
                    <Text style={styles.clockButtonText}>
                      ▶️ Selesai Istirahat
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Menu Grid (Mobile/Tablet only) */}
        {!isDesktop && (
          <View style={[styles.menu, isTablet && styles.menuTablet]}>
            {menuItems.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.menuCard, isTablet && styles.menuCardTablet]}
                onPress={() => router.push(item.route as any)}
              >
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuTitle}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Modal Kamera */}
        <Modal visible={showCamera} animationType="slide">
          <FaceCamera
            mode={cameraMode === "register" ? "register" : "verify"}
            onFaceDetected={handleFaceDetected}
            onCancel={() => setShowCamera(false)}
          />
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: "#f8fafc"},
  containerWeb: {flexDirection: "row", minHeight: "100vh" as any},
  sidebar: {
    width: 220,
    backgroundColor: "#1e293b",
    padding: 20,
    minHeight: "100vh" as any,
  },
  sidebarTitle: {
    color: "#f1f5f9",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 24,
  },
  sidebarItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 4,
  },
  sidebarItemActive: {backgroundColor: "#334155"},
  sidebarItemText: {color: "#f1f5f9", fontSize: 14},
  sidebarSpacer: {flex: 1},
  sidebarLogout: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#374151",
  },
  sidebarLogoutText: {color: "#fca5a5", fontSize: 14},
  main: {flex: 1, padding: 16},
  mainDesktop: {padding: 32, maxWidth: 900},
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {fontSize: 24, fontWeight: "bold", color: "#1e293b"},
  titleDesktop: {fontSize: 28},
  subtitle: {fontSize: 14, color: theme.colors.text.secondary, marginTop: 4},
  logoutBtn: {padding: 8},
  logoutText: {color: theme.colors.status.error, fontWeight: "600"},
  heroBar: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 16,
  },
  heroTextBlock: {flex: 1},
  heroBadge: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(59,130,246,0.22)",
    marginBottom: 12,
  },
  heroBadgeText: {color: "#fff", fontSize: 12, fontWeight: "700"},
  heroTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
    maxWidth: 560,
  },
  heroSubtitle: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 640,
  },
  heroStats: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "flex-end",
    alignItems: "stretch",
    minWidth: 320,
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
  heroStatValue: {color: "#fff", fontSize: 16, fontWeight: "700"},
  faceRegisterAlert: {
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.status.warning,
  },
  faceRegisterText: {
    color: "#92400e",
    textAlign: "center",
    fontWeight: "500",
  },
  content: {},
  contentDesktop: {flexDirection: "row", gap: 24},
  userCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  userCardDesktop: {flex: 1, marginBottom: 0},
  userCardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  userCardPill: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  userCardPillText: {color: "#fff", fontSize: 12, fontWeight: "700"},
  userName: {fontSize: 22, fontWeight: "bold", color: "#fff"},
  userEmail: {fontSize: 14, color: "#bfdbfe", marginTop: 4},
  faceRegisteredBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  faceRegisteredText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  attendanceCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  attendanceCardDesktop: {flex: 2, marginBottom: 0},
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  timeText: {fontSize: 16, color: "#1e293b", marginBottom: 4},
  noRecord: {fontSize: 14, color: "#94a3b8"},
  statusBadge: {
    backgroundColor: theme.colors.status.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  statusLate: {
    backgroundColor: theme.colors.status.warning,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  breakActive: {
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  breakActiveText: {
    color: "#92400e",
    fontWeight: "600",
    fontSize: 14,
  },
  breakStartTime: {
    color: "#b45309",
    fontSize: 12,
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    gap: 12,
  },
  clockButton: {flex: 1, padding: 14, borderRadius: 10, alignItems: "center"},
  clockInBtn: {backgroundColor: theme.colors.status.success},
  clockOutBtn: {backgroundColor: theme.colors.status.error},
  breakStartBtn: {backgroundColor: theme.colors.status.warning},
  breakEndBtn: {backgroundColor: "#8b5cf6"},
  buttonDisabled: {backgroundColor: "#cbd5e1"},
  clockButtonText: {color: "#fff", fontSize: 14, fontWeight: "600"},
  menu: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  menuTablet: {gap: 12},
  menuCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    width: "48%",
    marginBottom: 12,
    elevation: 2,
    alignItems: "center",
  },
  menuCardTablet: {width: "calc(25% - 9px)" as any},
  menuIcon: {fontSize: 28, marginBottom: 8},
  menuTitle: {fontSize: 14, fontWeight: "600", color: "#1e293b"},
});
