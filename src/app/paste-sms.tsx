import * as Clipboard from 'expo-clipboard';
import { useSQLiteContext } from 'expo-sqlite';
import { router } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DayPicker } from '@/components/DayPicker';
import { Button, Card, Chip, Header, Icon, Label, Pill, Txt } from '@/components/ui';
import { hasPastedSms, recordPastedSms } from '@/db/repo';
import { parseSms, type ParsedSms } from '@/detection/parseSms';
import { addCycle, addDays, longDay, toDay } from '@/lib/dates';
import { hashText } from '@/lib/hash';
import { parseRupeesToPaise } from '@/lib/money';
import type { Cycle, NewSubscription, Subscription, UpiApp } from '@/lib/types';
import { UPI_APP_CHOICES, UPI_SHORT_NAME } from '@/lib/upi';
import { useAppStore } from '@/store/useAppStore';
import { colors, fonts } from '@/theme';

const CYCLES: Cycle[] = ['weekly', 'monthly', 'quarterly', 'yearly'];

const KIND_LABEL: Record<ParsedSms['kind'], string> = {
  mandateCreated: 'New mandate',
  preDebit: 'Upcoming debit',
  debited: 'Money debited',
  revoked: 'Mandate cancelled',
  unknown: 'AutoPay SMS',
};

/** What saving will do when this SMS is about something we already track. */
function updateFor(existing: Subscription, parsed: ParsedSms): { label: string; next: NewSubscription } | null {
  const today = toDay(new Date());
  switch (parsed.kind) {
    case 'revoked':
      return { label: `Mark ${existing.name} as cancelled`, next: { ...existing, status: 'cancelled' } };
    case 'preDebit':
      if (!parsed.date) return null;
      return {
        label: `Set next charge to ${longDay(parsed.date)}`,
        next: { ...existing, nextChargeAt: parsed.date, trialEndAt: existing.status === 'trial' ? parsed.date : existing.trialEndAt },
      };
    case 'debited': {
      const paidOn = parsed.date ?? today;
      return {
        label: `Record the payment; next charge ${longDay(addCycle(paidOn, existing.cycle))}`,
        next: { ...existing, status: 'active', trialEndAt: null, nextChargeAt: addCycle(paidOn, existing.cycle) },
      };
    }
    default:
      return null;
  }
}

