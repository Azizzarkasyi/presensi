import {useMemo, useState} from "react";
import {View, Text, StyleSheet, ScrollView} from "react-native";
import {Ionicons} from "@expo/vector-icons";
import {useLocalSearchParams, useRouter} from "expo-router";
import {requestAttendanceCorrection} from "../../src/services/api";
import {useResponsive} from "../../src/hooks/useResponsive";
import {ScreenHeader} from "../../src/components/ui/ScreenHeader";
import {Card} from "../../src/components/ui/Card";
import {Button} from "../../src/components/ui/Button";
import {Input} from "../../src/components/ui/Input";
import {theme} from "../../src/constants/theme";
import {SuccessModal} from "../../src/components/ui/SuccessModal";

export default function AttendanceCorrectionRequest() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    date?: string;
    clockIn?: string;
    clockOut?: string;
  }>();
  const {isDesktop, isWeb} = useResponsive();
  const [requestedClockIn, setRequestedClockIn] = useState(
    String(params.clockIn || ""),
  );
  const [requestedClockOut, setRequestedClockOut] = useState(
    String(params.clockOut || ""),
  );
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({
    visible: false,
    isError: false,
    message: "",
  });

  const attendanceId = Number(params.id || 0);

  const formattedDate = useMemo(() => {
    if (!params.date) return "-";
    const date = new Date(String(params.date));
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, [params.date]);

  const handleSubmit = async () => {
    if (!attendanceId) {
      setModal({
        visible: true,
        isError: true,
        message: "Data absensi tidak valid.",
      });
      return;
    }

    if (!reason.trim()) {
      setModal({
        visible: true,
        isError: true,
        message: "Alasan koreksi wajib diisi.",
      });
      return;
    }

    if (!requestedClockIn.trim() && !requestedClockOut.trim()) {
      setModal({
        visible: true,
        isError: true,
        message: "Minimal salah satu jam koreksi harus diisi.",
      });
      return;
    }

    setLoading(true);
    try {
      await requestAttendanceCorrection(attendanceId, {
        correctionReason: reason.trim(),
        requestedClockIn: requestedClockIn.trim() || undefined,
        requestedClockOut: requestedClockOut.trim() || undefined,
      });
      setModal({
        visible: true,
        isError: false,
        message:
          "Pengajuan koreksi berhasil dikirim dan menunggu persetujuan admin.",
      });
    } catch (error: any) {
      setModal({
        visible: true,
        isError: true,
        message:
          error.response?.data?.message ||
          error.message ||
          "Gagal mengajukan koreksi absensi",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, isWeb && styles.containerWeb]}>
      <ScreenHeader title="Koreksi Absensi" onBack={() => router.back()} />

      {isWeb && isDesktop && (
        <View style={styles.heroPanel}>
          <View style={styles.heroTextBlock}>
            <View style={styles.heroBadge}>
              <Ionicons name="create-outline" size={14} color="#fff" />
              <Text style={styles.heroBadgeText}>Correction Request</Text>
            </View>
            <Text style={styles.heroTitle}>
              Ajukan koreksi absensi dengan alur yang jelas.
            </Text>
            <Text style={styles.heroSubtitle}>
              Isi jam yang benar dan alasan koreksinya, lalu admin akan
              meninjaunya dari dashboard web.
            </Text>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatLabel}>Tanggal</Text>
              <Text style={styles.heroStatValue}>{formattedDate}</Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View
          style={[styles.contentWrapper, isDesktop && styles.contentDesktop]}
        >
          <Card>
            <Text style={styles.title}>Pengajuan Koreksi</Text>
            <Text style={styles.subtitle}>Tanggal: {formattedDate}</Text>
            <Text style={styles.helper}>
              Isi jam dalam format HH:MM, misalnya 08:00 atau 17:30.
            </Text>

            <View style={styles.row}>
              <View style={styles.flex1}>
                <Input
                  label="Jam Masuk Baru"
                  placeholder="08:00"
                  value={requestedClockIn}
                  onChangeText={setRequestedClockIn}
                  hint="Opsional"
                />
              </View>
              <View style={{width: 12}} />
              <View style={styles.flex1}>
                <Input
                  label="Jam Pulang Baru"
                  placeholder="17:00"
                  value={requestedClockOut}
                  onChangeText={setRequestedClockOut}
                  hint="Opsional"
                />
              </View>
            </View>

            <Input
              label="Alasan Koreksi"
              placeholder="Contoh: Jam clock in terlambat tercatat karena jaringan bermasalah"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={4}
            />

            <Button
              title="Kirim Koreksi"
              onPress={handleSubmit}
              loading={loading}
              size="lg"
              style={styles.submitBtn}
            />
          </Card>
        </View>
      </ScrollView>

      <SuccessModal
        visible={modal.visible}
        isError={modal.isError}
        message={modal.message}
        buttonText={modal.isError ? "Tutup" : "Ke Riwayat"}
        onClose={() => {
          setModal(prev => ({...prev, visible: false}));
          if (!modal.isError) {
            router.replace("/user/history");
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: theme.colors.background},
  containerWeb: {minHeight: "100vh" as any},
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
    minWidth: 150,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  heroStatLabel: {color: "#94a3b8", fontSize: 12, marginBottom: 4},
  heroStatValue: {color: "#fff", fontSize: 16, fontWeight: "800"},
  scrollContent: {padding: theme.spacing.lg},
  contentWrapper: {width: "100%"},
  contentDesktop: {maxWidth: 680, alignSelf: "center"},
  title: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  subtitle: {
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  helper: {
    color: theme.colors.text.light,
    fontSize: 12,
    marginBottom: theme.spacing.md,
  },
  row: {flexDirection: "row"},
  flex1: {flex: 1},
  submitBtn: {marginTop: theme.spacing.md},
});
