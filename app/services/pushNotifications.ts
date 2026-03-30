import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { router } from "expo-router";

const API = process.env.EXPO_PUBLIC_BACKEND_API_URL as string | undefined;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerTokenOnServer(expoPushToken: string, jwt: string) {
  if (!API) return;
  await fetch(`${API}/user/push-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ expoPushToken }),
  });
}

export async function initPushNotifications(jwt: string | null) {
  if (!jwt || !Constants.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const expoPushToken = tokenData.data;
  await registerTokenOnServer(expoPushToken, jwt);

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as Record<string, unknown>;
    if (!data) return;
    if (data.type === "message" && typeof data.chatId === "string") {
      router.replace({
        pathname: "/(home)/chat/[chatId]" as any,
        params: {
          chatId: data.chatId as string,
          peerId: typeof data.peerId === "string" ? data.peerId : "",
        },
      });
    }
    if (data.type === "call" && typeof data.callSessionId === "string") {
      router.replace({
        pathname: "/(home)/call/new" as any,
        params: {
          mode: "incoming",
          type: (data.callType as string) ?? "voice",
          callSessionId: data.callSessionId as string,
          peerId: (data.fromUserId as string) ?? "",
        },
      });
    }
  });
}
