import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

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
        <View className="flex-1 items-center justify-center bg-gray-900 px-6">
          <View className="mb-6 h-16 w-16 items-center justify-center rounded-2xl bg-red-500">
            <Text className="text-3xl font-bold text-white">!</Text>
          </View>
          <Text className="mb-2 text-center text-xl font-bold text-white">
            Something went wrong
          </Text>
          <Text className="mb-6 text-center text-base text-gray-400">
            An unexpected error occurred. Please try again.
          </Text>
          <TouchableOpacity
            className="rounded-lg bg-brand px-8 py-3"
            onPress={this.handleRetry}
            activeOpacity={0.7}>
            <Text className="text-base font-semibold text-white">Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}
