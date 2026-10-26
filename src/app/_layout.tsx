import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import { SQLiteProvider, useSQLiteContext } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { migrate } from '@/db/migrate';
import { ACTION_CANCEL, ACTION_KEEP, setupNotifications, type ReminderData } from '@/reminders/notifications';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SQLiteProvider databaseName="trialcatch.db" onInit={migrate}>
        <App />
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}

function handleResponse(response: Notifications.NotificationResponse) {
  const data = response.notification.request.content.data as Partial<ReminderData>;
  if (data?.app !== 'trialcatch' || typeof data.subscriptionId !== 'number') return;
  const id = data.subscriptionId;
  if (response.actionIdentifier === ACTION_KEEP) {
    useAppStore.getState().keep(id);
  } else if (response.actionIdentifier === ACTION_CANCEL) {
    router.push(`/cancel/${id}`);
  } else {
    router.push(`/subscription/${id}`);
  }
}

function App() {
  const db = useSQLiteContext();
  const ready = useAppStore((s) => s.ready);

  // Load data, roll dates forward and reschedule reminders on start…
  useEffect(() => {
    setupNotifications().catch(() => undefined);
    useAppStore.getState().init(db);
  }, [db]);

  // …and again whenever the app comes back to the foreground (no background jobs in Expo Go).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && useAppStore.getState().ready) useAppStore.getState().init(db);
    });
    return () => sub.remove();
  }, [db]);

  // Open the right screen when a reminder is tapped, including a tap that launched the app.
  useEffect(() => {
    if (!ready) return;
    Notifications.getLastNotificationResponseAsync().then((last) => {
      if (last) {
        handleResponse(last);
        Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
      }
    });
    const sub = Notifications.addNotificationResponseReceivedListener((r) => {
      handleResponse(r);
      Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    });
    return () => sub.remove();
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="add" options={{ presentation: 'modal' }} />
      <Stack.Screen name="paste-sms" options={{ presentation: 'modal' }} />
      <Stack.Screen name="subscription/[id]" />
      <Stack.Screen name="cancel/[id]" />
    </Stack>
  );
}
