import { apiClient } from "@/lib/api";

export type AppNotification = {
  _id: string;
  userId: string;
  complaintId?: string | null;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  updatedAt?: string;
};

type Envelope<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export const getNotifications = async (): Promise<AppNotification[]> => {
  const response = await apiClient.get<Envelope<AppNotification[]>>("/notifications");
  return response.data.data;
};

export const markNotificationRead = async (
  notificationId: string
): Promise<AppNotification> => {
  const response = await apiClient.patch<Envelope<AppNotification>>(
    `/notifications/${notificationId}/read`
  );
  return response.data.data;
};
