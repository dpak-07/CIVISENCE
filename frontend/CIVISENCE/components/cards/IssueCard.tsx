import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface IssueCardProps {
  title: string;
  status: string;
  category: string;
  image?: string;
  onPress?: () => void;
}

export default function IssueCard({
  title,
  status,
  category,
  image,
  onPress,
}: IssueCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Resolved":
        return "#10b981";
      case "In Progress":
        return "#f59e0b";
      case "Pending":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  return (
    <Pressable style={styles.container} onPress={onPress}>
      {image && <Image source={{ uri: image }} style={styles.image} />}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          <View
            style={[
              styles.badge,
              { backgroundColor: getStatusColor(status) },
            ]}
          >
            <Text style={styles.badgeText}>{status}</Text>
          </View>
        </View>
        <Text style={styles.category}>{category}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
    borderColor: "#dbeafe",
    borderWidth: 1,
    elevation: 2,
  },
  image: {
    width: "100%",
    height: 160,
  },
  content: {
    padding: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e3a8a",
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  category: {
    fontSize: 12,
    color: "#6b7280",
  },
});