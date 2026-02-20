import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useFocusEffect } from "@react-navigation/native";
import { getApiErrorMessage } from "@/lib/api";
import { logoutUser } from "@/lib/services/auth";
import { ComplaintRecord, getMyComplaints } from "@/lib/services/complaints";
import { removeProfilePhoto, uploadProfilePhoto } from "@/lib/services/users";
import { sessionStore } from "@/lib/session";

const { width, height } = Dimensions.get("window");

type ProfileStat = {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  trend: string;
  bgGradient: [string, string];
};

type ReportCardModel = {
  id: string;
  title: string;
  status: string;
  date: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  priority: string;
  location: string;
};

const categoryToIcon = (category: string): keyof typeof MaterialCommunityIcons.glyphMap => {
  const normalized = category.trim().toLowerCase().replace(/\s+/g, "_");
  if (normalized.includes("pothole")) {
    return "alert-circle-outline";
  }
  if (normalized.includes("garbage")) {
    return "trash-can-outline";
  }
  if (normalized.includes("drain") || normalized.includes("water") || normalized.includes("leak")) {
    return "water";
  }
  if (normalized.includes("streetlight")) {
    return "lightbulb-on-outline";
  }
  return "map-marker-alert-outline";
};

const toPriorityMeta = (level?: string): { label: string; color: string } => {
  if (level === "high") {
    return { label: "High", color: "#ef4444" };
  }
  if (level === "medium") {
    return { label: "Medium", color: "#f59e0b" };
  }
  return { label: "Low", color: "#10b981" };
};

const toStatusColor = (status: string): string => {
  switch (status) {
    case "resolved":
      return "#10b981";
    case "in_progress":
      return "#f59e0b";
    case "assigned":
      return "#3b82f6";
    case "rejected":
      return "#ef4444";
    default:
      return "#6366f1";
  }
};

