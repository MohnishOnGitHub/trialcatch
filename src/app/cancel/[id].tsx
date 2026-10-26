import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, AppState, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Header, Icon, Txt } from '@/components/ui';
import { formatINR } from '@/lib/money';
import { UPI_APPS, openUpiApp } from '@/lib/upi';
import { useAppStore, useSubscription } from '@/store/useAppStore';
import { colors } from '@/theme';

export default function CancelGuide() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sub = useSubscription(Number(id));
  const confirmCancelled = useAppStore((s) => s.confirmCancelled);
  const [askedBack, setAskedBack] = useState(false);
  const leftForUpiApp = useRef(false);

  // When the user comes back from the UPI app, ask whether they actually cancelled.
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active' && leftForUpiApp.current) {
        leftForUpiApp.current = false;
        setAskedBack(true);
      }
    });
    return () => listener.remove();
  }, []);

  if (!sub) {
    return (
      <SafeAreaView style={styles.screen}>
        <Header />
      </SafeAreaView>
    );
  }

  const app = UPI_APPS[sub.upiApp];

  const open = async () => {
    leftForUpiApp.current = true;
    const opened = await openUpiApp(sub.upiApp);
    if (!opened) {
      leftForUpiApp.current = false;
      Alert.alert(`Open ${app.name} yourself`, `We couldn't open ${app.name} from here. Open it from your home screen, then come back.`);
    }
  };

  const done = async () => {
    await confirmCancelled(sub.id);
    Alert.alert('Nice catch!', `You saved ${formatINR(sub.amountPaise)}.`);
    router.dismissTo('/');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={{ gap: 20, paddingBottom: 24 }}>
        <Header right={<Txt weight="semibold" color={colors.muted}>{`${sub.name} · ${formatINR(sub.amountPaise)}`}</Txt>} />

        <View style={{ gap: 8 }}>
          <Txt weight="extrabold" size={26} style={{ lineHeight: 31 }}>
            Cancel in {app.name}, 3 steps
          </Txt>
          <Txt color={colors.body} style={{ lineHeight: 21 }}>
            The AutoPay lives in your UPI app, so you cancel it there. We’ll walk you through it.
          </Txt>
        </View>

        {askedBack ? (
          <Card style={{ gap: 10, borderColor: colors.primaryBorder, backgroundColor: colors.primarySoft }}>
            <Txt weight="bold" size={16}>
              Welcome back. Did you cancel {sub.name}?
            </Txt>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Yes, cancelled" height={44} style={{ flex: 1 }} onPress={done} />
              <Button title="Not yet" variant="secondary" height={44} style={{ flex: 1 }} onPress={() => setAskedBack(false)} />
            </View>
          </Card>
        ) : null}

        <View style={{ gap: 12 }}>
          {app.steps.map((step, i) => (
            <Card key={step.title} style={styles.step}>
              <View style={styles.number}>
                <Txt weight="extrabold" color="#FFFFFF">
                  {i + 1}
                </Txt>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Txt weight="bold" size={15}>
                  {step.title}
                </Txt>
                <Txt size={13} color={colors.muted}>
                  {step.detail}
                </Txt>
              </View>
            </Card>
          ))}
        </View>

        <View style={styles.safety}>
          <Icon name="shield-checkmark-outline" size={20} color={colors.primaryDark} />
          <Txt size={13} color={colors.primaryDark} style={{ flex: 1, lineHeight: 19 }}>
            TrialCatch never asks for your UPI PIN. Enter it only inside your UPI app.
          </Txt>
        </View>

        <View style={{ gap: 10 }}>
          {sub.upiApp !== 'other' ? <Button title={`Open ${app.name}`} icon="open-outline" onPress={open} /> : null}
          <Button title="Done, I cancelled it" variant="secondary" onPress={done} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20, backgroundColor: colors.bg },
  step: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', padding: 16 },
  number: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  safety: { flexDirection: 'row', gap: 10, backgroundColor: colors.primarySoft, borderRadius: 14, padding: 14, alignItems: 'flex-start' },
});
