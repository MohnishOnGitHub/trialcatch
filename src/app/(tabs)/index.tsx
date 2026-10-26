import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBadge, Button, Card, Pill, Txt } from '@/components/ui';
import { daysUntil, relativeDay } from '@/lib/dates';
import { formatINR } from '@/lib/money';
import { activeSubs, chargingSoon, monthlyTotalPaise, trialCount } from '@/lib/summary';
import type { Subscription } from '@/lib/types';
import { UPI_SHORT_NAME } from '@/lib/upi';
import { chargeDay } from '@/reminders/plan';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';

function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function whenText(s: Subscription): string {
  const when = relativeDay(chargeDay(s));
  return s.status === 'trial' ? `Trial ends ${when.toLowerCase()}` : `Renews ${when.toLowerCase()}`;
}

export default function Home() {
  const subscriptions = useAppStore((s) => s.subscriptions);
  const decisions = useAppStore((s) => s.decisions);
  const loadSampleData = useAppStore((s) => s.loadSampleData);

  const active = activeSubs(subscriptions);
  const soon = chargingSoon(subscriptions);
  const soonIds = new Set(soon.map((s) => s.id));
  const others = active.filter((s) => !soonIds.has(s.id));
  const saved = decisions.reduce((sum, d) => sum + d.savedPaise, 0);

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View>
          <Txt size={13} color={colors.muted}>
            {greeting()}
          </Txt>
          <Txt weight="extrabold" size={24}>
            TrialCatch
          </Txt>
        </View>

        <View style={styles.hero}>
          <Txt size={13} color={colors.primaryBorder}>
            Recurring debits per month
          </Txt>
          <Txt weight="extrabold" size={38} color="#FFFFFF">
            {formatINR(monthlyTotalPaise(subscriptions))}
          </Txt>
          <View style={styles.pills}>
            <Pill tone="dark" label={`${active.length} active`} />
            <Pill tone="dark" label={`${trialCount(subscriptions)} trials`} />
            {saved > 0 ? <Pill tone="green" label={`Saved ${formatINR(saved)}`} /> : null}
          </View>
        </View>

        {active.length === 0 ? (
          <Card style={{ gap: 12, padding: 18 }}>
            <Txt weight="bold" size={16}>
              No trials yet
            </Txt>
            <Txt color={colors.body} style={{ lineHeight: 21 }}>
              Add a trial you just started, or paste the AutoPay SMS your bank sent you. We will remind you before it charges.
            </Txt>
            <Button title="Add a trial" onPress={() => router.push('/add')} />
            <Button title="Paste an SMS" variant="secondary" onPress={() => router.push('/paste-sms')} />
            <Button title="Load sample data" variant="ghost" height={44} onPress={loadSampleData} />
          </Card>
        ) : null}

        {soon.length > 0 ? (
          <View style={{ gap: 10 }}>
            <View style={styles.sectionHead}>
              <Txt weight="bold" size={16}>
                Charging soon
              </Txt>
              <Txt size={12} color={colors.muted}>
                Next 7 days
              </Txt>
            </View>
            {soon.map((s) => {
              const urgent = daysUntil(chargeDay(s)) <= 2;
              return (
                <Pressable key={s.id} onPress={() => router.push(`/subscription/${s.id}`)}>
                  <Card style={[{ gap: 12 }, urgent && { borderColor: colors.dangerBorder }]}>
                    <SubRow sub={s} badge={urgent ? relativeDay(chargeDay(s)) : undefined} />
                    {urgent ? <Button title="Keep or cancel" variant="danger" height={44} onPress={() => router.push(`/subscription/${s.id}`)} /> : null}
                  </Card>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {others.length > 0 ? (
          <View style={{ gap: 10 }}>
            <Txt weight="bold" size={16}>
              Later
            </Txt>
            <Card style={{ paddingVertical: 4 }}>
              {others.map((s, i) => (
                <Pressable
                  key={s.id}
                  onPress={() => router.push(`/subscription/${s.id}`)}
                  style={[{ paddingVertical: 10 }, i < others.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}
                >
                  <SubRow sub={s} small />
                </Pressable>
              ))}
            </Card>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SubRow({ sub, badge, small }: { sub: Subscription; badge?: string; small?: boolean }) {
  return (
    <View style={styles.subRow}>
      <AppBadge name={sub.name} size={small ? 36 : 40} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt weight="bold" size={small ? 14 : 15}>
          {sub.name}
        </Txt>
        <Txt size={12} color={colors.muted}>
          {whenText(sub)} · {UPI_SHORT_NAME[sub.upiApp]}
        </Txt>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Txt weight="bold" size={small ? 14 : 15}>
          {formatINR(sub.amountPaise)}
        </Txt>
        {badge ? <Pill tone="red" label={badge} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 20 },
  hero: { backgroundColor: colors.primaryDark, borderRadius: 20, padding: 20, gap: 12 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
