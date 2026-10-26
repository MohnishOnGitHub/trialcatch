# TrialCatch

Catches free trials and UPI AutoPay mandates before they charge you. HUM 4342 Design Thinking project.

The app runs in **Expo Go** on iPhone and Android: no App Store or Play Store account needed, and nothing leaves the phone.

## Run it on your phone

You need [Node.js 22 LTS](https://nodejs.org) on your laptop and the **Expo Go** app on your phone (App Store / Play Store).

```bash
git clone https://github.com/MohnishOnGitHub/trialcatch.git
cd trialcatch
npm install
npx expo start
```

Then scan the QR code in the terminal: with the **Camera** app on iPhone, or from inside **Expo Go** on Android. Your phone and laptop must be on the same WiFi. On college WiFi that blocks this, use `npx expo start --tunnel`.

First run: tap **Allow notifications**, then **Load sample data** on Home to see the app with believable data. In **Settings → Send a test reminder** you get a reminder after 5 seconds; lock the phone to see it.

## What works today

| Screen | What it does |
| --- | --- |
| Onboarding | Privacy promise, asks for notification permission |
| Home | Monthly recurring total, "charging soon" (next 7 days), everything else |
| Add a trial | App search with suggestions, amount, cycle, trial end or next charge, UPI app |
| Paste an SMS | Paste a bank AutoPay SMS; the parser fills in app, amount, cycle, UMN and flags what to check. Matching UMN updates the existing subscription |
| Keep or cancel | Opened from a reminder: amount, yearly cost, "used it lately?", keep, cancel, remind me tonight |
| Cancel guide | 3 steps for the right UPI app, opens it, asks "did you cancel?" when you come back |
| Calendar | Every charge in the next 90 days, grouped by month |
| Savings | Total saved by cancelling, decision history |
| Settings | Notification status, test reminder, sample data, delete all |

Reminders fire 2 days and 1 day before a charge at 7 pm, and at 9 am on the day. Because Expo Go has no background jobs, dates are rolled forward and reminders rescheduled every time the app opens.

## Project layout

```
src/
  app/              screens (Expo Router: every file is a route)
    (tabs)/         Home, Calendar, Savings, Settings + the centre "+" tab
    add.tsx, paste-sms.tsx, onboarding.tsx
    subscription/[id].tsx   Keep or cancel
    cancel/[id].tsx         Cancel guide
  components/       shared UI (buttons, chips, cards, day picker)
  data/merchants.ts merchant catalog (names, SMS aliases, prices)
  db/               SQLite schema migrations and queries
  detection/        SMS parser (pure TypeScript, unit tested)
  lib/              money, dates, UPI app links, summaries
  reminders/        reminder planning (pure) and expo-notifications wrapper
  store/            Zustand store: the app's state and actions
  theme.ts          colours and fonts from the design canvas
__tests__/          Jest tests
```

Money is always stored as integer **paise**. Dates are stored as `YYYY-MM-DD` calendar days.

## Commands

```bash
npm test            # unit tests (parser, reminders, money, dates)
npm run typecheck   # TypeScript
npm run lint        # ESLint
```

Install new libraries with `npx expo install <name>`, not `npm install`, so versions match the Expo SDK. Only libraries that ship inside Expo Go will work; check before adding anything with native code.

## Team TODOs

- [ ] **Real SMS fixtures (Sprint 3):** the SMS in `__tests__/detection/fixtures.ts` are synthetic. Replace them with real AutoPay SMS from our phones (mask names, account numbers and UMNs) and fix the parser until they pass.
- [ ] **Merchant prices:** fill `usualPricePaise` in `src/data/merchants.ts` from each app's current Indian pricing, and add SMS aliases we see in real messages.
- [ ] **UPI app links (Sprint 2):** check the URL schemes in `src/lib/upi.ts` open GPay, PhonePe and Paytm on a real iPhone and Android; also check the cancel steps match each app.
- [ ] **Sharing with EAS Update:** create a free Expo organization, add every teammate, then follow [Expo's EAS Update guide](https://docs.expo.dev/eas-update/getting-started/) so everyone can open the latest version in Expo Go without a laptop running.
- [ ] **Usability tests:** use Settings → Load sample data and Send a test reminder to set up each session.

## Privacy

No servers, no analytics, no SMS permission. The app keeps only the details it parsed from a pasted SMS, plus a short hash to spot duplicates, never the SMS text.