export default function PasteSms() {
  const db = useSQLiteContext();
  const subscriptions = useAppStore((s) => s.subscriptions);
  const add = useAppStore((s) => s.add);
  const update = useAppStore((s) => s.update);
  const confirmCancelled = useAppStore((s) => s.confirmCancelled);

  const today = toDay(new Date());
  const [text, setText] = useState('');
  const [name, setName] = useState<string | null>(null);
  const [amount, setAmount] = useState<string | null>(null);
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [upiApp, setUpiApp] = useState<UpiApp | null>(null);
  const [isTrial, setIsTrial] = useState(true);
  const [day, setDay] = useState(addDays(today, 7));
  const [duplicateHash, setDuplicateHash] = useState<string | null>(null);

  const parsed = useMemo(() => (text.trim() ? parseSms(text) : null), [text]);
  const existing = parsed?.umn ? subscriptions.find((s) => s.umn === parsed.umn) : undefined;
  const pendingUpdate = existing && parsed ? updateFor(existing, parsed) : null;
  const duplicate = !!text.trim() && duplicateHash === hashText(text);

  // Warn when this exact SMS was pasted before.
  useEffect(() => {
    if (!text.trim()) return;
    const hash = hashText(text);
    hasPastedSms(db, hash).then((seen) => {
      if (seen) setDuplicateHash(hash);
    });
  }, [db, text]);

  /** A fresh paste resets anything the user edited and picks sensible defaults. */
  const changeText = (value: string) => {
    setText(value);
    setName(null);
    setAmount(null);
    setCycle(null);
    setUpiApp(null);
    const next = value.trim() ? parseSms(value) : null;
    if (next?.kind === 'preDebit' && next.date) {
      setIsTrial(false);
      setDay(next.date);
    } else if (next?.kind === 'debited') {
      setIsTrial(false);
      setDay(addCycle(next.date ?? today, next.cycle ?? 'monthly'));
    } else {
      setIsTrial(true);
      setDay(addDays(today, 7));
    }
  };

  const pasteFromClipboard = async () => {
    const value = await Clipboard.getStringAsync();
    if (!value.trim()) {
      Alert.alert('Nothing copied', 'Open your SMS app, long press the AutoPay SMS, tap Copy, then come back.');
      return;
    }
    changeText(value);
  };

  const finalName = name ?? parsed?.merchantName ?? '';
  const finalAmount = amount ?? (parsed?.amountPaise != null ? String(parsed.amountPaise / 100) : '');
  const finalCycle = cycle ?? parsed?.cycle ?? 'monthly';
  const finalUpi = upiApp ?? parsed?.upiApp ?? 'other';
  const unsure = new Set(parsed?.unsure ?? []);

  const save = async () => {
    if (!parsed) return;
    const hash = hashText(text);
    if (existing && pendingUpdate) {
      if (parsed.kind === 'revoked') await confirmCancelled(existing.id);
      else await update(existing.id, pendingUpdate.next);
      await recordPastedSms(db, hash, existing.id);
      router.back();
      return;
    }
    const amountPaise = parseRupeesToPaise(finalAmount);
    if (!finalName.trim()) return Alert.alert('Which app is it?', 'We could not find the app name. Type it in.');
    if (amountPaise === null || amountPaise <= 0) return Alert.alert('How much will it charge?', 'Type the amount, like 119.');
    const sub: NewSubscription = {
      name: finalName.trim(),
      merchantId: parsed.merchant && parsed.merchant.name === finalName.trim() ? parsed.merchant.id : null,
      amountPaise,
      maxAmountPaise: parsed.isMaxAmount ? parsed.amountPaise : null,
      cycle: finalCycle,
      status: isTrial ? 'trial' : 'active',
      trialEndAt: isTrial ? day : null,
      nextChargeAt: day,
      upiApp: finalUpi,
      umn: parsed.umn,
      source: 'sms',
    };
    const id = await add(sub);
    await recordPastedSms(db, hash, id);
    router.back();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Header title="Paste an SMS" />

          <View style={{ gap: 8 }}>
            <Label>Copy the AutoPay SMS from your bank and paste it here</Label>
            <TextInput
              value={text}
              onChangeText={changeText}
              multiline
              placeholder="e.g. AutoPay mandate created for … max Rs … monthly … UMN …"
              placeholderTextColor={colors.muted}
              style={styles.textarea}
              textAlignVertical="top"
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable accessibilityRole="button" onPress={pasteFromClipboard} style={styles.smallButton}>
                <Icon name="clipboard-outline" size={16} />
                <Txt weight="bold" size={13}>
                  Paste from clipboard
                </Txt>
              </Pressable>
              {text ? (
                <Pressable accessibilityRole="button" onPress={() => changeText('')} style={styles.smallButton}>
                  <Txt weight="bold" size={13}>
                    Clear
                  </Txt>
                </Pressable>
              ) : null}
            </View>
          </View>

          {duplicate ? (
            <View style={styles.note}>
              <Icon name="information-circle-outline" size={18} color={colors.amberText} />
              <Txt size={13} color={colors.amberText} style={{ flex: 1 }}>
                You pasted this SMS before. Saving again may create a duplicate.
              </Txt>
            </View>
          ) : null}

          {parsed && !parsed.isAutoPay ? (
            <Card style={{ gap: 6 }}>
              <Txt weight="bold">This doesn’t look like an AutoPay SMS</Txt>
              <Txt color={colors.body} style={{ lineHeight: 20 }}>
                Look for an SMS from your bank that mentions AutoPay, mandate or UMN. You can also add the trial by hand.
              </Txt>
              <Button title="Add by hand instead" variant="secondary" height={44} onPress={() => router.replace('/add')} />
            </Card>
          ) : null}

          {parsed?.isAutoPay && existing && pendingUpdate ? (
            <Card style={{ gap: 10 }}>
              <View style={styles.cardHead}>
                <Txt weight="extrabold" size={15}>
                  Matches {existing.name}
                </Txt>
                <Pill label={KIND_LABEL[parsed.kind]} />
              </View>
              <Txt color={colors.body}>{pendingUpdate.label}.</Txt>
            </Card>
          ) : null}

          {parsed?.isAutoPay && existing && !pendingUpdate ? (
            <Card style={{ gap: 6 }}>
              <Txt weight="bold">Already tracking {existing.name}</Txt>
              <Txt color={colors.body}>This SMS doesn’t change anything we know.</Txt>
            </Card>
          ) : null}

          {parsed?.isAutoPay && !existing ? (
            <Card style={{ gap: 4, padding: 16 }}>
              <View style={[styles.cardHead, { paddingBottom: 8 }]}>
                <Txt weight="extrabold" size={15}>
                  We found
                </Txt>
                <Pill label={KIND_LABEL[parsed.kind]} />
              </View>

              <Field label="App" unsure={unsure.has('merchant') && name === null}>
                <TextInput value={finalName} onChangeText={setName} placeholder="App name" placeholderTextColor={colors.muted} style={styles.inlineInput} />
              </Field>
              <Field label={parsed.isMaxAmount ? 'Amount (up to)' : 'Amount'} unsure={unsure.has('amount') && amount === null}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                  <Txt weight="bold">₹</Txt>
                  <TextInput value={finalAmount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.muted} style={[styles.inlineInput, { minWidth: 60 }]} />
                </View>
              </Field>
              {parsed.umn ? (
                <Field label="Mandate ID (UMN)">
                  <Txt weight="semibold" size={13}>
                    {parsed.umn}
                  </Txt>
                </Field>
              ) : null}

              <View style={styles.block}>
                <View style={styles.fieldRow}>
                  <Txt color={colors.muted}>Charges every</Txt>
                  {unsure.has('cycle') && cycle === null ? <Pill tone="amber" label="Not in SMS, please pick" /> : null}
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {CYCLES.map((c) => (
                    <Chip key={c} label={c === 'monthly' ? 'Month' : c === 'weekly' ? 'Week' : c === 'quarterly' ? 'Quarter' : 'Year'} selected={finalCycle === c} onPress={() => setCycle(c)} style={{ flex: 1, paddingHorizontal: 4 }} />
                  ))}
                </View>
              </View>

              <View style={styles.block}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Chip label="Free trial" selected={isTrial} onPress={() => setIsTrial(true)} style={{ flex: 1 }} />
                  <Chip label="No trial" selected={!isTrial} onPress={() => setIsTrial(false)} style={{ flex: 1 }} />
                </View>
                <View style={styles.fieldRow}>
                  <Txt color={colors.muted}>{isTrial ? 'Trial ends' : 'Next charge'}</Txt>
                  {isTrial && parsed.kind === 'mandateCreated' ? <Pill tone="amber" label="Not in SMS, please pick" /> : null}
                </View>
                <DayPicker value={day} onChange={setDay} />
              </View>

              <View style={styles.block}>
                <View style={styles.fieldRow}>
                  <Txt color={colors.muted}>Paid with</Txt>
                  {upiApp === null ? <Pill tone="amber" label={parsed.upiApp ? 'Guess' : 'Please pick'} /> : null}
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {UPI_APP_CHOICES.map((a) => (
                    <Chip key={a} label={UPI_SHORT_NAME[a]} selected={finalUpi === a} onPress={() => setUpiApp(a)} style={{ flex: 1, paddingHorizontal: 2 }} />
                  ))}
                </View>
              </View>
            </Card>
          ) : null}

          {parsed?.isAutoPay ? (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <Icon name="lock-closed-outline" size={16} color={colors.muted} />
              <Txt size={12} color={colors.muted} style={{ flex: 1 }}>
                We keep only these details, never the SMS text.
              </Txt>
            </View>
          ) : null}

          {parsed?.isAutoPay && (!existing || pendingUpdate) ? (
            <Button title={existing ? 'Update' : isTrial ? 'Save trial' : 'Save subscription'} onPress={save} />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, unsure, children }: { label: string; unsure?: boolean; children: ReactNode }) {
  return (
    <View style={[styles.fieldRow, styles.fieldLine]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Txt color={colors.muted}>{label}</Txt>
        {unsure ? <Pill tone="amber" label="Check" /> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40, gap: 16 },
  textarea: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 14,
    backgroundColor: colors.card,
    padding: 14,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  smallButton: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  note: { flexDirection: 'row', gap: 8, backgroundColor: colors.amberBg, borderColor: colors.amberBorder, borderWidth: 1, borderRadius: 12, padding: 12 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  fieldLine: { borderTopWidth: 1, borderTopColor: colors.divider, minHeight: 48 },
  block: { borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 12, marginTop: 4, gap: 8 },
  inlineInput: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, textAlign: 'right', minWidth: 140, paddingVertical: 8 },
});
