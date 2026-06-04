import {useEffect, useState} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
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
  getAttendanceStatistics,
  getAttendanceHistory,
  getProfile,
  requestAttendanceCorrection,
} from "../../src/services/api";
import {Button} from "../../src/components/ui/Button";
import {Input} from "../../src/components/ui/Input";
import FaceCamera from "../../src/components/FaceCamera";
import {theme} from "../../src/constants/theme";

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

export default function UserDashboard() {
  const {user, logout} = useAuth();
  const router = useRouter();
  const {isDesktop, isTablet, isWeb} = useResponsive();
  const {showModal} = useGlobalModal();
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [todayBreaks, setTodayBreaks] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState<{
    present: number;
    late: number;
    sick: number;
    leave: number;
    totalDays: number;
  } | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState<
    "clockIn" | "clockOut" | "breakStart" | "breakEnd" | "register"
  >("clockIn");
  const [faceRegistered, setFaceRegistered] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [liveDistance, setLiveDistance] = useState<number | null>(null);
  const [workLocations, setWorkLocations] = useState<Array<{
    latitude: number;
    longitude: number;
    radius: number;
  }>>([]);
  const [missedClockOut, setMissedClockOut] = useState<{
    id: number;
    date: string;
    clockIn: string;
  } | null>(null);
  const [showMissedClockOutModal, setShowMissedClockOutModal] = useState(false);
  const [missedClockOutTime, setMissedClockOutTime] = useState("17:00");
  const [missedClockOutReason, setMissedClockOutReason] = useState("");
  const [missedClockOutLoading, setMissedClockOutLoading] = useState(false);
  
  const [companyConfig, setCompanyConfig] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showLateReasonModal, setShowLateReasonModal] = useState(false);
  const [lateReason, setLateReason] = useState("");
  const [pendingClockInFormData, setPendingClockInFormData] = useState<any>(null);

  const checkIfLate = (profile: any, config: any) => {
    if (!profile) return false;
    const workStartTime = profile.startWorkTime || "09:00";
    if (workStartTime.toUpperCase() === "FLEX") return false;

    const lateThreshold = config?.lateThresholdMinutes !== undefined 
      ? Number(config.lateThresholdMinutes) 
      : 15;
    const shiftTimes = workStartTime
      .replace(/\./g, ":") // handle 09.00
      .split(",")
      .map((s: string) => s.trim())
      .filter((s: string) => s);
    if (shiftTimes.length === 0) shiftTimes.push("09:00");

    const now = new Date();
    
    // Check if within any shift window (on time)
    let foundOnTimeShift = false;
    for (const st of shiftTimes) {
      const parts = st.split(":");
      if (parts.length >= 2) {
        const sh = parseInt(parts[0], 10);
        const sm = parseInt(parts[1], 10);
        if (!isNaN(sh) && !isNaN(sm)) {
          const shiftStart = new Date();
          shiftStart.setHours(sh, sm, 0, 0);
          const shiftEnd = new Date(shiftStart);
          shiftEnd.setMinutes(shiftEnd.getMinutes() + lateThreshold);
          if (now >= shiftStart && now <= shiftEnd) {
            foundOnTimeShift = true;
            break;
          }
        }
      }
    }

    if (foundOnTimeShift) return false;

    // Check if past last shift
    const allShiftEnd = shiftTimes
      .map((st: string) => {
        const parts = st.split(":");
        if (parts.length >= 2) {
          const sh = parseInt(parts[0], 10);
          const sm = parseInt(parts[1], 10);
          if (!isNaN(sh) && !isNaN(sm)) {
            const d = new Date();
            d.setHours(sh, sm, 0, 0);
            d.setMinutes(d.getMinutes() + lateThreshold);
            return d;
          }
        }
        return null;
      })
      .filter(Boolean) as Date[];

    const lastShiftEnd = allShiftEnd.length > 0 ? allShiftEnd[allShiftEnd.length - 1] : null;
    if (lastShiftEnd && now > lastShiftEnd) {
      return true;
    }
    return false;
  };

  type LocationResult = {
    coords: {
      latitude: number;
      longitude: number;
      accuracy: number | null;
    };
    mocked?: boolean;
  };

  async function getBestLocation(maxRetries = 3): Promise<{lat: number; lon: number}> {
    const timeouts = [5000, 8000, 12000]; // Increasing timeout per retry
    let lastError: any;
    let bestLocation: {lat: number; lon: number; accuracy: number} | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      setGpsStatus(attempt === 0 ? "Mencari lokasi GPS..." : `Retry lokasi ke-${attempt + 1}...`);
      try {
        const loc = await Promise.race([
          Location.getCurrentPositionAsync({ 
            accuracy: Location.Accuracy.High,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeouts[attempt]))
        ]) as LocationResult;

        // Anti Fake GPS / Mock Location
        if (loc.mocked) {
          throw new Error("FAKE_GPS");
        }

        // Save best location (smallest accuracy = most accurate)
        const currentAccuracy = loc.coords.accuracy ?? 999;
        if (!bestLocation || currentAccuracy < bestLocation.accuracy) {
          bestLocation = {
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
            accuracy: currentAccuracy,
          };

        // Update live distance if work locations exist
        if (workLocations.length > 0 && bestLocation) {
          const distances = workLocations.map(loc =>
            getDistanceFromLatLonInMeters(
              bestLocation!.lat,
              bestLocation!.lon,
              loc.latitude,
              loc.longitude
            )
          );
          setLiveDistance(Math.round(Math.min(...distances)));
        }
        }

        // If accuracy is good enough (< 30m), stop retry
        if (currentAccuracy < 30) break;

      } catch (err) {
        lastError = err;
        // Continue to next retry
      }
    }

    setGpsStatus(null);
    if (bestLocation) return { lat: bestLocation.lat, lon: bestLocation.lon };
    throw lastError ?? new Error("Gagal mendapatkan lokasi");
  }

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
    const CACHE_KEY = `@dashboard_cache_${user?.id}`;

    // 1. Tampilkan Data Lokal Dulu (Instant UI / Offline)
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.todayAttendance) setTodayAttendance(parsed.todayAttendance);
        if (parsed.todayBreaks) setTodayBreaks(parsed.todayBreaks);
        if (parsed.monthlyStats) setMonthlyStats(parsed.monthlyStats);
        if (parsed.workLocations) setWorkLocations(parsed.workLocations);
        if (parsed.companyConfig) setCompanyConfig(parsed.companyConfig);
        if (parsed.userProfile) setUserProfile(parsed.userProfile);
      }
    } catch (e) { /* ignore cache read error */ }

    // 2. Fetch API Online (Background Update)
    try {
      let tempTodayAttendance = null;
      let tempTodayBreaks = null;
      let tempMonthlyStats = null;
      let tempWorkLocations: any[] = [];

      const [attendanceRes, breaksRes] = await Promise.all([
        getTodayAttendance(),
        getTodayBreaks(),
      ]);
      
      if (attendanceRes.data.success) {
        tempTodayAttendance = attendanceRes.data.data;
        setTodayAttendance(tempTodayAttendance);
      }
      if (breaksRes.data.success) {
        tempTodayBreaks = breaksRes.data.data;
        setTodayBreaks(tempTodayBreaks);
      }

      // Detect missed clock out from yesterday
      try {
        const historyRes = await getAttendanceHistory({page: 1, limit: 5});
        const historyList =
          historyRes.data?.data?.records || historyRes.data?.data || [];

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yYear = yesterday.getFullYear();
        const yMonth = String(yesterday.getMonth() + 1).padStart(2, "0");
        const yDay = String(yesterday.getDate()).padStart(2, "0");
        const yesterdayStr = `${yYear}-${yMonth}-${yDay}`;

        const yesterdayMissed = historyList.find((att: any) => {
          const d = new Date(att.date);
          const attDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          return attDateStr === yesterdayStr && att.clockIn && !att.clockOut;
        });

        if (yesterdayMissed) {
          setMissedClockOut({
            id: yesterdayMissed.id,
            date: yesterdayStr,
            clockIn: yesterdayMissed.clockIn,
          });
          setShowMissedClockOutModal(true);
        } else {
          setMissedClockOut(null);
        }
      } catch (error) {
        console.error("Error checking missed clock out:", error);
      }

      try {
        const statsRes = await getAttendanceStatistics();
        if (statsRes.data.success) {
          tempMonthlyStats = statsRes.data.data;
          setMonthlyStats(tempMonthlyStats);
        }
      } catch (error) {
        console.error("Error loading stats:", error);
      }

      let fetchedConfig: any = null;
      let fetchedProfile: any = null;

      try {
        const [configRes, profileRes] = await Promise.all([
          getCompanyConfig(),
          getProfile(),
        ]);

        fetchedConfig = configRes.data?.data;
        fetchedProfile = profileRes.data?.data;
        setCompanyConfig(fetchedConfig);
        setUserProfile(fetchedProfile);
        const defaultRadius = Number(fetchedConfig?.allowedRadiusMeters) || 50;

        let locations: Array<{latitude: number; longitude: number; radius: number; name?: string}> = [];

        // 1. Priority: workLocations per-user (multi-location support)
        if (fetchedProfile?.workLocations) {
          let raw = fetchedProfile.workLocations;
          if (typeof raw === "string") {
            try { raw = JSON.parse(raw); } catch(e) { raw = null; }
          }
          if (Array.isArray(raw) && raw.length > 0) {
            locations = raw
              .map((loc: any) => ({
                name: loc.name,
                latitude: Number(loc.latitude),
                longitude: Number(loc.longitude),
                radius: Number(loc.radius) > 0 ? Number(loc.radius) : defaultRadius,
              }))
              .filter((loc: any) => isFinite(loc.latitude) && isFinite(loc.longitude));
          }
        }

        // 2. Fallback: single work location fields per-user (legacy)
        if (locations.length === 0 && fetchedProfile?.workLatitude && fetchedProfile?.workLongitude) {
          locations = [{
            name: "Lokasi Pusat",
            latitude: Number(fetchedProfile.workLatitude),
            longitude: Number(fetchedProfile.workLongitude),
            radius: Number(fetchedProfile.workRadius) > 0 ? Number(fetchedProfile.workRadius) : defaultRadius,
          }];
        }

        // 3. Fallback: global office location from company config
        if (locations.length === 0 && fetchedConfig?.officeLatitude && fetchedConfig?.officeLongitude) {
          locations = [{
            name: "Lokasi Perusahaan",
            latitude: Number(fetchedConfig.officeLatitude),
            longitude: Number(fetchedConfig.officeLongitude),
            radius: defaultRadius,
          }];
        }

        tempWorkLocations = locations;
        setWorkLocations(tempWorkLocations);
      } catch (error) {
        console.error("Error loading work locations:", error);
        setWorkLocations([]);
      }

      // 3. Simpan data terbaru ke Cache Lokal
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        todayAttendance: tempTodayAttendance,
        todayBreaks: tempTodayBreaks,
        monthlyStats: tempMonthlyStats,
        workLocations: tempWorkLocations,
        companyConfig: fetchedConfig || companyConfig,
        userProfile: fetchedProfile || userProfile,
      }));

    } catch (error) {
      console.error("Gagal sinkronisasi data online. Menggunakan data lokal (offline).", error);
    }
  };

  const handleMissedClockOutSubmit = async () => {
    if (!missedClockOut) return;
    if (!missedClockOutReason.trim()) {
      showModal({
        title: "Error",
        message: "Alasan wajib diisi.",
        isError: true,
        buttonText: "Tutup",
      });
      return;
    }

    setMissedClockOutLoading(true);
    try {
      await requestAttendanceCorrection(missedClockOut.id, {
        correctionReason: missedClockOutReason.trim(),
        requestedClockOut: missedClockOutTime.trim(),
      });

      setShowMissedClockOutModal(false);
      setMissedClockOut(null);
      setMissedClockOutReason("");
      setMissedClockOutTime("17:00");

      showModal({
        title: "Berhasil",
        message:
          "Pengajuan koreksi jam keluar berhasil dikirim dan menunggu persetujuan admin.",
        buttonText: "OK",
      });
      await loadData();
    } catch (error: any) {
      showModal({
        title: "Gagal",
        message: error.response?.data?.message || "Gagal mengirim koreksi",
        isError: true,
        buttonText: "Tutup",
      });
    } finally {
      setMissedClockOutLoading(false);
    }
  };
 
  const handleLateReasonSubmit = async () => {
    if (!lateReason.trim()) {
      showModal({
        title: "Validasi Gagal",
        message: "Alasan terlambat wajib diisi",
        isError: true,
        buttonText: "Tutup",
      });
      return;
    }

    setLoading(true);
    setShowLateReasonModal(false);

    try {
      const formData = pendingClockInFormData;
      formData.append("lateReason", lateReason);

      await clockIn(formData);
      
      showModal({
        title: "Sukses",
        message: `Clock-in terlambat berhasil dicatat!`,
        buttonText: "Tutup",
      });

      setLateReason("");
      setPendingClockInFormData(null);
      await loadData();
    } catch (error: any) {
      showModal({
        title: "Gagal",
        message: error.response?.data?.message || "Gagal melakukan clock-in",
        isError: true,
        buttonText: "Tutup",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFaceAction = (
    mode: "clockIn" | "clockOut" | "breakStart" | "breakEnd" | "register",
  ) => {
    setLiveDistance(null);
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

        let location: {lat: number; lon: number};
        try {
          location = await getBestLocation(3);
        } catch (err: any) {
          const isFakeGps = err.message === "FAKE_GPS";
          showModal({
            title: isFakeGps ? "Akses Ditolak" : "Error",
            message: isFakeGps 
              ? "Aplikasi Fake GPS / Mock Location terdeteksi. Harap matikan untuk melakukan absensi." 
              : "Gagal mendapatkan lokasi, pastikan GPS aktif dan sinyal bagus.",
            isError: true,
            buttonText: "Tutup",
          });
          setLoading(false);
          return;
        }
        currentLat = location.lat;
        currentLon = location.lon;

        // Deteksi apakah perangkat adalah HP (Mobile) atau PC (Desktop)
        let isMobileDevice = true;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent);
        }

        // Tolak absensi jika menggunakan PC/Laptop
        if (!isMobileDevice && Platform.OS === 'web') {
          showModal({
            title: "Perangkat Tidak Diizinkan",
            message: "Absensi HANYA DAPAT DILAKUKAN MELALUI HP/Smartphone. Silakan buka aplikasi ini di browser HP Anda.",
            isError: true,
            buttonText: "Tutup",
          });
          setLoading(false);
          return;
        }

        if (workLocations.length > 0) {
          const distances = workLocations.map((loc: any) => ({
            dist: getDistanceFromLatLonInMeters(
              currentLat!,
              currentLon!,
              loc.latitude,
              loc.longitude
            ),
            radius: loc.radius,
            name: loc.name || "Lokasi Kerja",
          }));

          // Allowed if user is within radius of ANY assigned location
          const isInRange = distances.some(d => d.dist <= d.radius);

          if (!isInRange) {
            // Find closest location for helpful error message
            const closest = distances.reduce((prev, curr) => 
              prev.dist < curr.dist ? prev : curr
            );

            showModal({
              title: "Di Luar Jangkauan",
              message: `Anda ${Math.round(closest.dist)} meter dari ${closest.name} (batas: ${closest.radius}m).\n\nPastikan Anda benar-benar berada di area kerja dan sinyal GPS stabil.`,
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
        case "clockIn": {
          const isLate = checkIfLate(userProfile || user, companyConfig);
          if (isLate) {
            setPendingClockInFormData(formData);
            setShowLateReasonModal(true);
            setLoading(false);
          } else {
            await clockIn(formData);
            showModal({
              title: "Sukses",
              message: `Clock-in berhasil!`,
              buttonText: "Tutup",
            });
            await loadData();
          }
          break;
        }
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

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await checkFaceStatus();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      if (window.confirm("Apakah Anda yakin ingin logout?")) {
        await logout();
        router.replace("/login");
      }
    } else {
      Alert.alert(
        "Konfirmasi Logout",
        "Apakah Anda yakin ingin logout?",
        [
          {text: "Batal", style: "cancel"},
          {
            text: "Logout",
            style: "destructive",
            onPress: async () => {
              await logout();
              router.replace("/login");
            },
          },
        ],
      );
    }
  };

  const hasActiveBreak = todayBreaks?.activeBreak != null;
  const isLeaveOrSick = todayAttendance?.status === "SICK" || todayAttendance?.status === "LEAVE";
  const canClockIn = !todayAttendance?.clockIn && !missedClockOut && !isLeaveOrSick;
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
    {icon: "✏️", title: "Koreksi", route: "/user/attendance-correction"},
    {icon: "👤", title: "Profil", route: "/user/profile"},
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
      <ScrollView
        style={[styles.main, isDesktop && styles.mainDesktop]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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
            style={styles.actionBanner}
            onPress={() => handleFaceAction("register")}
            activeOpacity={0.8}
          >
            <View style={styles.actionBannerIconPrimary}>
              <Ionicons name="scan-outline" size={24} color="#fff" />
            </View>
            <View style={styles.actionBannerContent}>
              <Text style={styles.actionBannerTitle}>Wajah Belum Terdaftar</Text>
              <Text style={styles.actionBannerDesc}>Tap di sini untuk merekam data wajah absensi Anda sekarang.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#3b82f6" />
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

            {/* Missed Clock Out Alert */}
            {missedClockOut && (
              <TouchableOpacity
                style={styles.actionBannerWarning}
                onPress={() => setShowMissedClockOutModal(true)}
                activeOpacity={0.8}
              >
                <View style={styles.actionBannerIconWarning}>
                  <Ionicons name="warning-outline" size={24} color="#fff" />
                </View>
                <View style={styles.actionBannerContent}>
                  <Text style={styles.actionBannerTitleWarning}>Lupa Absen Keluar?</Text>
                  <Text style={styles.actionBannerDescWarning}>
                    Anda belum absen keluar pada {new Date(missedClockOut.date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}. Tap untuk melengkapi.
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#f59e0b" />
              </TouchableOpacity>
            )}

            {/* GPS Status Indicator */}
            {gpsStatus && (
              <View style={styles.gpsStatusBar}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.gpsStatusText}>{gpsStatus}</Text>
              </View>
            )}

            {/* Distance Indicator */}
            {liveDistance !== null && workLocations.length > 0 && (() => {
              // The liveDistance state already stores the MINIMUM distance to any location
              // We just need to check if that min distance is within ANY of the allowed radii
              const isOk = workLocations.some(loc => liveDistance <= loc.radius);

              return (
                <View style={[
                  styles.distanceBar,
                  isOk ? styles.distanceOk : styles.distanceFar
                ]}>
                  <Text style={styles.distanceText}>
                    {isOk
                      ? `✅ Dalam jangkauan (${liveDistance}m dari titik terdekat)`
                      : `⚠️ Di luar jangkauan — ${liveDistance}m dari titik terdekat`
                    }
                  </Text>
                </View>
              );
            })()}

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

        {/* Monthly Statistics */}
        {monthlyStats && (
          <View style={styles.statsCard}>
            <Text style={styles.sectionTitle}>📊 Statistik Bulan Ini</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{monthlyStats.present}</Text>
                <Text style={styles.statLabel}>Hadir</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{monthlyStats.late}</Text>
                <Text style={styles.statLabel}>Telat</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{monthlyStats.sick}</Text>
                <Text style={styles.statLabel}>Sakit</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{monthlyStats.leave}</Text>
                <Text style={styles.statLabel}>Izin</Text>
              </View>
            </View>
          </View>
        )}

        <View style={{height: 40}} />

      {/* Missed Clock Out Modal */}
      <Modal visible={showMissedClockOutModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.missedModal}>
            <Text style={styles.missedModalTitle}>⚠️ Lupa Absen Keluar</Text>
            <Text style={styles.missedModalSubtitle}>
              Anda belum absen keluar pada{" "}
              {missedClockOut
                ? new Date(missedClockOut.date).toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })
                : ""}
              . Isi jam keluar dan alasan untuk melanjutkan absen hari ini.
            </Text>

            {/* Jam Masuk (read-only) */}
            <Text style={styles.missedModalLabel}>
              Jam Masuk:{" "}
              {missedClockOut?.clockIn
                ? new Date(missedClockOut.clockIn).toLocaleTimeString("id-ID")
                : "-"}
            </Text>

            {/* Pilih Jam Keluar */}
            <Input
              label="Jam Keluar (format 17:00)"
              value={missedClockOutTime}
              onChangeText={setMissedClockOutTime}
              placeholder="17:00"
              keyboardType="numbers-and-punctuation"
            />

            {/* Alasan */}
            <Input
              label="Alasan lupa absen keluar *"
              value={missedClockOutReason}
              onChangeText={setMissedClockOutReason}
              placeholder="Contoh: Lupa, baterai HP habis, dll."
              multiline
            />

            <Button
              title="Kirim Koreksi"
              onPress={handleMissedClockOutSubmit}
              loading={missedClockOutLoading}
              style={{marginBottom: 12}}
            />
            <Button
              title="Nanti"
              variant="ghost"
              onPress={() => setShowMissedClockOutModal(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Late Reason Modal */}
      <Modal visible={showLateReasonModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.missedModal}>
            <Text style={[styles.missedModalTitle, {color: theme.colors.primary}]}>⏰ Anda Terlambat</Text>
            <Text style={styles.missedModalSubtitle}>
              Sistem mendeteksi bahwa Anda melakukan clock-in melebihi jam masuk yang ditentukan. Mohon tuliskan alasan keterlambatan Anda untuk melanjutkan.
            </Text>

            <Input
              label="Alasan Terlambat *"
              value={lateReason}
              onChangeText={setLateReason}
              placeholder="Contoh: Ban bocor, macet di jalan, dll."
              multiline
            />

            <Button
              title="Kirim & Absen"
              onPress={handleLateReasonSubmit}
              loading={loading}
              style={{marginBottom: 12}}
            />
            <Button
              title="Batal"
              variant="outline"
              onPress={() => {
                setShowLateReasonModal(false);
                setLateReason("");
                setPendingClockInFormData(null);
              }}
            />
          </View>
        </View>
      </Modal>

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
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 8,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.status.success,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
  },
  gpsStatusBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#eff6ff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  gpsStatusText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  distanceBar: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  distanceOk: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  distanceFar: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  distanceText: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.colors.text.primary,
    textAlign: "center",
  },
  actionBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBannerWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbeb",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fde68a",
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBannerIconPrimary: {
    backgroundColor: "#3b82f6",
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  actionBannerIconWarning: {
    backgroundColor: "#f59e0b",
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  actionBannerContent: {
    flex: 1,
  },
  actionBannerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e3a8a",
    marginBottom: 4,
  },
  actionBannerTitleWarning: {
    fontSize: 16,
    fontWeight: "700",
    color: "#92400e",
    marginBottom: 4,
  },
  actionBannerDesc: {
    fontSize: 13,
    color: "#3b82f6",
    lineHeight: 18,
  },
  actionBannerDescWarning: {
    fontSize: 13,
    color: "#b45309",
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  missedModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  missedModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#92400e",
    marginBottom: 8,
  },
  missedModalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 20,
  },
  missedModalLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
    marginBottom: 12,
  },

});
