import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Modal,
  Dimensions,
  Animated as RNAnimated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get('window');

const MOCK_COMPLAINTS = [
  {
    id: "1",
    title: "Pothole on Main Street",
    status: "In Progress",
    priority: "High",
    date: "2024-02-01",
    icon: "alert-circle",
    progress: 65,
    location: "Downtown",
    image: "https://via.placeholder.com/400x300?text=Pothole",
    description: "Large pothole in the middle of Main Street causing traffic hazard.",
    category: "Pothole",
    updates: [
      { date: "2024-02-01", message: "Report submitted", status: "submitted" },
      { date: "2024-02-02", message: "Assigned to maintenance team", status: "assigned" },
      { date: "2024-02-03", message: "Work in progress", status: "in_progress" },
    ],
  },
  {
    id: "2",
    title: "Broken Streetlight",
    status: "Assigned",
    priority: "Medium",
    date: "2024-01-30",
    icon: "sunny",
    progress: 35,
    location: "West Side",
    image: "https://via.placeholder.com/400x300?text=Streetlight",
    description: "Streetlight not functioning at the intersection of Park Road.",
    category: "Streetlight",
    updates: [
      { date: "2024-01-30", message: "Report submitted", status: "submitted" },
      { date: "2024-02-01", message: "Assigned to electrical team", status: "assigned" },
    ],
  },
  {
    id: "3",
    title: "Garbage Accumulation",
    status: "Resolved",
    priority: "Low",
    date: "2024-01-28",
    icon: "trash",
    progress: 100,
    location: "East Park",
    image: "https://via.placeholder.com/400x300?text=Garbage",
    description: "Overflowing garbage bins in the park area.",
    category: "Garbage",
    updates: [
      { date: "2024-01-28", message: "Report submitted", status: "submitted" },
      { date: "2024-01-29", message: "Assigned to sanitation team", status: "assigned" },
      { date: "2024-02-01", message: "Area cleaned and resolved", status: "resolved" },
    ],
  },
];

function ComplaintCard({ complaint, onPress }: any) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Resolved":
        return ["#10b981", "#059669"];
      case "In Progress":
        return ["#f59e0b", "#d97706"];
      case "Assigned":
        return ["#3b82f6", "#2563eb"];
      default:
        return ["#6b7280", "#4b5563"];
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "#ef4444";
      case "Medium":
        return "#f59e0b";
      case "Low":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  const statusColors = getStatusColor(complaint.status);

  return (
    <Pressable onPress={onPress}>
      <Animated.View entering={FadeInUp.delay(100)} style={styles.card}>
        <LinearGradient
          colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.85)']}
          style={styles.cardGradient}
        >
          {/* Priority Indicator Strip */}
          <View style={[styles.priorityStrip, { backgroundColor: getPriorityColor(complaint.priority) }]} />
          
          <View style={styles.cardHeader}>
            <LinearGradient
              colors={statusColors as any}
              style={styles.cardIconGradient}
            >
              <Ionicons name={complaint.icon as any} size={24} color="#fff" />
            </LinearGradient>
            
            <View style={styles.cardHeaderContent}>
              <Text style={styles.cardTitle} numberOfLines={2}>{complaint.title}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color="#64748b" />
                <Text style={styles.cardLocation}>{complaint.location}</Text>
                <Text style={styles.cardDivider}>•</Text>
                <Text style={styles.cardDate}>{complaint.date}</Text>
              </View>
            </View>
          </View>

          {/* Progress Section */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Progress</Text>
              <Text style={styles.progressPercentage}>{complaint.progress}%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <LinearGradient
                colors={statusColors as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBar, { width: `${complaint.progress}%` }]}
              />
            </View>
          </View>

          {/* Status and Priority Row */}
          <View style={styles.cardFooter}>
            <LinearGradient
              colors={statusColors as any}
              style={styles.statusBadge}
            >
              <Ionicons name="checkmark-circle" size={14} color="#fff" />
              <Text style={styles.statusText}>{complaint.status}</Text>
            </LinearGradient>
            
            <View style={[styles.priorityBadge, { borderColor: getPriorityColor(complaint.priority) }]}>
              <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(complaint.priority) }]} />
              <Text style={[styles.priorityText, { color: getPriorityColor(complaint.priority) }]}>
                {complaint.priority}
              </Text>
            </View>
          </View>

          {/* Chevron */}
          <View style={styles.chevronContainer}>
            <Ionicons name="chevron-forward" size={22} color="#cbd5e1" />
          </View>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}

