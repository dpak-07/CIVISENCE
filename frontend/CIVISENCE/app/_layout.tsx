import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: { backgroundColor: "#ffffff" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Home" }} />
        <Stack.Screen 
          name="auth/login" 
          options={{ 
            title: "Login",
            animation: "slide_from_bottom" // Custom animation for login
          }} 
        />
        <Stack.Screen 
          name="auth/register" 
          options={{ 
            title: "Register",
            animation: "fade" // Fade animation for register
          }} 
        />
        <Stack.Screen name="report/index" options={{ title: "Report Issue" }} />
        <Stack.Screen 
          name="report/camera" 
          options={{ 
            title: "Camera",
            animation: "slide_from_bottom", // Modal-like for camera
            presentation: "modal" // Makes it feel more modal-like on iOS
          }} 
        />
        <Stack.Screen name="track/index" options={{ title: "Active Complaints" }} />
        <Stack.Screen name="map/index" options={{ title: "City Map" }} />
        <Stack.Screen name="dashboard/index" options={{ title: "Dashboard" }} />
        <Stack.Screen name="profile/index" options={{ title: "Profile" }} />
        <Stack.Screen name="settings/index" options={{ title: "Settings" }} />
      </Stack>
    </GestureHandlerRootView>
  );
}