import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DayPicker } from '@/components/DayPicker';
import { AppBadge, Button, Card, Chip, Header, Icon, Label, Txt } from '@/components/ui';
import { MERCHANTS, merchantById, searchMerchants, type Merchant } from '@/data/merchants';
import { addDays, CYCLE_LABEL, longDay, toDay } from '@/lib/dates';
import { formatINR, parseRupeesToPaise } from '@/lib/money';
import type { Cycle, NewSubscription, UpiApp } from '@/lib/types';
import { UPI_APP_CHOICES, UPI_SHORT_NAME } from '@/lib/upi';
import { useAppStore } from '@/store/useAppStore';
import { colors, fonts } from '@/theme';

const CYCLES: Cycle[] = ['weekly', 'monthly', 'quarterly', 'yearly'];

export default function AddTrial() {
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id ? Number(params.id) : null;
  const existing = useAppStore((s) => s.subscriptions.find((x) => x.id === editingId));
  const add = useAppStore((s) => s.add);
  const update = useAppStore((s) => s.update);

  const today = toDay(new Date());
  const [name, setName] = useState(existing?.name ?? '');
  const [merchant, setMerchant] = useState<Merchant | null>(merchantById(existing?.merchantId ?? null));
  const [amount, setAmount] = useState(existing ? String(existing.amountPaise / 100) : '');
  const [cycle, setCycle] = useState<Cycle>(existing?.cycle ?? 'monthly');
  const [isTrial, setIsTrial] = useState(existing ? existing.status === 'trial' : true);
  const [day, setDay] = useState(existing ? (existing.trialEndAt ?? existing.nextChargeAt) : addDays(today, 7));
  const [upiApp, setUpiApp] = useState<UpiApp>(existing?.upiApp ?? 'gpay');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = name && showSuggestions ? searchMerchants(name) : [];

  const pick = (m: Merchant) => {
    setMerchant(m);
    setName(m.name);
    if (m.usualPricePaise && !amount) setAmount(String(m.usualPricePaise / 100));
    setShowSuggestions(false);
  };

  const save = async () => {
    const amountPaise = parseRupeesToPaise(amount);
    if (!name.trim()) return Alert.alert('Which app is it?', 'Type the app or service name.');
    if (amountPaise === null || amountPaise <= 0) return Alert.alert('How much will it charge?', 'Enter the amount after the trial, like 119.');
    const sub: NewSubscription = {
      name: name.trim(),
      merchantId: merchant?.name === name.trim() ? merchant.id : null,
      amountPaise,
      maxAmountPaise: existing?.maxAmountPaise ?? null,
      cycle,
      status: isTrial ? 'trial' : 'active',
      trialEndAt: isTrial ? day : null,
      nextChargeAt: day,
      upiApp,
      umn: existing?.umn ?? null,
      source: existing?.source ?? 'manual',
    };
    if (editingId && existing) await update(editingId, { ...sub, status: existing.status === 'cancelled' ? 'cancelled' : sub.status });
    else await add(sub);
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Header
            title={editingId ? 'Edit' : 'Add a trial'}
            right={
              editingId ? null : (
                <Pressable accessibilityRole="button" onPress={() => router.replace('/paste-sms')} style={styles.pastePill}>
                  <Icon name="clipboard-outline" size={16} color={colors.primaryDark} />
                  <Txt weight="bold" size={13} color={colors.primaryDark}>
                    Paste SMS
                  </Txt>
                </Pressable>
              )
            }
          />

          <View style={styles.field}>
            <Label>App or service</Label>
            <View style={styles.inputBox}>
              <Icon name="search" size={18} color={colors.muted} />
              <TextInput
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  setShowSuggestions(true);
                }}
                placeholder={`e.g. ${MERCHANTS[6].name}`}
                placeholderTextColor={colors.muted}
                style={styles.input}
                autoCapitalize="words"
              />
            </View>
            {suggestions.length > 0 ? (
              <Card style={{ paddingVertical: 0, paddingHorizontal: 0 }}>
                {suggestions.map((m, i) => (
                  <Pressable
                    key={m.id}
                    onPress={() => pick(m)}
                    style={[styles.suggestion, i < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.divider }]}
                  >
                    <AppBadge name={m.name} size={32} />
                    <View style={{ flex: 1 }}>
                      <Txt weight="bold">{m.name}</Txt>
                      {m.usualPricePaise ? (
                        <Txt size={12} color={colors.muted}>
                          Usually {formatINR(m.usualPricePaise)} / month after trial
                        </Txt>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </Card>
            ) : null}
          </View>

          <View style={styles.field}>
            <Label>{isTrial ? 'Charge after the trial' : 'Amount per charge'}</Label>
            <View style={styles.inputBox}>
              <Txt size={16} color={colors.muted}>
                ₹
              </Txt>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="119"
                placeholderTextColor={colors.muted}
                keyboardType="decimal-pad"
                style={styles.input}
              />
              <Txt size={13} color={colors.muted}>
                per {CYCLE_LABEL[cycle]}
              </Txt>
            </View>
            <View style={styles.grid}>
              {CYCLES.map((c) => (
                <Chip key={c} label={c[0].toUpperCase() + c.slice(1)} selected={cycle === c} onPress={() => setCycle(c)} style={{ flex: 1 }} />
              ))}
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.grid}>
              <Chip label="Free trial" selected={isTrial} onPress={() => setIsTrial(true)} style={{ flex: 1 }} />
              <Chip label="Already paying" selected={!isTrial} onPress={() => setIsTrial(false)} style={{ flex: 1 }} />
            </View>
            <Label>{isTrial ? 'Trial ends' : 'Next charge'}</Label>
            <DayPicker value={day} onChange={setDay} />
            <Txt size={12} color={colors.muted}>
              {isTrial ? 'Converts' : 'Charges'} on {longDay(day)}. We remind you 2 days and 1 day before.
            </Txt>
          </View>

          <View style={styles.field}>
            <Label>Paid with</Label>
            <View style={styles.grid}>
              {UPI_APP_CHOICES.map((a) => (
                <Chip key={a} label={UPI_SHORT_NAME[a]} selected={upiApp === a} onPress={() => setUpiApp(a)} style={{ flex: 1, paddingHorizontal: 4 }} />
              ))}
            </View>
          </View>

          <Button title={editingId ? 'Save changes' : isTrial ? 'Save trial' : 'Save subscription'} onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 20 },
  field: { gap: 8 },
  inputBox: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 14,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  input: { flex: 1, fontFamily: fonts.medium, fontSize: 16, color: colors.ink, height: '100%' },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14 },
  grid: { flexDirection: 'row', gap: 8 },
  pastePill: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
