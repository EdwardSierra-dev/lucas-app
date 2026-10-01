/**
 * Main tab navigator (Requirements 8.1, 8.2 — palette + touch targets).
 *
 * Hosts the five authenticated sections of the app:
 *   Dashboard (dashboard) · Gastos (expenses) · Préstamos (loans) ·
 *   Métricas (metrics) · Presupuesto (shared-budget)
 *
 * Icons are plain emoji wrapped in <Text> to avoid pulling in an icon
 * dependency. The active tint uses the lavender primary; inactive uses the
 * slate text color (Req 8.1). The `dashboard` screen file is owned by task
 * 22.2 and is referenced here by route name only.
 */
import { Tabs } from 'expo-router';
import React from 'react';
import { Text } from 'react-native';

import { Colors } from '../../constants/theme';

/** Render a tab bar emoji icon, dimmed when the tab is inactive. */
function tabIcon(emoji: string) {
  return function TabIcon({ focused }: { focused: boolean }) {
    return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.6 }}>{emoji}</Text>;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.text,
        tabBarStyle: { backgroundColor: Colors.background },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Dashboard', tabBarIcon: tabIcon('🏠') }}
      />
      <Tabs.Screen
        name="expenses"
        options={{ title: 'Gastos', tabBarIcon: tabIcon('💸') }}
      />
      <Tabs.Screen
        name="loans"
        options={{ title: 'Préstamos', tabBarIcon: tabIcon('🤝') }}
      />
      <Tabs.Screen
        name="metrics"
        options={{ title: 'Métricas', tabBarIcon: tabIcon('📊') }}
      />
      <Tabs.Screen
        name="shared-budget"
        options={{ title: 'Presupuesto', tabBarIcon: tabIcon('👫') }}
      />
    </Tabs>
  );
}
