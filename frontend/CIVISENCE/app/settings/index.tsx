import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  Linking,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { getApiErrorMessage } from "@/lib/api";
import { getPreferences, savePreferences } from "@/lib/preferences";
import { sessionStore } from "@/lib/session";
import { logoutUser } from "@/lib/services/auth";
import {
  AppNotification,
  getNotifications,
  markNotificationRead,
} from "@/lib/services/notifications";

export default function Settings() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationStatus, setNotificationStatus] = useState("unknown");
  const [locationStatus, setLocationStatus] = useState("unknown");
  const [notificationsModule, setNotificationsModule] = useState<
    (typeof import("expo-notifications")) | null
  >(null);

  const canUseNotifications = Platform.OS !== "web";

  const [user, setUser] = useState(sessionStore.getUser());

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const preferences = await getPreferences();
      setNotificationsEnabled(preferences.notificationsEnabled);
      setLocationEnabled(preferences.locationEnabled);

      if (canUseNotifications) {
        let module = notificationsModule;
        if (!module) {
          const imported = await import("expo-notifications");
          module = imported;
          setNotificationsModule(imported);
        }
        const notificationPermission = await module.getPermissionsAsync();
        const status = notificationPermission.status || "unknown";
        setNotificationStatus(status);
        setNotificationsEnabled(preferences.notificationsEnabled && status === "granted");
      } else {
        setNotificationStatus("unavailable");
        setNotificationsEnabled(false);
      }

      const locationPermission = await Location.getForegroundPermissionsAsync();
      const locationStatusValue = locationPermission.status || "unknown";
      setLocationStatus(locationStatusValue);
      setLocationEnabled(preferences.locationEnabled && locationStatusValue === "granted");

      if (sessionStore.getAccessToken()) {
        const data = await getNotifications();
        setNotifications(data);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      Alert.alert("Settings error", getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const unsubscribe = sessionStore.subscribe(() => {
      setUser(sessionStore.getUser());
    });
    return unsubscribe;
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const persistPreferences = async (
    nextNotificationsEnabled: boolean,
    nextLocationEnabled: boolean
  ) => {
    try {
      await savePreferences({
        notificationsEnabled: nextNotificationsEnabled,
        locationEnabled: nextLocationEnabled,
      });
    } catch {
      Alert.alert("Save failed", "Could not save preferences.");
    }
  };

  const toggleNotifications = async (value: boolean) => {
    if (value) {
      let module = notificationsModule;
      if (!module) {
        const imported = await import("expo-notifications");
        module = imported;
        setNotificationsModule(imported);
      }
      const permission = await module.requestPermissionsAsync();
      setNotificationStatus(permission.status || "unknown");
      const granted = permission.status === "granted";
      setNotificationsEnabled(granted);
      await persistPreferences(granted, locationEnabled);
      if (!granted) {
        Alert.alert("Permission denied", "Enable notifications from system settings.");
      }
      return;
    }

    setNotificationsEnabled(false);
    await persistPreferences(false, locationEnabled);
    Alert.alert(
      "Disable in system settings",
      "Notification permission can only be changed from the system settings.",
      [{ text: "Open Settings", onPress: () => Linking.openSettings() }, { text: "Close" }]
    );
  };

  const toggleLocation = async (value: boolean) => {
    if (value) {
      const permission = await Location.requestForegroundPermissionsAsync();
      setLocationStatus(permission.status || "unknown");
      const granted = permission.status === "granted";
      setLocationEnabled(granted);
      await persistPreferences(notificationsEnabled, granted);
      if (!granted) {
        Alert.alert("Permission denied", "Enable location access from system settings.");
      }
      return;
    }

    setLocationEnabled(false);
    await persistPreferences(notificationsEnabled, false);
    Alert.alert(
      "Disable in system settings",
      "Location permission can only be changed from the system settings.",
      [{ text: "Open Settings", onPress: () => Linking.openSettings() }, { text: "Close" }]
    );
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    try {
      await markNotificationRead(notificationId);
      setNotifications((prev) =>
        prev.map((item) =>
          item._id === notificationId ? { ...item, read: true } : item
        )
      );
    } catch (error) {
      Alert.alert("Update failed", getApiErrorMessage(error));
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      router.replace("/auth/login");
    } catch (error) {
      Alert.alert("Logout failed", getApiErrorMessage(error));
    }
  };

  const toStatusLabel = (status: string) => {
    switch (status) {
      case "granted":
        return "Granted";
      case "denied":
        return "Denied";
      case "undetermined":
        return "Not requested";
      case "unavailable":
        return "Unavailable";
      default:
        return "Unknown";
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={["#f1f6fc", "#e0eaff"]} style={styles.container}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#1e3a8a" />
          <Text style={styles.loaderText}>Loading settings...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#f1f6fc", "#e0eaff"]} style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color="#1e3a8a" />
          </Pressable>
          <Text style={styles.title}>Settings</Text>
          <Pressable onPress={() => void loadData()}>
            <Ionicons name="refresh" size={22} color="#1e3a8a" />
          </Pressable>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.settingItem}>
            <View>
              <Text style={styles.settingLabel}>{user?.name || "Guest"}</Text>
              <Text style={styles.settingDesc}>{user?.email || "Not logged in"}</Text>
            </View>
            <Ionicons name="person-circle-outline" size={30} color="#2563eb" />
          </View>

          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.settingItem}>
            <View>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDesc}>
                System: {toStatusLabel(notificationStatus)} - Unread: {unreadCount}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: "#dbeafe", true: "#86efac" }}
              thumbColor={notificationsEnabled ? "#22c55e" : "#9ca3af"}
              disabled={!canUseNotifications}
            />
          </View>

          <View style={styles.settingItem}>
            <View>
              <Text style={styles.settingLabel}>Location Services</Text>
              <Text style={styles.settingDesc}>
                System: {toStatusLabel(locationStatus)} - Used in report flow
              </Text>
            </View>
            <Switch
              value={locationEnabled}
              onValueChange={toggleLocation}
              trackColor={{ false: "#dbeafe", true: "#86efac" }}
              thumbColor={locationEnabled ? "#22c55e" : "#9ca3af"}
            />
          </View>

          <Text style={styles.sectionTitle}>Latest Notifications</Text>
          {notifications.slice(0, 5).map((item) => (
            <View key={item._id} style={styles.menuItem}>
              <Ionicons
                name={item.read ? "mail-open-outline" : "mail-unread-outline"}
                size={22}
                color={item.read ? "#64748b" : "#2563eb"}
              />
              <View style={styles.menuBody}>
                <Text style={styles.menuText}>{item.title}</Text>
                <Text style={styles.menuSubText}>{item.message}</Text>
              </View>
              {!item.read ? (
                <Pressable onPress={() => void handleMarkNotificationRead(item._id)}>
                  <Text style={styles.markRead}>Mark read</Text>
                </Pressable>
              ) : null}
            </View>
          ))}

          {notifications.length === 0 ? (
            <View style={styles.menuItem}>
              <Text style={styles.menuText}>No notifications yet</Text>
            </View>
          ) : null}

          <Pressable style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>

          <View style={styles.appInfo}>
            <Text style={styles.appVersion}>CiviSense v1.0.0</Text>
            <Text style={styles.appDesc}>
              Powered by backend APIs for complaints, routing and notifications.
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
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  loaderText: {
    fontSize: 14,
    color: "#475569",
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
    gap: 10,
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
    gap: 10,
  },
  menuBody: {
    flex: 1,
  },
  menuText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e3a8a",
  },
  menuSubText: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  markRead: {
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "700",
  },
  logoutBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
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
