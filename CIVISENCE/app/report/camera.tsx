import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function CameraScreen() {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContent}>
          <Ionicons name="camera" size={64} color="#3B82F6" />
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionMessage}>
            We need access to your camera to capture issue photos
          </Text>
          <Pressable
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current && !isCapturing) {
      try {
        setIsCapturing(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        setCapturedPhoto(photo.uri);
      } catch (error) {
        console.error("Camera Error:", error);
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const handleConfirm = () => {
    router.back();
    setTimeout(() => {
      router.setParams({ photo: capturedPhoto });
    }, 100);
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  // Show preview if photo is captured
  if (capturedPhoto) {
    return (
      <SafeAreaView style={styles.previewContainer}>
        {/* Preview Image */}
        <Image
          source={{ uri: capturedPhoto }}
          style={styles.previewImage}
          resizeMode="cover"
        />

        {/* Header */}
        <View style={styles.previewHeader}>
          <Pressable
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          <Text style={styles.previewHeaderText}>Photo Preview</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Action Buttons */}
        <View style={styles.previewActions}>
          <Pressable
            style={styles.retakeButton}
            onPress={handleRetake}
          >
            <Ionicons name="refresh" size={24} color="#fff" />
            <Text style={styles.retakeButtonText}>Retake</Text>
          </Pressable>

          <Pressable
            style={styles.confirmButtonWrapper}
            onPress={handleConfirm}
          >
            <LinearGradient
              colors={["#10B981", "#059669"]}
              style={styles.confirmButton}
            >
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.confirmButtonText}>Use Photo</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Camera view
  return (
    <SafeAreaView style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} facing="back">
        {/* Close Button */}
        <View style={styles.headerBar}>
          <Pressable
            style={styles.closeButton}
            onPress={() => router.back()}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </Pressable>
          <Text style={styles.headerText}>Capture Issue</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Instructions */}
        <View style={styles.instructionsBox}>
          <View style={styles.instructionsContent}>
            <Ionicons
              name="information-circle"
              size={24}
              color="#fff"
              style={{ marginBottom: 8 }}
            />
            <Text style={styles.instructionsText}>
              Keep the issue centered and well-lit
            </Text>
          </View>
        </View>

        {/* Capture Frame */}
        <View style={styles.frameContainer}>
          <View style={styles.frameOverlay} />
          <View style={styles.frameBox} />
          <View style={styles.frameOverlay} />
        </View>

        {/* Bottom Controls */}
        <View style={styles.controlsBar}>
          <Pressable
            style={styles.captureButton}
            onPress={takePicture}
            disabled={isCapturing}
          >
            {isCapturing ? (
              <ActivityIndicator color="#1F2937" size="large" />
            ) : (
              <View style={styles.captureButtonInner} />
            )}
          </Pressable>
          <Text style={styles.captureHint}>
            {isCapturing ? "Capturing..." : "Press to capture"}
          </Text>
        </View>
      </CameraView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  camera: {
    flex: 1,
    width: "100%",
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 16,
  },

  /* Permission */
  permissionContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: "#fff",
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1F2937",
    marginTop: 20,
    textAlign: "center",
  },
  permissionMessage: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 20,
  },
  permissionButton: {
    marginTop: 32,
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: "#3B82F6",
    borderRadius: 12,
  },
  permissionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  /* Header */
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  headerText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  closeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  /* Instructions */
  instructionsBox: {
    position: "absolute",
    top: "25%",
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    zIndex: 10,
  },
  instructionsContent: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  instructionsText: {
    color: "#fff",
    fontSize: 15,
    textAlign: "center",
    fontWeight: "600",
  },

  /* Frame */
  frameContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  frameOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    width: "100%",
  },
  frameBox: {
    width: "85%",
    aspectRatio: 4 / 5,
    borderWidth: 2.5,
    borderColor: "#3B82F6",
    borderRadius: 20,
    backgroundColor: "transparent",
  },

  /* Controls */
  controlsBar: {
    paddingBottom: 32,
    paddingTop: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.25)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.4)",
  },
  captureButtonInner: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: "#fff",
  },
  captureHint: {
    color: "#fff",
    fontSize: 12,
    marginTop: 16,
    fontWeight: "600",
  },

  /* Preview */
  previewContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  previewImage: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  previewHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  previewHeaderText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  previewActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 40,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  retakeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
    gap: 8,
  },
  retakeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  confirmButtonWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});