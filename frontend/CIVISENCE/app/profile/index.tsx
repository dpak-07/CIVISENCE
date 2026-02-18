import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ScrollView,
  Dimensions,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  interpolate,
  runOnJS,
  withSpring,
} from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

const { width, height } = Dimensions.get("window");

export default function Profile() {
  const [selectedTab, setSelectedTab] = useState("stats");
  const [isOnline, setIsOnline] = useState(true);
  
  // Animation values
  const pulseAnim = useSharedValue(1);
  const slideAnim = useSharedValue(0);
  const rotateAnim = useSharedValue(0);
  
  useEffect(() => {
    // Continuous pulse animation for online indicator
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      false
    );
    
    // Slide in animation
    slideAnim.value = withSpring(1, { damping: 15, stiffness: 100 });
    
    // Rotate animation for achievement badges
    rotateAnim.value = withRepeat(
      withTiming(360, { duration: 20000 }),
      -1,
      false
    );
  }, []);

  const stats = [
    { 
      label: "Total Reports", 
      value: "24", 
      icon: "document-text", 
      color: "#6366f1",
      trend: "+12%",
      bgGradient: ["#6366f1", "#8b5cf6"]
    },
    { 
      label: "In Progress", 
      value: "8", 
      icon: "hourglass", 
      color: "#f59e0b",
      trend: "+3",
      bgGradient: ["#f59e0b", "#f97316"]
    },
    { 
      label: "Resolved", 
      value: "16", 
      icon: "checkmark-circle", 
      color: "#10b981",
      trend: "+5",
      bgGradient: ["#10b981", "#059669"]
    },
  ];

  const achievements = [
    { name: "First Reporter", icon: "star", color: "#fbbf24", unlocked: true },
    { name: "Problem Solver", icon: "bulb", color: "#8b5cf6", unlocked: true },
    { name: "Community Hero", icon: "people", color: "#ef4444", unlocked: false },
    { name: "Speed Demon", icon: "flash", color: "#06b6d4", unlocked: true },
  ];

  const recentReports = [
    {
      id: 1,
      title: "Broken Traffic Light",
      status: "Resolved",
      date: "2 hours ago",
      icon: "traffic-light",
      color: "#10b981",
      priority: "High",
      location: "5th Avenue",
      likes: 12,
    },
    {
      id: 2,
      title: "Pothole Emergency",
      status: "In Progress",
      date: "5 hours ago",
      icon: "warning",
      color: "#f59e0b",
      priority: "Critical",
      location: "Main Street",
      likes: 8,
    },
    {
      id: 3,
      title: "Graffiti Cleanup",
      status: "Pending",
      date: "1 day ago",
      icon: "brush",
      color: "#6366f1",
      priority: "Low",
      location: "Park Avenue",
      likes: 5,
    },
  ];

  const zones = [
    { 
      name: "Downtown District", 
      reports: 12, 
      resolved: 8, 
      active: 4,
      satisfaction: 92,
      responseTime: "2.5h"
    },
    { 
      name: "West Side", 
      reports: 8, 
      resolved: 5, 
      active: 3,
      satisfaction: 88,
      responseTime: "3.1h"
    },
    { 
      name: "East Park", 
      reports: 4, 
      resolved: 3, 
      active: 1,
      satisfaction: 95,
      responseTime: "1.8h"
    },
  ];

  // Animated styles
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const slideStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(slideAnim.value, [0, 1], [50, 0]) },
    ],
    opacity: slideAnim.value,
  }));

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateAnim.value}deg` }],
  }));

  const handleLikeReport = (reportId: number) => {
    // Animate like action
    Alert.alert("Liked!", "You liked this report");
  };

  const TabButton = ({ title, isActive, onPress }: any) => (
    <Pressable
      onPress={onPress}
      style={[styles.tabButton, isActive && styles.activeTab]}
    >
      <Text style={[styles.tabText, isActive && styles.activeTabText]}>
        {title}
      </Text>
      {isActive && <View style={styles.tabIndicator} />}
    </Pressable>
  );

  const StatCard = ({ stat, index }: any) => (
    <Animated.View
      entering={FadeInUp.delay(index * 100).duration(800)}
      style={styles.statCardContainer}
    >
      <LinearGradient
        colors={stat.bgGradient}
        style={styles.statCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.statHeader}>
          <View style={styles.statIconContainer}>
            <Ionicons name={stat.icon as any} size={24} color="white" />
          </View>
          <Text style={styles.statTrend}>{stat.trend}</Text>
        </View>
        <Text style={styles.statValue}>{stat.value}</Text>
        <Text style={styles.statLabel}>{stat.label}</Text>
      </LinearGradient>
    </Animated.View>
  );

  const ReportCard = ({ report, index }: any) => (
    <Animated.View
      entering={FadeInUp.delay(index * 100).duration(600)}
      style={styles.reportCardContainer}
    >
      <BlurView intensity={20} style={styles.reportCard}>
        <View style={styles.reportHeader}>
          <View style={[styles.reportIcon, { backgroundColor: report.color + "20" }]}>
            <MaterialCommunityIcons 
              name={report.icon as any} 
              size={20} 
              color={report.color} 
            />
          </View>
          <View style={styles.reportInfo}>
            <Text style={styles.reportTitle}>{report.title}</Text>
            <Text style={styles.reportLocation}>📍 {report.location}</Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: report.color }]}>
            <Text style={styles.priorityText}>{report.priority}</Text>
          </View>
        </View>
        
        <View style={styles.reportFooter}>
          <Text style={styles.reportDate}>{report.date}</Text>
          <View style={styles.reportActions}>
            <Pressable 
              onPress={() => handleLikeReport(report.id)}
              style={styles.likeButton}
            >
              <Ionicons name="heart" size={16} color="#ef4444" />
              <Text style={styles.likeCount}>{report.likes}</Text>
            </Pressable>
            <View style={[styles.statusBadge, { backgroundColor: report.color + "15" }]}>
              <Text style={[styles.statusText, { color: report.color }]}>
                {report.status}
              </Text>
            </View>
          </View>
        </View>
      </BlurView>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      {/* Animated Background */}
      <LinearGradient
        colors={["#667eea", "#764ba2", "#f093fb"]}
        style={StyleSheet.absoluteFillObject}
      >
        <Animated.View style={[styles.backgroundPattern, rotateStyle]} />
      </LinearGradient>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <Pressable 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text style={styles.title}>Profile</Text>
          <Pressable style={styles.settingsButton}>
            <Ionicons name="settings" size={24} color="white" />
          </Pressable>
        </Animated.View>

        {/* Profile Card */}
        <Animated.View
          entering={FadeInUp.delay(100).duration(800)}
          style={[styles.profileCard, slideStyle]}
        >
          <BlurView intensity={40} style={styles.profileBlur}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <Image
                  source={{ uri: "https://i.pravatar.cc/200?u=user" }}
                  style={styles.avatar}
                />
                <Animated.View style={[styles.onlineIndicator, pulseStyle]}>
                  <View style={styles.onlineDot} />
                </Animated.View>
              </View>
              
              <View style={styles.profileInfo}>
                <Text style={styles.name}>John Doe</Text>
                <Text style={styles.email}>john@example.com</Text>
                <View style={styles.badgeContainer}>
                  <LinearGradient
                    colors={["#fbbf24", "#f59e0b"]}
                    style={styles.badge}
                  >
                    <Ionicons name="star" size={12} color="white" />
                    <Text style={styles.badgeText}>Citizen Reporter</Text>
                  </LinearGradient>
                </View>
              </View>
            </View>

            {/* Achievement Badges */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.achievementScroll}
              contentContainerStyle={styles.achievementContainer}
            >
              {achievements.map((achievement, index) => (
                <Animated.View
                  key={achievement.name}
                  entering={FadeInUp.delay(200 + index * 50).duration(600)}
                  style={[
                    styles.achievementBadge,
                    { opacity: achievement.unlocked ? 1 : 0.4 }
                  ]}
                >
                  <LinearGradient
                    colors={achievement.unlocked 
                      ? [achievement.color, achievement.color + "80"] 
                      : ["#6b7280", "#4b5563"]
                    }
                    style={styles.achievementGradient}
                  >
                    <MaterialCommunityIcons 
                      name={achievement.icon as any} 
                      size={16} 
                      color="white" 
                    />
                  </LinearGradient>
                  <Text style={styles.achievementText}>{achievement.name}</Text>
                </Animated.View>
              ))}
            </ScrollView>
          </BlurView>
        </Animated.View>

        {/* Tab Navigation */}
        <Animated.View 
          entering={FadeInUp.delay(200).duration(600)}
          style={styles.tabContainer}
        >
          <TabButton 
            title="Statistics" 
            isActive={selectedTab === "stats"} 
            onPress={() => setSelectedTab("stats")}
          />
          <TabButton 
            title="Reports" 
            isActive={selectedTab === "reports"} 
            onPress={() => setSelectedTab("reports")}
          />
          <TabButton 
            title="Zones" 
            isActive={selectedTab === "zones"} 
            onPress={() => setSelectedTab("zones")}
          />
        </Animated.View>

        {/* Content based on selected tab */}
        {selectedTab === "stats" && (
          <View style={styles.tabContent}>
            <View style={styles.statsGrid}>
              {stats.map((stat, index) => (
                <StatCard key={stat.label} stat={stat} index={index} />
              ))}
            </View>
          </View>
        )}

        {selectedTab === "reports" && (
          <View style={styles.tabContent}>
            {recentReports.map((report, index) => (
              <ReportCard key={report.id} report={report} index={index} />
            ))}
          </View>
        )}

        {selectedTab === "zones" && (
          <View style={styles.tabContent}>
            {zones.map((zone, index) => (
              <Animated.View
                key={zone.name}
                entering={FadeInUp.delay(index * 100).duration(600)}
                style={styles.zoneCardContainer}
              >
                <BlurView intensity={20} style={styles.zoneCard}>
                  <View style={styles.zoneHeader}>
                    <LinearGradient
                      colors={["#6366f1", "#8b5cf6"]}
                      style={styles.zoneIcon}
                    >
                      <Ionicons name="location" size={18} color="white" />
                    </LinearGradient>
                    <View style={styles.zoneInfo}>
                      <Text style={styles.zoneName}>{zone.name}</Text>
                      <Text style={styles.zoneStats}>
                        {zone.reports} reports • {zone.responseTime} avg response
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
                          { width: `${(zone.resolved / zone.reports) * 100}%` }
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
        )}

        {/* Quick Actions */}
        <Animated.View
          entering={FadeInUp.delay(400).duration(600)}
          style={styles.quickActions}
        >
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            {[
              { icon: "heart-outline", label: "Saved", color: "#ef4444" },
              { icon: "notifications-outline", label: "Alerts", color: "#f59e0b" },
              { icon: "shield-checkmark", label: "Security", color: "#10b981" },
              { icon: "help-circle-outline", label: "Help", color: "#6366f1" },
            ].map((action, index) => (
              <Animated.View
                key={action.label}
                entering={FadeInUp.delay(450 + index * 50).duration(500)}
              >
                <Pressable style={styles.actionButton}>
                  <LinearGradient
                    colors={[action.color, action.color + "80"]}
                    style={styles.actionIconContainer}
                  >
                    <Ionicons name={action.icon as any} size={20} color="white" />
                  </LinearGradient>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* Logout Button */}
        <Animated.View
          entering={FadeInUp.delay(500).duration(600)}
          style={styles.logoutContainer}
        >
          <Pressable>
            <LinearGradient
              colors={["#ef4444", "#dc2626"]}
              style={styles.logoutButton}
            >
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

  // Profile Card
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
    marginBottom: 20,
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

  // Achievement Badges
  achievementScroll: {
    marginTop: 10,
  },
  achievementContainer: {
    paddingHorizontal: 4,
    gap: 12,
  },
  achievementBadge: {
    alignItems: "center",
    minWidth: 70,
  },
  achievementGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  achievementText: {
    fontSize: 9,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    fontWeight: "500",
  },

  // Tab Navigation
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

  // Tab Content
  tabContent: {
    paddingHorizontal: 20,
  },

  // Stats
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

  // Reports
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

  // Zones
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

  // Quick Actions
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

  // Logout
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