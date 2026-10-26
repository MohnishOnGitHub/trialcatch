import { Redirect, router } from 'expo-router';
import { Tabs } from 'expo-router/tabs';
import { View } from 'react-native';

import { Icon } from '@/components/ui';
import { useAppStore } from '@/store/useAppStore';
import { colors, fonts } from '@/theme';

export default function TabsLayout() {
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  if (!onboardingDone) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <Icon name="home-outline" color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="calendar"
        options={{ title: 'Calendar', tabBarIcon: ({ color }) => <Icon name="calendar-outline" color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="new"
        options={{
          title: '',
          tabBarAccessibilityLabel: 'Add a trial',
          tabBarIcon: () => (
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 10 }}>
              <Icon name="add" color="#FFFFFF" size={28} />
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/add');
          },
        }}
      />
      <Tabs.Screen
        name="savings"
        options={{ title: 'Savings', tabBarIcon: ({ color }) => <Icon name="wallet-outline" color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: ({ color }) => <Icon name="settings-outline" color={color} size={22} /> }}
      />
    </Tabs>
  );
}
