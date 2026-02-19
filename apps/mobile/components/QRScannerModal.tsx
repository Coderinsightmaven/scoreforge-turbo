import { useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";

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

  if (!permission) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.fullscreen]}>
        <SafeAreaView style={styles.centered}>
          <Text style={styles.whiteText}>Loading camera...</Text>
        </SafeAreaView>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[StyleSheet.absoluteFill, styles.fullscreen]}>
        <SafeAreaView style={[styles.centered, { paddingHorizontal: 32 }]}>
          <Text style={styles.permTitle}>Camera Access</Text>
          <Text style={styles.permDesc}>Camera permission is needed to scan QR codes.</Text>
          <TouchableOpacity
            style={styles.allowButton}
            onPress={requestPermission}
            activeOpacity={0.8}>
            <Text style={styles.allowButtonText}>Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButtonPerm}
            onPress={handleClose}
            activeOpacity={0.8}>
            <Text style={styles.cancelButtonPermText}>Cancel</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[StyleSheet.absoluteFill, styles.fullscreen]}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={handleBarCodeScanned}
      />

      <SafeAreaView style={styles.overlayContainer}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleClose} activeOpacity={0.8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.titlePill}>
            <Text style={styles.titlePillText}>Scan Court QR Code</Text>
          </View>
        </View>

        <View style={styles.viewfinderContainer}>
          <View style={styles.viewfinder} />
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              onPress={() => {
                setError(null);
                scannedRef.current = false;
              }}
              style={styles.tryAgain}>
              <Text style={styles.tryAgainText}>Try again</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreen: {
    zIndex: 50,
    backgroundColor: "#000000",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  whiteText: {
    color: "#FFFFFF",
  },
  permTitle: {
    marginBottom: 8,
    textAlign: "center",
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  permDesc: {
    marginBottom: 24,
    textAlign: "center",
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  allowButton: {
    marginBottom: 12,
    width: "100%",
    borderRadius: 12,
    backgroundColor: Colors.brand.DEFAULT,
    paddingVertical: 16,
  },
  allowButtonText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  cancelButtonPerm: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingVertical: 16,
  },
  cancelButtonPermText: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "500",
    color: "rgba(255,255,255,0.7)",
  },
  overlayContainer: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cancelButton: {
    borderRadius: 9999,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  titlePill: {
    borderRadius: 9999,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  titlePillText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  viewfinderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  viewfinder: {
    height: 256,
    width: 256,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.5)",
  },
  errorBox: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 12,
    backgroundColor: "rgba(208,37,60,0.9)",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  tryAgain: {
    marginTop: 8,
  },
  tryAgainText: {
    textAlign: "center",
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textDecorationLine: "underline",
  },
});
