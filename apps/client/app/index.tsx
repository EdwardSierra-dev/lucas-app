import { Redirect } from 'expo-router';
import React from 'react';

import { useAuthStore } from '../store/authStore';

/**
 * Root index — routes based on auth state. Authenticated users (including
 * those restored from persisted tokens on a cold start) land on the
 * dashboard; everyone else is sent to the login screen.
 */
export default function Index() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Redirect href={isAuthenticated ? '/(tabs)/dashboard' : '/(auth)/login'} />
  );
}
