import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

const { width } = Dimensions.get("window");

const CATEGORIES = [
  { id: 1, name: "Pothole", icon: "alert-circle", color: "#FF6B6B", bg: "#FFE5E5" },
  { id: 2, name: "Streetlight", icon: "sunny", color: "#F59E0B", bg: "#FFF4E5" },
  { id: 3, name: "Garbage", icon: "trash", color: "#10B981", bg: "#E5F9F1" },
  { id: 4, name: "Water Leak", icon: "water", color: "#3B82F6", bg: "#E5F0FF" },
  { id: 5, name: "Traffic Sign", icon: "alert", color: "#8B5CF6", bg: "#F3E5FF" },
  { id: 6, name: "Other", icon: "help-circle", color: "#6B7280", bg: "#F3F4F6" },
];

export default function ReportIssue() {
  const params = useLocalSearchParams();
  const scrollViewRef = useRef(null);
  
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Update image when params change
  useEffect(() => {
    if (params?.photo) {
      setImage(String(params.photo));
    }
  }, [params?.photo]);

  useEffect(() => {
    if (image && !location) {
      getCurrentLocation();
    }
  }, [image]);

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required");
        setLocationLoading(false);
        return;
      }

      const userLocation = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = userLocation.coords;

      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses.length > 0) {
        const addr = addresses[0];
        const fullAddress = `${addr.street || ""}, ${addr.city || ""}, ${
          addr.region || ""
        }`
          .replace(/^,\s*/, "")
          .replace(/,\s*$/, "");
        setLocation(
          fullAddress || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
        );
      } else {
        setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }
    } catch (error) {
      console.error("Location Error:", error);
      Alert.alert("Error", "Could not get your location. Please try again.");
    } finally {
      setLocationLoading(false);
    }
  };

  const handlePhotoCapture = () => {
    router.push("/report/camera");
  };

  const handleRemovePhoto = () => {
    setImage(null);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmation(false);
    setLoading(true);

    try {
      // Mock API call - replace with actual API
      setTimeout(() => {
        setLoading(false);
        setShowSuccess(true);
      }, 2000);
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", "Failed to report issue");
    }
  };

  const handleSubmit = () => {
    if (!image) {
      Alert.alert("Required", "Please take a photo of the issue");
      return;
    }
    if (!category) {
      Alert.alert("Required", "Please select a category");
      return;
    }
    if (!location) {
      Alert.alert("Required", "Please get your location");
      return;
    }
    if (description.trim().length > 0 && description.trim().length < 10) {
      Alert.alert("Invalid", "Description should be at least 10 characters or leave it empty");
      return;
    }

    setShowConfirmation(true);
  };

  const isPhotoValid = !!image;
  const isCategoryValid = !!category;
  const isLocationValid = !!location;
  const isDescriptionValid = description.trim().length === 0 || description.trim().length >= 10;
  const isFormValid =
    isPhotoValid && isCategoryValid && isLocationValid && isDescriptionValid;

  const getCategoryColor = () => {
    const cat = CATEGORIES.find(c => c.name === category);
    return cat ? cat.color : "#3B82F6";
  };

  return (
    <LinearGradient
      colors={["#FFFFFF", "#F8FAFC", "#FFFFFF"]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#1F2937" />
          </Pressable>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Report Issue</Text>
          </View>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Photo Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="camera" size={20} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Take a Photo</Text>
            </View>

            {!image ? (
              <Pressable
                style={styles.photoButton}
                onPress={handlePhotoCapture}
              >
                <LinearGradient
                  colors={["#3B82F6", "#1E40AF"]}
                  style={styles.photoButtonGradient}
                >
                  <Ionicons name="camera" size={28} color="#fff" />
                  <Text style={styles.photoButtonText}>Tap to Capture Photo</Text>
                </LinearGradient>
              </Pressable>
            ) : (
              <View style={styles.photoPreviewContainer}>
                <Image
                  source={{ uri: image }}
                  style={styles.photoPreview}
                  resizeMode="cover"
                />
                <View style={styles.photoCheckmark}>
                  <Ionicons name="checkmark-circle" size={40} color="#10B981" />
                </View>
                <View style={styles.photoActions}>
                  <Pressable
                    style={styles.photoActionBtn}
                    onPress={handlePhotoCapture}
                  >
                    <Ionicons name="refresh" size={18} color="#3B82F6" />
                    <Text style={styles.photoActionText}>Retake</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.photoActionBtn, styles.photoActionBtnDanger]}
                    onPress={handleRemovePhoto}
                  >
                    <Ionicons name="trash" size={18} color="#FF6B6B" />
                    <Text style={[styles.photoActionText, styles.photoActionTextDanger]}>
                      Remove
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          {/* Category Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list" size={20} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>Select Category</Text>
            </View>

            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    category === cat.name && styles.categoryCardActive,
                  ]}
                  onPress={() => setCategory(cat.name)}
                >
                  <View
                    style={[
                      styles.categoryIconBox,
                      {
                        backgroundColor: category === cat.name ? cat.color : cat.bg,
                      },
                    ]}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={24}
                      color={cat.color}
                    />
                  </View>
                  <Text style={[
                    styles.categoryName,
                    category === cat.name && styles.categoryNameActive,
                  ]}>
                    {cat.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Location Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location" size={20} color="#10B981" />
              <Text style={styles.sectionTitle}>Location</Text>
            </View>

            {locationLoading ? (
              <View style={styles.locationBox}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.locationLoadingText}>
                  Getting location...
                </Text>
              </View>
            ) : location ? (
              <View style={styles.locationBox}>
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color="#10B981"
                />
                <View style={styles.locationContent}>
                  <Text style={styles.locationText}>{location}</Text>
                </View>
              </View>
            ) : null}

            <Pressable
              style={[
                styles.getLocationBtn,
                location && styles.getLocationBtnActive,
              ]}
              onPress={getCurrentLocation}
              disabled={locationLoading}
            >
              <Ionicons
                name={location ? "refresh" : "location"}
                size={18}
                color={location ? "#10B981" : "#3B82F6"}
              />
              <Text
                style={[
                  styles.getLocationBtnText,
                  location && styles.getLocationBtnTextActive,
                ]}
              >
                {location ? "Refresh Location" : "Get Current Location"}
              </Text>
            </Pressable>
          </View>

          {/* Description Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={20} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.optional}>(Optional)</Text>
            </View>

            <View style={styles.inputBox}>
              <TextInput
                style={styles.textarea}
                placeholder="Describe the issue (optional - helps us resolve it faster)"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
                maxLength={500}
              />
            </View>

            <View style={styles.charCount}>
              <Text style={styles.charCountText}>
                {description.length}/500 characters
              </Text>
              {description.trim().length >= 10 && (
                <View style={styles.validBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.validText}>Good description!</Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Bottom Button */}
        <View style={styles.bottomButton}>
          <LinearGradient
            colors={
              isFormValid
                ? ["#3B82F6", "#1E40AF"]
                : ["#D1D5DB", "#9CA3AF"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            <Pressable
              onPress={handleSubmit}
              disabled={!isFormValid}
              style={styles.submitButton}
            >
              <Text style={styles.submitButtonText}>Review & Submit</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </Pressable>
          </LinearGradient>
        </View>
      </KeyboardAvoidingView>

      {/* Confirmation Modal */}
      <Modal visible={showConfirmation} transparent animationType="slide">
        <View style={styles.confirmationOverlay}>
          <View style={styles.confirmationCard}>
            <View style={styles.confirmationHeader}>
              <Text style={styles.confirmationTitle}>Review Your Report</Text>
              <Text style={styles.confirmationSubtitle}>
                Please verify the details before submitting
              </Text>
            </View>

            <ScrollView style={styles.confirmationContent} showsVerticalScrollIndicator={false}>
              {/* Photo Preview */}
              <View style={styles.confirmationItem}>
                <View style={styles.confirmationItemHeader}>
                  <Ionicons name="camera" size={20} color="#3B82F6" />
                  <Text style={styles.confirmationItemTitle}>Photo</Text>
                </View>
                {image && (
                  <Image
                    source={{ uri: image }}
                    style={styles.confirmationPhoto}
                    resizeMode="cover"
                  />
                )}
              </View>

              {/* Category */}
              <View style={styles.confirmationItem}>
                <View style={styles.confirmationItemHeader}>
                  <Ionicons name="list" size={20} color={getCategoryColor()} />
                  <Text style={styles.confirmationItemTitle}>Category</Text>
                </View>
                <View style={[styles.confirmationBadge, { backgroundColor: getCategoryColor() + "20" }]}>
                  <Text style={[styles.confirmationBadgeText, { color: getCategoryColor() }]}>
                    {category}
                  </Text>
                </View>
              </View>

              {/* Location */}
              <View style={styles.confirmationItem}>
                <View style={styles.confirmationItemHeader}>
                  <Ionicons name="location" size={20} color="#10B981" />
                  <Text style={styles.confirmationItemTitle}>Location</Text>
                </View>
                <Text style={styles.confirmationDetailText}>{location}</Text>
              </View>

              {/* Description */}
              {description && description.trim().length > 0 && (
                <View style={styles.confirmationItem}>
                  <View style={styles.confirmationItemHeader}>
                    <Ionicons name="document-text" size={20} color="#F59E0B" />
                    <Text style={styles.confirmationItemTitle}>Description</Text>
                  </View>
                  <Text style={styles.confirmationDetailText}>{description}</Text>
                </View>
              )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.confirmationActions}>
              <Pressable
                style={styles.confirmationBtnCancel}
                onPress={() => setShowConfirmation(false)}
              >
                <Text style={styles.confirmationBtnCancelText}>Edit</Text>
              </Pressable>

              <LinearGradient
                colors={["#3B82F6", "#1E40AF"]}
                style={styles.confirmationBtnSubmit}
              >
                <Pressable
                  onPress={handleConfirmSubmit}
                  disabled={loading}
                  style={styles.confirmationBtnSubmitPress}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="send" size={18} color="#fff" />
                      <Text style={styles.confirmationBtnSubmitText}>
                        Submit Report
                      </Text>
                    </>
                  )}
                </Pressable>
              </LinearGradient>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={100} color="#10B981" />
            </View>

            <Text style={styles.successTitle}>Issue Reported!</Text>
            <Text style={styles.successMessage}>
              Your complaint has been successfully submitted to the nearest municipality. You can track its progress anytime.
            </Text>

            {/* Action Buttons */}
            <View style={styles.successActions}>
              <Pressable
                style={styles.successBtnSecondary}
                onPress={() => {
                  setShowSuccess(false);
                  setCategory("");
                  setDescription("");
                  setLocation("");
                  setImage(null);
                  router.push("/");
                }}
              >
                <Ionicons name="home" size={20} color="#3B82F6" />
                <Text style={styles.successBtnSecondaryText}>Back to Home</Text>
              </Pressable>

              <Pressable
                style={styles.successBtnPrimaryWrapper}
                onPress={() => {
                  setShowSuccess(false);
                  setCategory("");
                  setDescription("");
                  setLocation("");
                  setImage(null);
                  router.push("/track");
                }}
              >
                <LinearGradient
                  colors={["#3B82F6", "#1E40AF"]}
                  style={styles.successBtnPrimary}
                >
                  <Ionicons name="list" size={20} color="#fff" />
                  <Text style={styles.successBtnPrimaryText}>Track Complaints</Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },

  /* Header */
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1F2937",
  },

  /* Section */
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  optional: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
    marginLeft: "auto",
  },

  /* Photo - New Design */
  photoButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  photoButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 12,
  },
  photoButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  photoPreviewContainer: {
    position: "relative",
  },
  photoPreview: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
  },
  photoCheckmark: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
  },
  photoActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    gap: 8,
  },
  photoActionBtnDanger: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
  },
  photoActionText: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "600",
  },
  photoActionTextDanger: {
    color: "#FF6B6B",
  },

  /* Category */
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryCard: {
    width: (width - 60) / 3,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  categoryCardActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  categoryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  categoryName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
  },
  categoryNameActive: {
    color: "#3B82F6",
  },

  /* Location */
  locationBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    gap: 12,
  },
  locationContent: {
    flex: 1,
  },
  locationText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
  },
  locationLoadingText: {
    fontSize: 13,
    color: "#3B82F6",
    fontWeight: "600",
  },
  getLocationBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    gap: 8,
  },
  getLocationBtnActive: {
    backgroundColor: "#F0FDF4",
    borderColor: "#DCFCE7",
  },
  getLocationBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#3B82F6",
  },
  getLocationBtnTextActive: {
    color: "#10B981",
  },

  /* Input - Improved */
  inputBox: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textarea: {
    color: "#1F2937",
    fontSize: 14,
    textAlignVertical: "top",
    minHeight: 100,
    lineHeight: 20,
  },
  charCount: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  charCountText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  validBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  validText: {
    fontSize: 11,
    color: "#10B981",
    fontWeight: "600",
  },

  /* Bottom Button */
  bottomButton: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  submitGradient: {
    borderRadius: 12,
    overflow: "hidden",
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  /* Confirmation Modal */
  confirmationOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  confirmationCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingTop: 20,
  },
  confirmationHeader: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  confirmationTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1F2937",
  },
  confirmationSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  confirmationContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    maxHeight: "60%",
  },
  confirmationItem: {
    marginBottom: 18,
  },
  confirmationItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  confirmationItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  confirmationPhoto: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  confirmationBadge: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  confirmationBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  confirmationDetailText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
  },
  confirmationActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  confirmationBtnCancel: {
    flex: 0.4,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  confirmationBtnCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
  },
  confirmationBtnSubmit: {
    flex: 0.6,
    borderRadius: 10,
    overflow: "hidden",
  },
  confirmationBtnSubmitPress: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 8,
  },
  confirmationBtnSubmitText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  /* Success Modal - Updated */
  successOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  successCard: {
    width: width - 48,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#10B981",
    marginBottom: 12,
  },
  successMessage: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  successActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  successBtnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    gap: 8,
  },
  successBtnSecondaryText: {
    color: "#3B82F6",
    fontSize: 14,
    fontWeight: "700",
  },
  successBtnPrimaryWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  successBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  successBtnPrimaryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});