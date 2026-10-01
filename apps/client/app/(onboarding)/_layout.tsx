/**
 * Onboarding group layout (Requirements 2, 3, 4 — expense + vehicle onboarding).
 *
 * A Stack hosting the three onboarding steps in order:
 *   mandatory-expenses → optional-expenses → vehicle-registration
 *
 * Each step advances the next via `router.push`/`replace` from inside the
 * screen. Headers show a Spanish title using the theme palette; the back
 * gesture lets users return to the previous step.
 */
import { Stack } from 'expo-router';
import React from 'react';

import { Colors } from '../../constants/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.text,
        headerTitleStyle: { color: Colors.text },
        headerBackTitle: 'Atrás',
      }}
    >
      <Stack.Screen
        name="mandatory-expenses"
        options={{ title: 'Gastos obligatorios' }}
      />
      <Stack.Screen
        name="optional-expenses"
        options={{ title: 'Gastos opcionales' }}
      />
      <Stack.Screen
        name="vehicle-registration"
        options={{ title: 'Registro de vehículo' }}
      />
    </Stack>
  );
}
