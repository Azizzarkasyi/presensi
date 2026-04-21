import React from "react";
import {View, Text, StyleSheet, Modal} from "react-native";
import {Button} from "./Button";
import {theme} from "../../constants/theme";

interface SuccessModalProps {
  visible: boolean;
  title?: string;
  message: string;
  buttonText?: string;
  secondaryButtonText?: string;
  isError?: boolean;
  onClose: () => void;
  onPrimaryPress?: () => void;
  onSecondaryPress?: () => void;
}

export const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  title,
  message,
  buttonText = "OK",
  secondaryButtonText,
  isError = false,
  onClose,
  onPrimaryPress,
  onSecondaryPress,
}) => {
  const displayTitle = title || (isError ? "Gagal" : "Berhasil!");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View
            style={[styles.iconContainer, isError && styles.iconContainerError]}
          >
            <Text style={styles.icon}>{isError ? "❌" : "✅"}</Text>
          </View>

          <Text style={styles.title}>{displayTitle}</Text>
          <Text style={styles.message}>{message}</Text>

          {secondaryButtonText ? (
            <View style={styles.buttonRow}>
              <Button
                title={secondaryButtonText}
                onPress={() => {
                  onSecondaryPress?.();
                  onClose();
                }}
                size="md"
                variant="outline"
                style={styles.secondaryButton}
              />
              <Button
                title={buttonText}
                onPress={() => {
                  onPrimaryPress?.();
                  onClose();
                }}
                size="md"
                variant={isError ? "danger" : "primary"}
                style={styles.primaryButton}
              />
            </View>
          ) : (
            <Button
              title={buttonText}
              onPress={() => {
                onPrimaryPress?.();
                onClose();
              }}
              size="md"
              variant={isError ? "danger" : "primary"}
              style={{width: "100%"}}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    backgroundColor: theme.colors.card,
    width: "100%",
    maxWidth: 320,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    ...theme.shadows.lg,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.status.success + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainerError: {
    backgroundColor: theme.colors.status.error + "20",
  },
  icon: {
    fontSize: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text.primary,
    marginBottom: 8,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
  },
  primaryButton: {
    flex: 1,
  },
});
