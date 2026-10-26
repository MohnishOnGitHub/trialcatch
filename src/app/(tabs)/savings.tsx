import { format } from 'date-fns';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBadge, Card, Pill, Txt } from '@/components/ui';
import { formatINR } from '@/lib/money';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';

const ACTION_LABEL = { keep: 'Kept', cancel: 'Cancelled', snooze: 'Snoozed' } as const;

export default function Savings() {
  const decisions = useAppStore((s) => s.decisions);
  const saved = decisions.reduce((sum, d) => sum + d.savedPaise, 0);
  const cancelled = decisions.filter((d) => d.action === 'cancel').length;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Txt weight="extrabold" size={24}>
          Savings
        </Txt>

        <View style={styles.hero}>
          <Txt size={13} color={colors.primaryBorder}>
            Saved by cancelling before the charge
          </Txt>
          <Txt weight="extrabold" size={38} color="#FFFFFF">
            {formatINR(saved)}
          </Txt>
          <Txt size={13} color={colors.mint}>
            {cancelled === 1 ? '1 trial caught' : `${cancelled} trials caught`}
          </Txt>
        </View>

        <View style={{ gap: 10 }}>
          <Txt weight="bold" size={16}>
            History
          </Txt>
          {decisions.length === 0 ? (
            <Txt color={colors.muted}>Your keep and cancel decisions will show up here.</Txt>
          ) : (
            <Card style={{ paddingVertical: 4 }}>
              {decisions.map((d, i) => (
                <View key={d.id} style={[styles.row, i < decisions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
                  <AppBadge name={d.name} size={32} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt weight="semibold">{d.name}</Txt>
                    <Txt size={12} color={colors.muted}>
                      {format(new Date(d.createdAt), 'd MMM, h:mm a')}
                    </Txt>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Pill tone={d.action === 'cancel' ? 'green' : 'amber'} label={ACTION_LABEL[d.action]} />
                    {d.savedPaise > 0 ? (
                      <Txt weight="bold" size={13} color={colors.primary}>
                        +{formatINR(d.savedPaise)}
                      </Txt>
                    ) : null}
                  </View>
                </View>
              ))}
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 20 },
  hero: { backgroundColor: colors.primaryDark, borderRadius: 20, padding: 20, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
});
