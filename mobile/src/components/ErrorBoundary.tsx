import React, {Component, ErrorInfo, ReactNode} from "react";
import {View, Text, TouchableOpacity, StyleSheet} from "react-native";
import {theme} from "../constants/theme";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary — catches unhandled React errors and displays
 * a fallback UI instead of crashing the entire app.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {hasError: false, error: null};
  }

  static getDerivedStateFromError(error: Error): State {
    return {hasError: true, error};
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({hasError: false, error: null});
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>Terjadi Kesalahan</Text>
          <Text style={styles.message}>
            Aplikasi mengalami error yang tidak terduga. Silakan coba lagi.
          </Text>
          {__DEV__ && this.state.error && (
            <Text style={styles.errorDetail}>
              {this.state.error.message}
            </Text>
          )}
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    backgroundColor: theme.colors.background,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: theme.colors.text.primary,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
    maxWidth: 320,
  },
  errorDetail: {
    fontSize: 12,
    color: theme.colors.status.error,
    textAlign: "center",
    marginBottom: 16,
    fontFamily: "monospace",
    maxWidth: 320,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
