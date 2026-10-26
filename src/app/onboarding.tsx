import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Icon, Txt } from '@/components/ui';
import { requestPermission } from '@/reminders/notifications';
import { useAppStore } from '@/store/useAppStore';
import { colors } from '@/theme';

const PROMISES = [
  'No SMS access: you choose which SMS to paste',
  'Everything stays on your phone',
  'We never move money or ask for your UPI PIN',
];

export default function Onboarding() {
  const finishOnboarding = useAppStore((s) => s.finishOnboarding);
  const refresh = useAppStore((s) => s.refresh);

  const finish = async (askForNotifications: boolean) => {
    if (askForNotifications) await requestPermission().catch(() => false);
    await finishOnboarding();
    await refresh();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.screen}>
      <Txt weight="extrabold" size={18}>
        TrialCatch
      </Txt>

      <View style={styles.hero}>
        <View style={styles.notification}>
          <View style={styles.logo}>
            <Txt weight="extrabold" size={12} color="#FFFFFF">
              TC
            </Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt weight="bold" size={13}>
              Spotify trial converts tomorrow
            </Txt>
            <Txt size={12} color={colors.muted}>
              ₹119 will be charged. Keep it?
            </Txt>
          </View>
        </View>
        <View style={styles.tag}>
          <Txt weight="bold" size={13} color={colors.primaryDark}>
            2 days and 1 day before
          </Txt>
        </View>
      </View>

      <View style={{ gap: 10 }}>
        <Txt weight="extrabold" size={28} style={{ lineHeight: 33 }}>
          Get a nudge before any trial charges you
        </Txt>
        <Txt size={15} color={colors.body} style={{ lineHeight: 22 }}>
          Allow notifications so your reminders actually reach you. That’s the only permission TrialCatch needs.
        </Txt>
      </View>

      <Card style={{ gap: 12, padding: 16 }}>
        {PROMISES.map((p) => (
          <View key={p} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Icon name="checkmark" color={colors.primary} />
            <Txt size={14} style={{ flex: 1 }}>
              {p}
            </Txt>
          </View>
        ))}
      </Card>

      <View style={{ marginTop: 'auto', gap: 10 }}>
        <Button title="Allow notifications" onPress={() => finish(true)} />
        <Button title="Not now" variant="ghost" height={48} onPress={() => finish(false)} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, gap: 24, backgroundColor: colors.bg },
  hero: { height: 200, borderRadius: 24, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  notification: {
    width: 270,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    transform: [{ rotate: '-3deg' }],
  },
  logo: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  tag: { position: 'absolute', right: 20, bottom: 20, backgroundColor: colors.mint, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
});
