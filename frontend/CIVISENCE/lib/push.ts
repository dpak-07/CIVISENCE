import { Platform } from "react-native";

const canUseNotifications = Platform.OS !== "web";

let notificationsReady = false;
let notificationsModule: typeof import("expo-notifications") | null = null;

export const initializeNotifications = async (): Promise<boolean> => {
  if (!canUseNotifications) {
    return false;
  }

  if (notificationsReady) {
    return true;
  }

  if (!notificationsModule) {
    const imported = await import("expo-notifications");
    notificationsModule = imported;
  }

  const Notifications = notificationsModule;
  if (!Notifications) {
    return false;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

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

  if (!notificationsModule) {
    return;
  }

  const Notifications = notificationsModule;
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
    },
    trigger: null,
  });
};
