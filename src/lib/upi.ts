import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

import type { UpiApp } from './types';

interface UpiAppInfo {
  id: UpiApp;
  name: string;
  /**
   * URL schemes to try, in order. TEAM TODO (Sprint 2): confirm each one on a
   * real iPhone and Android phone and delete the ones that don't open the app.
   */
  schemes: string[];
  androidPackage: string | null;
  /** Steps shown on the cancel guide. Keep them short; wording differs between app versions. */
  steps: { title: string; detail: string }[];
}

export const UPI_APPS: Record<UpiApp, UpiAppInfo> = {
  gpay: {
    id: 'gpay',
    name: 'Google Pay',
    schemes: ['gpay://', 'tez://'],
    androidPackage: 'com.google.android.apps.nbu.paisa.user',
    steps: [
      { title: 'Open Google Pay and go to your profile', detail: 'Tap your profile photo' },
      { title: 'Find the AutoPay section', detail: 'It may be called AutoPay or Mandates' },
      { title: 'Pick the subscription and cancel', detail: 'Confirm with your UPI PIN inside Google Pay' },
    ],
  },
  phonepe: {
    id: 'phonepe',
    name: 'PhonePe',
    schemes: ['phonepe://'],
    androidPackage: 'com.phonepe.app',
    steps: [
      { title: 'Open PhonePe and go to your profile', detail: 'Tap your profile icon' },
      { title: 'Find the AutoPay section', detail: 'It may be called AutoPay or Mandates' },
      { title: 'Pick the subscription and cancel', detail: 'Confirm with your UPI PIN inside PhonePe' },
    ],
  },
  paytm: {
    id: 'paytm',
    name: 'Paytm',
    schemes: ['paytmmp://', 'paytm://'],
    androidPackage: 'net.one97.paytm',
    steps: [
      { title: 'Open Paytm and search for "AutoPay"', detail: 'Use the search bar on the home screen' },
      { title: 'Open your active AutoPay list', detail: 'It may be called Automatic Payments or Mandates' },
      { title: 'Pick the subscription and cancel', detail: 'Confirm with your UPI PIN inside Paytm' },
    ],
  },
  other: {
    id: 'other',
    name: 'your UPI app',
    schemes: [],
    androidPackage: null,
    steps: [
      { title: 'Open the UPI app you paid with', detail: 'The one you used when you started the trial' },
      { title: 'Find AutoPay or Mandates', detail: 'Usually in your profile or settings' },
      { title: 'Pick the subscription and cancel', detail: 'Confirm with your UPI PIN inside that app' },
    ],
  },
};

export const UPI_APP_CHOICES: UpiApp[] = ['gpay', 'phonepe', 'paytm', 'other'];

export const UPI_SHORT_NAME: Record<UpiApp, string> = {
  gpay: 'Google Pay',
  phonepe: 'PhonePe',
  paytm: 'Paytm',
  other: 'Other',
};

/**
 * Tries to open the UPI app. Returns false when nothing could be opened, so the
 * screen can tell the user to open it themselves.
 */
export async function openUpiApp(app: UpiApp): Promise<boolean> {
  const info = UPI_APPS[app];
  for (const scheme of info.schemes) {
    try {
      await Linking.openURL(scheme);
      return true;
    } catch {
      // Try the next scheme.
    }
  }
  if (Platform.OS === 'android' && info.androidPackage) {
    try {
      await Linking.openURL(`market://details?id=${info.androidPackage}`);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
