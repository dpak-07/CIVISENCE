export const initializeNotifications = async (): Promise<boolean> => false;

export const sendLocalPush = async (_title: string, _body: string): Promise<void> => {
  // Push notifications are not supported in this app's web build.
};
