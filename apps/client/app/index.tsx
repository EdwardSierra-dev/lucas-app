import { Redirect } from 'expo-router';
import React from 'react';

/**
 * Root index — redirects unauthenticated users to the login screen.
 * Navigation logic for authenticated users and onboarding is handled
 * in app/_layout.tsx once auth state is available.
 */
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
