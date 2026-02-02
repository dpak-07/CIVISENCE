import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

function StatCard({ icon, title, value, color }) {
  return (
    <View style={styles.statCard}>
      <LinearGradient
        colors={[color + "1a", color + "08"]}
        style={styles.statGradient}
      >
        <Ionicons name={icon} size={32} color={color} />
      </LinearGradient>
      <View>
        <Text style={styles.statTitle}>{title}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function Dashboard() {
  return (
    <LinearGradient
      colors={["#f1f6fc", "#e0eaff"]}
      style={styles.container}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color="#1e3a8a" />
          </Pressable>
          <Text style={styles.title}>Dashboard</Text>
          <View />
        </Animated.View>

        {/* Stats Section */}
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <StatCard
            icon="checkmark-circle-outline"
            title="Resolved"
            value="24"
            color="#10b981"
          />
          <StatCard
            icon="time-outline"
            title="In Progress"
            value="12"
            color="#f59e0b"
          />
          <StatCard
            icon="alert-circle-outline"
            title="Pending"
            value="8"
            color="#ef4444"
          />
          <StatCard
            icon="flag-outline"
            title="Total Reports"
            value="44"
            color="#2563eb"
          />

          {/* Recent Activity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.activityItem}>
              <MaterialCommunityIcons
                name="check-circle"
                size={24}
                color="#10b981"
              />
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>
                  Pothole on Main St. resolved
                </Text>
                <Text style={styles.activityTime}>2 hours ago</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <MaterialCommunityIcons
                name="progress-check"
                size={24}
                color="#f59e0b"
              />
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>
                  Streetlight assigned to team
                </Text>
                <Text style={styles.activityTime}>5 hours ago</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={24}
                color="#ef4444"
              />
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>
                  New issue reported nearby
                </Text>
                <Text style={styles.activityTime}>1 day ago</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 44,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e3a8a",
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e3a8a",
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#dbeafe",
    borderWidth: 1.5,
  },
  statGradient: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  statTitle: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e3a8a",
    marginTop: 2,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 12,
    padding: 12,
    borderColor: "#dbeafe",
    borderWidth: 1,
  },
  activityContent: {
    marginLeft: 12,
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e3a8a",
  },
  activityTime: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 4,
  },
});