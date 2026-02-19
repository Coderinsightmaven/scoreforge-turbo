import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors } from "@/constants/colors";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.iconBox}>
            <Text style={styles.iconText}>!</Text>
          </View>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.description}>An unexpected error occurred. Please try again.</Text>
          {this.state.error && (
            <Text style={styles.errorDetail} selectable>
              {this.state.error.message}
              {"\n\n"}
              {this.state.error.stack?.slice(0, 500)}
            </Text>
          )}
          <TouchableOpacity
            style={styles.retryButton}
            onPress={this.handleRetry}
            activeOpacity={0.7}>
            <Text style={styles.retryText}>Retry</Text>
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.dark.bgPage,
    paddingHorizontal: 24,
  },
  iconBox: {
    marginBottom: 24,
    height: 64,
    width: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: Colors.semantic.error,
  },
  iconText: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  title: {
    marginBottom: 8,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.dark.textPrimary,
  },
  description: {
    marginBottom: 24,
    textAlign: "center",
    fontSize: 16,
    color: "#94A3B8",
  },
  errorDetail: {
    marginBottom: 24,
    textAlign: "center",
    fontSize: 12,
    color: "#F87171",
  },
  retryButton: {
    borderRadius: 12,
    backgroundColor: Colors.brand.DEFAULT,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  retryText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