const toStatusLabel = (status: string): string =>
  status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const toTimeAgo = (value: string): string => {
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) {
    return "Just now";
  }

  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) {
    return `${minutes || 1} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

const formatCoordinates = (complaint: ComplaintRecord): string => {
  const coords = complaint.location?.coordinates;
  if (!coords || coords.length !== 2) {
    return "Unknown area";
  }
  return `${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}`;
};

export default function Profile() {
  const [selectedTab, setSelectedTab] = useState("stats");
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(
    sessionStore.getUser()?.profilePhotoUrl ?? null
  );

  const user = sessionStore.getUser();
  const accessToken = sessionStore.getAccessToken();

  const pulseAnim = useSharedValue(1);
  const slideAnim = useSharedValue(0);
  const rotateAnim = useSharedValue(0);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(withTiming(1.2, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1,
      false
    );

    slideAnim.value = withSpring(1, { damping: 15, stiffness: 100 });

    rotateAnim.value = withRepeat(withTiming(360, { duration: 20000 }), -1, false);
  }, [pulseAnim, rotateAnim, slideAnim]);

  useEffect(() => {
    const unsubscribe = sessionStore.subscribe(() => {
      const nextUser = sessionStore.getUser();
      setProfilePhotoUri(nextUser?.profilePhotoUrl ?? null);
    });
    return unsubscribe;
  }, []);

  const loadProfileData = useCallback(async () => {
    if (!accessToken || !user?.id) {
      setComplaints([]);
      setProfilePhotoUri(null);
      return;
    }

    try {
      const records = await getMyComplaints();
      setComplaints(records);
    } catch (error) {
      Alert.alert("Profile error", getApiErrorMessage(error));
    }
  }, [accessToken, user?.id]);

  useFocusEffect(
    useCallback(() => {
      void loadProfileData();
    }, [loadProfileData])
  );

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const slideStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(slideAnim.value, [0, 1], [50, 0]) }],
    opacity: slideAnim.value,
  }));

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateAnim.value}deg` }],
  }));

  const stats: ProfileStat[] = useMemo(() => {
    const total = complaints.length;
    const inProgress = complaints.filter(
      (item) => item.status === "assigned" || item.status === "in_progress"
    ).length;
    const resolved = complaints.filter((item) => item.status === "resolved").length;

    return [
      {
        label: "Total Reports",
        value: String(total),
        icon: "document-text",
        trend: total > 0 ? `+${total}` : "0",
        bgGradient: ["#6366f1", "#8b5cf6"],
      },
      {
        label: "In Progress",
        value: String(inProgress),
        icon: "hourglass",
        trend: inProgress > 0 ? `+${inProgress}` : "0",
        bgGradient: ["#f59e0b", "#f97316"],
      },
      {
        label: "Resolved",
        value: String(resolved),
        icon: "checkmark-circle",
        trend: resolved > 0 ? `+${resolved}` : "0",
        bgGradient: ["#10b981", "#059669"],
      },
    ];
  }, [complaints]);

  const recentReports = useMemo<ReportCardModel[]>(() => {
    return complaints.slice(0, 3).map((complaint) => {
      const priority = toPriorityMeta(complaint.priority?.level);
      const statusColor = toStatusColor(complaint.status);

      return {
        id: complaint._id,
        title: complaint.title,
        status: toStatusLabel(complaint.status),
        date: toTimeAgo(complaint.createdAt),
        icon: categoryToIcon(complaint.category),
        color: statusColor,
        priority: priority.label,
        location: formatCoordinates(complaint),
      };
    });
  }, [complaints]);

  const zones = useMemo(() => {
    const duplicateCount = complaints.filter((item) => item.duplicateInfo?.isDuplicate).length;
    return [
      {
        name: "My Reports",
        reports: complaints.length,
        resolved: complaints.filter((item) => item.status === "resolved").length,
        active: complaints.filter(
          (item) => item.status === "assigned" || item.status === "in_progress"
        ).length,
        satisfaction: complaints.length === 0 ? 100 : Math.max(55, 100 - duplicateCount * 5),
        responseTime: complaints.length === 0 ? "-" : "AI Routed",
      },
      {
        name: "Duplicates",
        reports: duplicateCount,
        resolved: duplicateCount,
        active: 0,
        satisfaction: duplicateCount === 0 ? 100 : 80,
        responseTime: "Auto merged",
      },
    ];
  }, [complaints]);

  const handlePickProfilePhoto = async () => {
    if (!accessToken) {
      Alert.alert("Login required", "Please login first.");
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to set your profile photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
      return;
    }

    try {
      const newUri = result.assets[0].uri;
      const updatedUser = await uploadProfilePhoto(newUri);
      setProfilePhotoUri(updatedUser.profilePhotoUrl ?? null);
    } catch (error) {
      Alert.alert("Profile photo failed", getApiErrorMessage(error));
    }
  };

  const handleRemoveProfilePhoto = async () => {
    if (!accessToken) {
      return;
    }
    try {
      const updatedUser = await removeProfilePhoto();
      setProfilePhotoUri(updatedUser.profilePhotoUrl ?? null);
    } catch (error) {
      Alert.alert("Profile photo failed", getApiErrorMessage(error));
    }
  };

  const handleLikeReport = () => {
    Alert.alert("Saved", "Tracking opened in your complaint list.", [
      {
        text: "Open Tracker",
        onPress: () => router.push("/track"),
      },
      {
        text: "Close",
        style: "cancel",
      },
    ]);
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      router.replace("/auth/login");
    } catch (error) {
      Alert.alert("Logout failed", getApiErrorMessage(error));
    }
  };

  if (!accessToken || !user) {
    return (
      <LinearGradient colors={["#667eea", "#764ba2", "#f093fb"]} style={styles.container}>
        <View style={styles.loggedOutWrap}>
          <Ionicons name="lock-closed" size={56} color="#fff" />
          <Text style={styles.loggedOutTitle}>Login Required</Text>
          <Text style={styles.loggedOutText}>Sign in to access your profile and reports.</Text>
          <Pressable style={styles.loggedOutButton} onPress={() => router.push("/auth/login")}>
            <Text style={styles.loggedOutButtonText}>Go to Login</Text>
          </Pressable>
        </View>
      </LinearGradient>
    );
  }

  const avatarUri = profilePhotoUri || `https://i.pravatar.cc/200?u=${user.id}`;

  const TabButton = ({ title, isActive, onPress }: { title: string; isActive: boolean; onPress: () => void }) => (
    <Pressable onPress={onPress} style={[styles.tabButton, isActive && styles.activeTab]}>
      <Text style={[styles.tabText, isActive && styles.activeTabText]}>{title}</Text>
      {isActive ? <View style={styles.tabIndicator} /> : null}
    </Pressable>
  );

  const StatCard = ({ stat, index }: { stat: ProfileStat; index: number }) => (
    <Animated.View entering={FadeInUp.delay(index * 100).duration(800)} style={styles.statCardContainer}>
      <LinearGradient colors={stat.bgGradient} style={styles.statCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.statHeader}>
          <View style={styles.statIconContainer}>
            <Ionicons name={stat.icon} size={24} color="white" />
          </View>
          <Text style={styles.statTrend}>{stat.trend}</Text>
        </View>
        <Text style={styles.statValue}>{stat.value}</Text>
        <Text style={styles.statLabel}>{stat.label}</Text>
      </LinearGradient>
    </Animated.View>
  );

  const ReportCard = ({ report, index }: { report: ReportCardModel; index: number }) => (
    <Animated.View entering={FadeInUp.delay(index * 100).duration(600)} style={styles.reportCardContainer}>
      <BlurView intensity={20} style={styles.reportCard}>
        <View style={styles.reportHeader}>
          <View style={[styles.reportIcon, { backgroundColor: `${report.color}20` }]}>
            <MaterialCommunityIcons name={report.icon} size={20} color={report.color} />
          </View>
          <View style={styles.reportInfo}>
            <Text style={styles.reportTitle}>{report.title}</Text>
            <Text style={styles.reportLocation}>Location: {report.location}</Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: report.color }]}>
            <Text style={styles.priorityText}>{report.priority}</Text>
          </View>
        </View>

        <View style={styles.reportFooter}>
          <Text style={styles.reportDate}>{report.date}</Text>
          <View style={styles.reportActions}>
            <Pressable onPress={handleLikeReport} style={styles.likeButton}>
              <Ionicons name="eye" size={16} color="#60a5fa" />
              <Text style={styles.likeCount}>Track</Text>
            </Pressable>
            <View style={[styles.statusBadge, { backgroundColor: `${report.color}15` }]}>
              <Text style={[styles.statusText, { color: report.color }]}>{report.status}</Text>
            </View>
          </View>
        </View>
      </BlurView>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#667eea", "#764ba2", "#f093fb"]} style={StyleSheet.absoluteFillObject}>
        <Animated.View style={[styles.backgroundPattern, rotateStyle]} />
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text style={styles.title}>Profile</Text>
          <Pressable style={styles.settingsButton} onPress={() => router.push("/settings")}>
            <Ionicons name="settings" size={24} color="white" />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(100).duration(800)} style={[styles.profileCard, slideStyle]}>
          <BlurView intensity={40} style={styles.profileBlur}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Image key={avatarUri} source={{ uri: avatarUri }} style={styles.avatar} />
                <Animated.View style={[styles.onlineIndicator, pulseStyle]}>
                  <View style={styles.onlineDot} />
                </Animated.View>
                <Pressable style={styles.avatarEditButton} onPress={() => void handlePickProfilePhoto()}>
                  <Ionicons name="camera" size={14} color="#fff" />
                </Pressable>
              </View>

              <View style={styles.profileInfo}>
                <Text style={styles.name}>{user.name}</Text>
                <Text style={styles.email}>{user.email}</Text>
                <View style={styles.badgeContainer}>
                  <LinearGradient colors={["#fbbf24", "#f59e0b"]} style={styles.badge}>
                    <Ionicons name="star" size={12} color="white" />
                    <Text style={styles.badgeText}>Citizen Reporter</Text>
                  </LinearGradient>
                </View>
              </View>
            </View>

            {profilePhotoUri ? (
              <Pressable style={styles.photoNotice} onPress={() => void handleRemoveProfilePhoto()}>
                <Ionicons name="trash-outline" size={14} color="#fee2e2" />
                <Text style={styles.photoNoticeText}>Tap to remove profile photo</Text>
              </Pressable>
            ) : (
              <View style={styles.photoNotice}>
                <Ionicons name="notifications" size={14} color="#bfdbfe" />
                <Text style={styles.photoNoticeText}>Notification: Set up your profile photo</Text>
              </View>
            )}
          </BlurView>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.tabContainer}>
          <TabButton title="Statistics" isActive={selectedTab === "stats"} onPress={() => setSelectedTab("stats")} />
          <TabButton title="Reports" isActive={selectedTab === "reports"} onPress={() => setSelectedTab("reports")} />
          <TabButton title="Zones" isActive={selectedTab === "zones"} onPress={() => setSelectedTab("zones")} />
        </Animated.View>

        {selectedTab === "stats" ? (
          <View style={styles.tabContent}>
            <View style={styles.statsGrid}>
              {stats.map((stat, index) => (
                <StatCard key={stat.label} stat={stat} index={index} />
              ))}
            </View>
          </View>
        ) : null}

        {selectedTab === "reports" ? (
          <View style={styles.tabContent}>
            {recentReports.length > 0 ? (
              recentReports.map((report, index) => <ReportCard key={report.id} report={report} index={index} />)
            ) : (
              <BlurView intensity={20} style={styles.emptyReports}>
                <Text style={styles.emptyReportsText}>No reports yet. Submit your first complaint.</Text>
              </BlurView>
            )}
          </View>
        ) : null}

        {selectedTab === "zones" ? (
          <View style={styles.tabContent}>
            {zones.map((zone, index) => (
              <Animated.View key={zone.name} entering={FadeInUp.delay(index * 100).duration(600)} style={styles.zoneCardContainer}>
                <BlurView intensity={20} style={styles.zoneCard}>
                  <View style={styles.zoneHeader}>
                    <LinearGradient colors={["#6366f1", "#8b5cf6"]} style={styles.zoneIcon}>
                      <Ionicons name="location" size={18} color="white" />
                    </LinearGradient>
                    <View style={styles.zoneInfo}>
                      <Text style={styles.zoneName}>{zone.name}</Text>
                      <Text style={styles.zoneStats}>
                        {zone.reports} reports | {zone.responseTime}
                      </Text>
                    </View>
                    <View style={styles.satisfactionContainer}>
                      <Text style={styles.satisfactionText}>{zone.satisfaction}%</Text>
                      <Text style={styles.satisfactionLabel}>Satisfaction</Text>
                    </View>
                  </View>

                  <View style={styles.zoneProgress}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${zone.reports > 0 ? (zone.resolved / zone.reports) * 100 : 100}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {zone.resolved}/{zone.reports} resolved
                    </Text>
                  </View>
                </BlurView>
              </Animated.View>
            ))}
          </View>
        ) : null}

        <Animated.View entering={FadeInUp.delay(400).duration(600)} style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            {[
              { icon: "camera-outline", label: "Set Photo", color: "#3b82f6", onPress: () => void handlePickProfilePhoto() },
              { icon: "notifications-outline", label: "Alerts", color: "#f59e0b", onPress: () => router.push("/settings") },
              { icon: "list-outline", label: "Track", color: "#10b981", onPress: () => router.push("/track") },
              { icon: "help-circle-outline", label: "Help", color: "#6366f1", onPress: () => Alert.alert("Help", "Support is available in Settings.") },
            ].map((action, index) => (
              <Animated.View key={action.label} entering={FadeInUp.delay(450 + index * 50).duration(500)}>
                <Pressable style={styles.actionButton} onPress={action.onPress}>
                  <LinearGradient colors={[action.color, `${action.color}80`]} style={styles.actionIconContainer}>
                    <Ionicons name={action.icon as keyof typeof Ionicons.glyphMap} size={20} color="white" />
                  </LinearGradient>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(500).duration(600)} style={styles.logoutContainer}>
          <Pressable onPress={() => void handleLogout()}>
            <LinearGradient colors={["#ef4444", "#dc2626"]} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={18} color="white" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loggedOutWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loggedOutTitle: {
    marginTop: 14,
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  loggedOutText: {
    marginTop: 8,
    fontSize: 14,
    color: "rgba(255,255,255,0.88)",
    textAlign: "center",
  },
  loggedOutButton: {
    marginTop: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  loggedOutButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  backgroundPattern: {
    position: "absolute",
    width: width * 2,
    height: height * 2,
    top: -height / 2,
    left: -width / 2,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: width,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    flex: 1,
    textAlign: "center",
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    overflow: "hidden",
  },
  profileBlur: {
    padding: 20,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: "white",
  },
  avatarEditButton: {
    position: "absolute",
    bottom: -2,
    left: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10b981",
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 8,
  },
  badgeContainer: {
    alignSelf: "flex-start",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "white",
  },
  photoNotice: {
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "rgba(15,23,42,0.28)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  photoNoticeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  tabContainer: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 16,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    position: "relative",
  },
  activeTab: {
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },
  activeTabText: {
    color: "#667eea",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 2,
    width: 20,
    height: 2,
    backgroundColor: "#667eea",
    borderRadius: 1,
  },
  tabContent: {
    paddingHorizontal: 20,
  },
  statsGrid: {
    gap: 12,
  },
  statCardContainer: {
    marginBottom: 12,
  },
  statCard: {
    padding: 16,
    borderRadius: 16,
    minHeight: 100,
  },
  statHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  statTrend: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  reportCardContainer: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
  },
  reportCard: {
    padding: 16,
  },
  reportHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  reportIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "white",
    marginBottom: 2,
  },
  reportLocation: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    color: "white",
    fontWeight: "600",
  },
  reportFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reportDate: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
  },
  reportActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  likeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  likeCount: {
    fontSize: 12,
    color: "white",
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  emptyReports: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  emptyReportsText: {
    color: "#fff",
    fontSize: 13,
    textAlign: "center",
  },
  zoneCardContainer: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: "hidden",
  },
  zoneCard: {
    padding: 16,
  },
  zoneHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  zoneIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  zoneInfo: {
    flex: 1,
  },
  zoneName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "white",
    marginBottom: 2,
  },
  zoneStats: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  satisfactionContainer: {
    alignItems: "center",
  },
  satisfactionText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#10b981",
  },
  satisfactionLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.7)",
  },
  zoneProgress: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 3,
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10b981",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  quickActions: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    alignItems: "center",
    width: (width - 80) / 4,
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: "white",
    fontWeight: "500",
    textAlign: "center",
  },
  logoutContainer: {
    marginHorizontal: 20,
    marginTop: 10,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  logoutText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
