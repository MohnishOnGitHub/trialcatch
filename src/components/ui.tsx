import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ColorValue, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';

import { badgePalette, colors, fonts } from '../theme';

type Weight = keyof typeof fonts;

export function Txt({
  weight = 'regular',
  size = 14,
  color = colors.ink,
  style,
  ...rest
}: TextProps & { weight?: Weight; size?: number; color?: string }) {
  return <Text {...rest} style={[{ fontFamily: fonts[weight], fontSize: size, color }, style]} />;
}

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: ColorValue | null }) {
  // Tab bars hand us React Native's wider colour type; Ionicons takes a string.
  return <Ionicons name={name} size={size} color={(color ?? colors.ink) as string} />;
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

const buttonColors: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: colors.primary, fg: '#FFFFFF', border: colors.primary },
  secondary: { bg: colors.card, fg: colors.ink, border: colors.borderStrong },
  danger: { bg: colors.danger, fg: '#FFFFFF', border: colors.danger },
  ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent' },
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  style,
  height = 52,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  height?: number;
}) {
  const c = buttonColors[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { height, backgroundColor: c.bg, borderColor: c.border, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <Txt weight="bold" size={16} color={c.fg}>
        {title}
      </Txt>
      {icon ? <Icon name={icon} size={18} color={c.fg} /> : null}
    </Pressable>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        selected
          ? { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primarySoft }
          : { borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.card },
        style,
      ]}
    >
      <Txt weight={selected ? 'bold' : 'semibold'} size={13} color={selected ? colors.primaryDark : colors.ink}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function Pill({ label, tone = 'green' }: { label: string; tone?: 'green' | 'red' | 'amber' | 'dark' }) {
  const t = {
    green: { bg: colors.primarySoft, fg: colors.primaryDark },
    red: { bg: colors.dangerSoft, fg: colors.dangerText },
    amber: { bg: colors.amberSoft, fg: colors.amberText },
    dark: { bg: 'rgba(255,255,255,0.12)', fg: '#FFFFFF' },
  }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: t.bg }]}>
      <Txt weight="bold" size={12} color={t.fg}>
        {label}
      </Txt>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function AppBadge({ name, size = 40 }: { name: string; size?: number }) {
  const words = name.replace(/[^A-Za-z0-9 ]/g, ' ').split(' ').filter(Boolean);
  const letters = (words.length >= 2 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2)).toUpperCase();
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const c = badgePalette[h % badgePalette.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Txt weight="extrabold" size={size * 0.35} color={c.fg}>
        {letters.slice(0, 2)}
      </Txt>
    </View>
  );
}

export function Header({ title, right, onBack }: { title?: string; right?: ReactNode; onBack?: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
        style={styles.back}
      >
        <Icon name="chevron-back" size={24} />
      </Pressable>
      {title ? (
        <Txt weight="extrabold" size={20} style={{ flex: 1 }}>
          {title}
        </Txt>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {right}
    </View>
  );
}

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return (
    <Txt weight="semibold" size={13} color={colors.body} style={style}>
      {children}
    </Txt>
  );
}

export function Row({ label, value, last }: { label: string; value: ReactNode; last?: boolean }) {
  return (
    <View style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}>
      <Txt color={colors.muted}>{label}</Txt>
      {typeof value === 'string' ? (
        <Txt weight="semibold" numberOfLines={1} ellipsizeMode="middle" style={{ flexShrink: 1, textAlign: 'right' }}>
          {value}
        </Txt>
      ) : (
        value
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  chip: { minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 48 },
  back: { width: 44, height: 44, marginLeft: -10, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, gap: 12 },
});
