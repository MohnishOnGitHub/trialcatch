import { Pressable, StyleSheet, View } from 'react-native';

import { addDays, longDay, toDay } from '../lib/dates';
import type { DayString } from '../lib/types';
import { colors } from '../theme';
import { Chip, Icon, Txt } from './ui';

const PRESETS = [7, 14, 30];

/**
 * Picks a day with quick presets ("7 days") plus a − / + stepper, so we don't
 * need a native date picker. Only future days can be chosen.
 */
export function DayPicker({ value, onChange }: { value: DayString; onChange: (day: DayString) => void }) {
  const today = toDay(new Date());
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.grid}>
        {PRESETS.map((d) => (
          <Chip key={d} label={`${d} days`} selected={value === addDays(today, d)} onPress={() => onChange(addDays(today, d))} style={styles.cell} />
        ))}
      </View>
      <View style={styles.stepper}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="One day earlier"
          disabled={value <= today}
          onPress={() => onChange(addDays(value, -1))}
          style={[styles.step, value <= today && { opacity: 0.3 }]}
        >
          <Icon name="remove" />
        </Pressable>
        <Txt weight="bold" size={15}>
          {longDay(value)}
        </Txt>
        <Pressable accessibilityRole="button" accessibilityLabel="One day later" onPress={() => onChange(addDays(value, 1))} style={styles.step}>
          <Icon name="add" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: 4,
    height: 48,
  },
  step: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
