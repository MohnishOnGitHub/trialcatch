import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBadge, Card, Pill, Txt } from '@/components/ui';
import { addCycle, addDays, fromDay, toDay } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { activeSubs } from '@/lib/summary';
import type { Subscription } from '@/lib/types';
import { chargeDay } from '@/reminders/plan';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';
import { format } from 'date-fns';

const HORIZON_DAYS = 90;

interface Occurrence {
  day: string;
  sub: Subscription;
  isTrialEnd: boolean;
}

/** Every charge in the next 90 days, including repeats of monthly and weekly plans. */
function occurrences(subs: Subscription[]): Occurrence[] {
  const today = toDay(new Date());
  const end = addDays(today, HORIZON_DAYS);
  const out: Occurrence[] = [];
  for (const sub of activeSubs(subs)) {
    let day = chargeDay(sub);
    let first = true;
    while (day <= end) {
      if (day >= today) out.push({ day, sub, isTrialEnd: first && sub.status === 'trial' });
      day = addCycle(day, sub.cycle);
      first = false;
    }
  }
  return out.sort((a, b) => a.day.localeCompare(b.day));
}

export default function Calendar() {
  const subscriptions = useAppStore((s) => s.subscriptions);
  const items = occurrences(subscriptions);

  const months = new Map<string, Occurrence[]>();
  for (const o of items) {
    const key = format(fromDay(o.day), 'MMMM yyyy');
    months.set(key, [...(months.get(key) ?? []), o]);
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Txt weight="extrabold" size={24}>
          Calendar
        </Txt>
        {items.length === 0 ? (
          <Txt color={colors.muted}>Nothing will be charged in the next 90 days.</Txt>
        ) : null}
        {[...months.entries()].map(([month, list]) => (
          <View key={month} style={{ gap: 10 }}>
            <View style={styles.monthHead}>
              <Txt weight="bold" size={16}>
                {month}
              </Txt>
              <Txt size={13} color={colors.muted}>
                {formatINR(list.reduce((sum, o) => sum + o.sub.amountPaise, 0))}
              </Txt>
            </View>
            <Card style={{ paddingVertical: 4 }}>
              {list.map((o, i) => (
                <Pressable
                  key={`${o.sub.id}-${o.day}`}
                  onPress={() => router.push(`/subscription/${o.sub.id}`)}
                  style={[styles.row, i < list.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}
                >
                  <View style={styles.date}>
                    <Txt weight="extrabold" size={16}>
                      {format(fromDay(o.day), 'd')}
                    </Txt>
                    <Txt size={11} color={colors.muted}>
                      {format(fromDay(o.day), 'EEE')}
                    </Txt>
                  </View>
                  <AppBadge name={o.sub.name} size={32} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt weight="semibold">{o.sub.name}</Txt>
                    {o.isTrialEnd ? <Pill tone="amber" label="Trial ends" /> : null}
                  </View>
                  <Txt weight="bold">{formatINR(o.sub.amountPaise)}</Txt>
                </Pressable>
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 20 },
  monthHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  date: { width: 36, alignItems: 'center' },
});