function ReportDetailModal({ complaint, visible, onClose }: any) {
  const scrollY = useRef(new RNAnimated.Value(0)).current;
  const scrollViewRef = useRef(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => {
        return Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy);
      },
      onPanResponderRelease: (_, { vx, dx }) => {
        if (dx > 50 || vx > 0.7) {
          onClose();
        }
      },
    })
  ).current;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Resolved":
        return ["#10b981", "#059669"];
      case "In Progress":
        return ["#f59e0b", "#d97706"];
      case "Assigned":
        return ["#3b82f6", "#2563eb"];
      default:
        return ["#6b7280", "#4b5563"];
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "#ef4444";
      case "Medium":
        return "#f59e0b";
      case "Low":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };

  const handleScroll = RNAnimated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  const imageHeight = scrollY.interpolate({
    inputRange: [0, 300],
    outputRange: [300, 0],
    extrapolate: "clamp",
  });

  const imageOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [1.3, 1, 0.9],
    extrapolate: "clamp",
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [150, 200],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  if (!complaint) return null;

  const statusColors = getStatusColor(complaint.status);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {/* Animated Header */}
        <RNAnimated.View
          style={[
            styles.animatedHeader,
            { opacity: headerOpacity },
          ]}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.98)', 'rgba(255,255,255,0.95)']}
            style={styles.headerGradient}
          >
            <Pressable onPress={onClose} style={styles.headerBackButton}>
              <Ionicons name="arrow-back" size={24} color="#1e293b" />
            </Pressable>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {complaint.title}
            </Text>
            <View style={{ width: 40 }} />
          </LinearGradient>
        </RNAnimated.View>

        {/* Scrollable Content */}
        <RNAnimated.ScrollView
          ref={scrollViewRef}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          {...panResponder.panHandlers}
        >
          {/* Hero Image with Overlay */}
          <RNAnimated.View
            style={[
              styles.heroImageWrapper,
              {
                height: imageHeight,
                opacity: imageOpacity,
              },
            ]}
          >
            <RNAnimated.Image
              source={{ uri: complaint.image }}
              style={[
                styles.heroImage,
                {
                  transform: [{ scale: imageScale }],
                },
              ]}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.4)']}
              style={styles.imageOverlay}
            />
            
            {/* Floating Back Button */}
            <View style={styles.floatingBackBtnContainer}>
              <Pressable onPress={onClose} style={styles.floatingBackBtn}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </Pressable>
            </View>

            {/* Category Badge on Image */}
            <View style={styles.categoryBadgeContainer}>
              <View style={styles.categoryBadge}>
                <Ionicons name={complaint.icon} size={16} color="#fff" />
                <Text style={styles.categoryText}>{complaint.category}</Text>
              </View>
            </View>
          </RNAnimated.View>

          {/* Main Content Card */}
          <View style={styles.mainContentCard}>
            {/* Title Section */}
            <View style={styles.titleSection}>
              <Text style={styles.modalTitle}>{complaint.title}</Text>
              
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="location" size={18} color="#3b82f6" />
                  <Text style={styles.metaText}>{complaint.location}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={18} color="#3b82f6" />
                  <Text style={styles.metaText}>{complaint.date}</Text>
                </View>
              </View>
            </View>

            {/* Status Card with Gradient */}
            <LinearGradient
              colors={statusColors as any}
              style={styles.statusCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.statusCardContent}>
                <View style={styles.statusCardHeader}>
                  <View>
                    <Text style={styles.statusCardLabel}>Current Status</Text>
                    <Text style={styles.statusCardValue}>{complaint.status}</Text>
                  </View>
                  <View style={styles.priorityBadgeLarge}>
                    <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(complaint.priority) }]} />
                    <Text style={styles.priorityTextLarge}>{complaint.priority} Priority</Text>
                  </View>
                </View>

                {/* Progress */}
                <View style={styles.progressSectionLarge}>
                  <View style={styles.progressHeaderLarge}>
                    <Text style={styles.progressLabelLarge}>Progress</Text>
                    <Text style={styles.progressPercentageLarge}>{complaint.progress}%</Text>
                  </View>
                  <View style={styles.progressBarContainerLarge}>
                    <View
                      style={[
                        styles.progressBarLarge,
                        { width: `${complaint.progress}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressStatusText}>
                    {complaint.progress === 100 ? "✓ Completed" : `${100 - complaint.progress}% remaining`}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {/* Description Card */}
            <View style={styles.descriptionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text-outline" size={20} color="#1e293b" />
                <Text style={styles.sectionTitle}>Description</Text>
              </View>
              <Text style={styles.descriptionText}>{complaint.description}</Text>
            </View>

            {/* Updates Timeline */}
            <View style={styles.timelineCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="time-outline" size={20} color="#1e293b" />
                <Text style={styles.sectionTitle}>Timeline</Text>
              </View>

              {complaint.updates.map((update: any, index: number) => (
                <View key={index} style={styles.timelineItem}>
                  <View style={styles.timelineDotContainer}>
                    <View
                      style={[
                        styles.timelineDot,
                        {
                          backgroundColor:
                            update.status === "resolved"
                              ? "#10b981"
                              : update.status === "in_progress"
                              ? "#f59e0b"
                              : "#3b82f6",
                        },
                      ]}
                    >
                      <Ionicons 
                        name={
                          update.status === "resolved" 
                            ? "checkmark" 
                            : update.status === "in_progress"
                            ? "time"
                            : "arrow-forward"
                        } 
                        size={12} 
                        color="#fff" 
                      />
                    </View>
                    {index !== complaint.updates.length - 1 && (
                      <View style={styles.timelineLine} />
                    )}
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineMessage}>{update.message}</Text>
                    <Text style={styles.timelineDate}>{update.date}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.bottomPadding} />
        </RNAnimated.ScrollView>
      </View>
    </Modal>
  );
}

export default function TrackComplaints() {
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleComplaintPress = (complaint: any) => {
    setSelectedComplaint(complaint);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setTimeout(() => setSelectedComplaint(null), 300);
  };

  return (
    <LinearGradient
      colors={["#f8fafc", "#f1f5f9", "#e2e8f0"]}
      style={styles.container}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
        <LinearGradient
          colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
          style={styles.headerContent}
        >
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </Pressable>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>My Reports</Text>
            <Text style={styles.headerSubtitle}>{MOCK_COMPLAINTS.length} active complaints</Text>
          </View>
          <View style={{ width: 40 }} />
        </LinearGradient>
      </Animated.View>

      {/* Complaints List */}
      <FlatList
        data={MOCK_COMPLAINTS}
        renderItem={({ item }) => (
          <ComplaintCard
            complaint={item}
            onPress={() => handleComplaintPress(item)}
          />
        )}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <ReportDetailModal
        complaint={selectedComplaint}
        visible={modalVisible}
        onClose={handleCloseModal}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  /* Header */
  header: {
    paddingTop: 50,
    paddingBottom: 8,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 16,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },

  /* List */
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },

  /* Card */
  card: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardGradient: {
    padding: 20,
    position: "relative",
  },
  priorityStrip: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardIconGradient: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeaderContent: {
    flex: 1,
    paddingTop: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 6,
    lineHeight: 22,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardLocation: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "500",
  },
  cardDivider: {
    color: "#cbd5e1",
    marginHorizontal: 4,
  },
  cardDate: {
    fontSize: 13,
    color: "#64748b",
  },

  /* Progress */
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },

  /* Card Footer */
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
    flex: 1,
  },
  statusText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
    backgroundColor: "#fff",
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 13,
    fontWeight: "700",
  },
  chevronContainer: {
    position: "absolute",
    right: 16,
    top: 20,
  },

  /* Modal */
  modalContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  /* Animated Header */
  animatedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerGradient: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
    textAlign: "center",
    paddingHorizontal: 8,
  },

  /* Scroll View */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  /* Hero Image */
  heroImageWrapper: {
    width: "100%",
    overflow: "hidden",
    backgroundColor: "#cbd5e1",
  },
  heroImage: {
    width: "100%",
    height: 300,
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  floatingBackBtnContainer: {
    position: "absolute",
    top: 50,
    left: 16,
    zIndex: 10,
  },
  floatingBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryBadgeContainer: {
    position: "absolute",
    bottom: 16,
    left: 16,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  categoryText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  /* Main Content */
  mainContentCard: {
    backgroundColor: "#f8fafc",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  /* Title Section */
  titleSection: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 16,
    lineHeight: 32,
  },
  metaRow: {
    flexDirection: "row",
    gap: 20,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "500",
  },

  /* Status Card */
  statusCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  statusCardContent: {
    gap: 16,
  },
  statusCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  statusCardLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    marginBottom: 4,
  },
  statusCardValue: {
    fontSize: 20,
    color: "#fff",
    fontWeight: "800",
  },
  priorityBadgeLarge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  priorityTextLarge: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },

  /* Progress Large */
  progressSectionLarge: {
    gap: 8,
  },
  progressHeaderLarge: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLabelLarge: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  progressPercentageLarge: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "800",
  },
  progressBarContainerLarge: {
    height: 10,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBarLarge: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 5,
  },
  progressStatusText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },

  /* Description Card */
  descriptionCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
  },
  descriptionText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
  },

  /* Timeline */
  timelineCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  timelineItem: {
    flexDirection: "row",
    marginTop: 16,
  },
  timelineDotContainer: {
    alignItems: "center",
    marginRight: 16,
    paddingTop: 2,
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#e2e8f0",
    marginTop: 8,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 2,
  },
  timelineMessage: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "600",
    marginBottom: 4,
  },
  timelineDate: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },

  bottomPadding: {
    height: 20,
  },
});