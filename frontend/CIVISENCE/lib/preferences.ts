import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppPreferences = {
  notificationsEnabled: boolean;
  locationEnabled: boolean;
};

const PREFERENCES_KEY = "civisense.app.preferences.v1";

const defaultPreferences: AppPreferences = {
  notificationsEnabled: true,
  locationEnabled: true,
};

export const getPreferences = async (): Promise<AppPreferences> => {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
    if (!raw) {
      return defaultPreferences;
    }

    const parsed = JSON.parse(raw) as Partial<AppPreferences>;
    return {
      notificationsEnabled:
        typeof parsed.notificationsEnabled === "boolean"
          ? parsed.notificationsEnabled
          : defaultPreferences.notificationsEnabled,
      locationEnabled:
        typeof parsed.locationEnabled === "boolean"
          ? parsed.locationEnabled
          : defaultPreferences.locationEnabled,
    };
  } catch {
    return defaultPreferences;
  }
};

export const savePreferences = async (preferences: AppPreferences): Promise<void> => {
  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
};
