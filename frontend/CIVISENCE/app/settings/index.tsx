import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

export default function Settings() {
  const [notifications, setNotifications] = useState(true);
  const [location, setLocation] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

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
          <Text style={styles.title}>Settings</Text>
          <View />
        </Animated.View>

        <View style={styles.content}>
          {/* Notifications Section */}
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.settingItem}>
            <View>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDesc}>
                Get updates on your complaints
              </Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: "#dbeafe", true: "#86efac" }}
              thumbColor={notifications ? "#22c55e" : "#9ca3af"}
            />
          </View>

          <View style={styles.settingItem}>
            <View>
              <Text style={styles.settingLabel}>Location Services</Text>
              <Text style={styles.settingDesc}>
                Allow access to your location
              </Text>
            </View>
            <Switch
              value={location}
              onValueChange={setLocation}
              trackColor={{ false: "#dbeafe", true: "#86efac" }}
              thumbColor={location ? "#22c55e" : "#9ca3af"}
            />
          </View>

          {/* Display Section */}
          <Text style={styles.sectionTitle}>Display</Text>
          <View style={styles.settingItem}>
            <View>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Text style={styles.settingDesc}>
                Dark theme coming soon
              </Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              disabled
              trackColor={{ false: "#dbeafe", true: "#86efac" }}
              thumbColor={darkMode ? "#22c55e" : "#9ca3af"}
            />
          </View>

          {/* Support Section */}
          <Text style={styles.sectionTitle}>Support</Text>
          <Pressable style={styles.menuItem}>
            <Ionicons name="help-circle-outline" size={24} color="#2563eb" />
            <Text style={styles.menuText}>Help & FAQs</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </Pressable>

          <Pressable style={styles.menuItem}>
            <Ionicons name="mail-outline" size={24} color="#2563eb" />
            <Text style={styles.menuText}>Contact Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </Pressable>

          <Pressable style={styles.menuItem}>
            <Ionicons name="document-outline" size={24} color="#2563eb" />
            <Text style={styles.menuText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </Pressable>

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={styles.appVersion}>CiviSense v1.0.0</Text>
            <Text style={styles.appDesc}>
              Making cities smarter through citizen participation
            </Text>
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
    flex: 1,
    textAlign: "center",
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e3a8a",
    marginTop: 24,
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderColor: "#dbeafe",
    borderWidth: 1.5,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e3a8a",
  },
  settingDesc: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 12,
    marginBottom: 12,
    borderColor: "#dbeafe",
    borderWidth: 1,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#1e3a8a",
    marginLeft: 12,
  },
  appInfo: {
    alignItems: "center",
    marginTop: 32,
    paddingVertical: 16,
  },
  appVersion: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e3a8a",
  },
  appDesc: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 6,
    textAlign: "center",
  },
});