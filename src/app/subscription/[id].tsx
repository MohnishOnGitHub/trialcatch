import { format } from 'date-fns';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBadge, Button, Card, Chip, Header, Pill, Row, Txt } from '@/components/ui';
import { CYCLE_LABEL, daysUntil, longDay, relativeDay } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import type { Decision } from '@/lib/types';
import { UPI_SHORT_NAME } from '@/lib/upi';
import { chargeDay } from '@/reminders/plan';
import { useAppStore, useSubscription } from '@/store/useAppStore';
import { colors } from '@/theme';

const YEARLY_MULTIPLIER = { weekly: 52, monthly: 12, quarterly: 4, yearly: 1 } as const;

const USAGE: { value: NonNullable<Decision['usageAnswer']>; label: string }[] = [
  { value: 'lot', label: 'A lot' },
  { value: 'little', label: 'A little' },
  { value: 'none', label: 'Not at all' },
];

export default function KeepOrCancel() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const sub = useSubscription(Number(id));
  const keep = useAppStore((s) => s.keep);
  const snooze = useAppStore((s) => s.snooze);
  const remove = useAppStore((s) => s.remove);
  const [usage, setUsage] = useState<Decision['usageAnswer']>(null);

  if (!sub) {
    return (
      <SafeAreaView style={styles.screen}>
        <Header />
        <Txt color={colors.muted}>This subscription was deleted.</Txt>
      </SafeAreaView>
    );
  }

  const day = chargeDay(sub);
  const days = daysUntil(day);
  const cancelled = sub.status === 'cancelled';

  const onKeep = async () => {
    await keep(sub.id, usage);
    router.back();
  };

  const onSnooze = async () => {
    const at = await snooze(sub.id);
    Alert.alert('We will remind you again', at ? `At ${format(at, 'h:mm a')}.` : 'Turn on notifications in Settings to get reminders.');
  };

  const onDelete = () =>
    Alert.alert(`Delete ${sub.name}?`, 'Its reminders will stop. Your savings history stays.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await remove(sub.id);
          router.back();
        },
      },
    ]);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={{ gap: 18, paddingBottom: 24 }}>
        <Header right={<Button title="Edit" variant="ghost" height={40} onPress={() => router.push({ pathname: '/add', params: { id: String(sub.id) } })} />} />

        <Card style={{ gap: 18, padding: 22, borderRadius: 24 }}>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <AppBadge name={sub.name} size={56} />
            <View style={{ gap: 6, flex: 1 }}>
              <Txt weight="extrabold" size={22}>
                {sub.name}
              </Txt>
              {cancelled ? (
                <Pill tone="green" label="Cancelled" />
              ) : (
                <Pill tone={days <= 2 ? 'red' : 'amber'} label={`${sub.status === 'trial' ? 'Converts' : 'Renews'} ${relativeDay(day).toLowerCase()}`} />
              )}
            </View>
          </View>

          {!cancelled ? (
            <View style={{ gap: 4 }}>
              <Txt size={13} color={colors.muted}>
                {sub.status === 'trial' ? 'After the trial you pay' : 'You pay'}
              </Txt>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Txt weight="extrabold" size={40}>
                  {formatINR(sub.amountPaise)}
                </Txt>
                <Txt size={15} color={colors.muted}>
                  every {CYCLE_LABEL[sub.cycle]}
                </Txt>
              </View>
              {sub.cycle !== 'yearly' ? (
                <Txt size={13} color={colors.body}>
                  That is {formatINR(sub.amountPaise * YEARLY_MULTIPLIER[sub.cycle])} a year
                </Txt>
              ) : null}
            </View>
          ) : null}

          <View>
            <Row label={sub.status === 'trial' ? 'Trial ends' : 'Next charge'} value={longDay(day)} />
            <Row label="AutoPay via" value={UPI_SHORT_NAME[sub.upiApp]} />
            {sub.maxAmountPaise ? <Row label="Mandate limit" value={`up to ${formatINR(sub.maxAmountPaise)}`} /> : null}
            {sub.umn ? <Row label="UMN" value={sub.umn} /> : null}
            <Row label="Added" value={sub.source === 'sms' ? 'From a pasted SMS' : 'By hand'} last />
          </View>
        </Card>

        {!cancelled ? (
          <>
            <View style={styles.usage}>
              <Txt weight="bold">Used it in the last 2 weeks?</Txt>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {USAGE.map((u) => (
                  <Chip key={u.value} label={u.label} selected={usage === u.value} onPress={() => setUsage(u.value)} style={{ flex: 1 }} />
                ))}
              </View>
              {usage === 'none' ? (
                <Txt size={13} color={colors.amberText}>
                  Sounds like a good one to cancel.
                </Txt>
              ) : null}
            </View>

            <View style={{ gap: 10 }}>
              <Button title="Cancel before it charges" variant="danger" onPress={() => router.push(`/cancel/${sub.id}`)} />
              <Button title="Keep it" variant="secondary" onPress={onKeep} />
              <Button title="Remind me tonight" variant="ghost" height={44} onPress={onSnooze} />
            </View>
          </>
        ) : null}

        <Pressable accessibilityRole="button" onPress={onDelete} style={{ alignSelf: 'center', padding: 8 }}>
          <Txt weight="semibold" size={13} color={colors.muted}>
            Delete from TrialCatch
          </Txt>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 20, backgroundColor: colors.bg },
  usage: { backgroundColor: colors.amberBg, borderColor: colors.amberBorder, borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
});
