import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

let notificationsReady = false;

export const initializeNotifications = async (): Promise<boolean> => {
  if (Platform.OS === "web") {
    return false;
  }

  if (notificationsReady) {
    return true;
  }

  const permission = await Notifications.getPermissionsAsync();
  let status = permission.status;

  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== "granted") {
    return false;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200, 200],
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  notificationsReady = true;
  return true;
};

export const sendLocalPush = async (title: string, body: string) => {
  const enabled = await initializeNotifications();
  if (!enabled) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null,
  });
};
