import { useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (data: { code: string; court: string; pin?: string }) => void;
}

export function QRScannerModal({ visible, onClose, onScanned }: QRScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const scannedRef = useRef(false);

  if (!visible) return null;

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scannedRef.current) return;

    // Parse: scoreforge://scorer?code=ABC123&court=court-1&pin=XYZ789
    // Manual parsing to avoid Hermes URL/searchParams issues with custom schemes
    if (!data.startsWith("scoreforge://scorer")) {
      setError("Not a valid ScoreForge QR code");
      return;
    }

    const queryString = data.split("?")[1];
    if (!queryString) {
      setError("QR code is missing required data");
      return;
    }

    const params: Record<string, string> = {};
    for (const pair of queryString.split("&")) {
      const [key, value] = pair.split("=");
      if (key && value) {
        params[key] = decodeURIComponent(value);
      }
    }

    const code = params.code;
    const court = params.court;
    const pin = params.pin;

    if (!code || !court) {
      setError("QR code is missing required data");
      return;
    }

    scannedRef.current = true;
    setError(null);
    onScanned({
      code: code.toUpperCase(),
      court: court.toLowerCase(),
      ...(pin ? { pin: pin.toUpperCase() } : {}),
    });
  };

  const handleClose = () => {
    scannedRef.current = false;
    setError(null);
    onClose();
  };

  // Permission not yet determined
  if (!permission) {
    return (
      <View style={StyleSheet.absoluteFill} className="z-50 bg-black">
        <SafeAreaView className="flex-1 items-center justify-center">
          <Text className="text-white">Loading camera...</Text>
        </SafeAreaView>
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={StyleSheet.absoluteFill} className="z-50 bg-black">
        <SafeAreaView className="flex-1 items-center justify-center px-8">
          <Text className="mb-2 text-center text-lg font-bold text-white">Camera Access</Text>
          <Text className="mb-6 text-center text-sm text-white/70">
            Camera permission is needed to scan QR codes.
          </Text>
          <TouchableOpacity
            className="mb-3 w-full rounded-xl bg-brand py-4"
            onPress={requestPermission}
            activeOpacity={0.8}>
            <Text className="text-center text-base font-bold text-white">Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="w-full rounded-xl border border-white/20 py-4"
            onPress={handleClose}
            activeOpacity={0.8}>
            <Text className="text-center text-base font-medium text-white/70">Cancel</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} className="z-50 bg-black">
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={handleBarCodeScanned}
      />

      {/* Overlay */}
      <SafeAreaView className="flex-1">
        {/* Top bar */}
        <View className="flex-row items-center justify-between px-5 py-3">
          <TouchableOpacity
            className="rounded-full bg-black/50 px-4 py-2"
            onPress={handleClose}
            activeOpacity={0.8}>
            <Text className="text-base font-medium text-white">Cancel</Text>
          </TouchableOpacity>
          <View className="rounded-full bg-black/50 px-4 py-2">
            <Text className="text-sm font-medium text-white">Scan Court QR Code</Text>
          </View>
        </View>

        {/* Center viewfinder */}
        <View className="flex-1 items-center justify-center">
          <View className="h-64 w-64 rounded-3xl border-4 border-white/50" />
        </View>

        {/* Error message */}
        {error && (
          <View className="mx-6 mb-6 rounded-xl bg-error/90 px-4 py-3">
            <Text className="text-center text-sm font-medium text-white">{error}</Text>
            <TouchableOpacity
              onPress={() => {
                setError(null);
                scannedRef.current = false;
              }}
              className="mt-2">
              <Text className="text-center text-sm text-white/80 underline">Try again</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}
