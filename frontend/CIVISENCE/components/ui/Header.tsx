import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightIcon?: string;
  onRightPress?: () => void;
}

export default function Header({
  title,
  showBack = true,
  onBackPress,
  rightIcon,
  onRightPress,
}: HeaderProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {showBack ? (
          <Pressable onPress={onBackPress}>
            <Ionicons name="arrow-back" size={28} color="#1e3a8a" />
          </Pressable>
        ) : (
          <View />
        )}
        <Text style={styles.title}>{title}</Text>
        {rightIcon ? (
          <Pressable onPress={onRightPress}>
            <Ionicons name={rightIcon as any} size={24} color="#2563eb" />
          </Pressable>
        ) : (
          <View />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#f1f6fc",
  },
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e3a8a",
    flex: 1,
    textAlign: "center",
  },
});