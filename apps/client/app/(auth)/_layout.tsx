/**
 * Auth group layout (Requirement 1 — Auth_Service flows).
 *
 * A headerless Stack hosting the login and register screens. Navigation into
 * and out of this group is driven by `app/index.tsx` (unauthenticated →
 * `(auth)/login`) and the auth screens themselves on success.
 */
import { Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
