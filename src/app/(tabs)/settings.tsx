import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Row, Txt } from '@/components/ui';
import { activeSubs } from '@/lib/summary';
import { requestPermission, sendTestReminder } from '@/reminders/notifications';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';

export default function Settings() {
  const subscriptions = useAppStore((s) => s.subscriptions);
  const refresh = useAppStore((s) => s.refresh);
  const loadSampleData = useAppStore((s) => s.loadSampleData);
  const resetAll = useAppStore((s) => s.resetAll);
  const [granted, setGranted] = useState<boolean | null>(null);
  const [scheduled, setScheduled] = useState(0);

  const check = useCallback(() => {
    Notifications.getPermissionsAsync().then((p) => setGranted(p.granted));
    Notifications.getAllScheduledNotificationsAsync().then((list) => setScheduled(list.length));
  }, []);
  useFocusEffect(check);

  const allow = async () => {
    const ok = await requestPermission();
    setGranted(ok);
    if (ok) await refresh();
    check();
  };

  const test = async () => {
    const sub = activeSubs(subscriptions)[0];
    if (!sub) {
      Alert.alert('Add a trial first', 'The test reminder uses one of your trials.');
      return;
    }
    if (!granted) {
      await allow();
    }
    await sendTestReminder(sub);
    Alert.alert('Test reminder set', 'Lock your phone or go to the home screen. It arrives in about 5 seconds.');
  };

  const confirmReset = () =>
    Alert.alert('Delete all data?', 'This removes every trial, subscription and saving from this phone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => resetAll() },
    ]);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Txt weight="extrabold" size={24}>
          Settings
        </Txt>

        <View style={{ gap: 10 }}>
          <Txt weight="bold" size={16}>
            Reminders
          </Txt>
          <Card style={{ paddingVertical: 4 }}>
            <Row label="Notifications" value={granted === null ? '…' : granted ? 'Allowed' : 'Off'} />
            <Row label="Reminders scheduled" value={String(scheduled)} />
            <Row label="Timing" value="2 days and 1 day before, 7 pm" last />
          </Card>
          {granted === false ? <Button title="Allow notifications" onPress={allow} /> : null}
          <Button title="Send a test reminder" variant="secondary" onPress={test} />
        </View>

        <View style={{ gap: 10 }}>
          <Txt weight="bold" size={16}>
            Demo and testing
          </Txt>
          <Button title="Load sample data" variant="secondary" onPress={loadSampleData} />
          <Button title="Delete all data" variant="secondary" onPress={confirmReset} />
        </View>

        <View style={{ gap: 10 }}>
          <Txt weight="bold" size={16}>
            Privacy
          </Txt>
          <Card style={{ gap: 8 }}>
            <Txt color={colors.body} style={{ lineHeight: 21 }}>
              Everything stays on this phone. TrialCatch has no servers, never reads your SMS on its own, never moves money and
              never asks for your UPI PIN. When you paste an SMS we keep only the details we found, not the text.
            </Txt>
          </Card>
          <Txt size={12} color={colors.muted}>
            TrialCatch {Constants.expoConfig?.version ?? ''} · HUM 4342 Design Thinking project
          </Txt>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 24 },
});
