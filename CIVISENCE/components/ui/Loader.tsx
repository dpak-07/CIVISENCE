import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export default function Loader() {
  return (
    <LinearGradient
      colors={["#f1f6fc", "#e0eaff"]}
      style={styles.container}
    >
      <View style={styles.content}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    justifyContent: "center",
    alignItems: "center",
  },
});