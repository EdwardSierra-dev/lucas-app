/**
 * ProfileMenu — the user avatar/menu button shown in the dashboard header.
 *
 * Tapping it opens a small dropdown with two actions:
 *   • Editar perfil — opens a modal to set/change the display name
 *     (persisted via PATCH /users/me; the auth store updates immediately so
 *     the greeting re-renders without a reload).
 *   • Cerrar sesión — logs out (POST /auth/logout + clears local auth state)
 *     and redirects to the login screen.
 *
 * The dropdown and the edit form are rendered with the shared {@link Modal}
 * (dismissible via its "✕" / Android back). The button shows the user's
 * initial as a lightweight avatar.
 */
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Colors, TouchTarget, Typography } from '../../constants/theme';
import { EditProfileForm } from '../forms/EditProfileForm';
import { useLogout } from '../../services/authApi';
import { useUpdateProfile } from '../../services/userApi';
import { useAuthStore } from '../../store/authStore';
import { Modal } from './Modal';

/** First letter of the name (fallback: email), uppercased, for the avatar. */
function initialFor(name?: string | null, email?: string): string {
  const source = (name && name.trim()) || email || '';
  return source.charAt(0).toUpperCase() || '?';
}

export function ProfileMenu(): React.JSX.Element {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const updateProfile = useUpdateProfile();

  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const openEdit = (): void => {
    setMenuOpen(false);
    updateProfile.reset();
    setEditOpen(true);
  };

  const handleSaveName = (displayName: string): void => {
    updateProfile.mutate(
      { displayName },
      {
        onSuccess: () => {
          setEditOpen(false);
        },
      },
    );
  };

  const handleLogout = (): void => {
    setMenuOpen(false);
    // Clear state (useLogout clears on both success and error) then leave the
    // authenticated area. `replace` drops the tabs route from history so the
    // Back gesture cannot return to the dashboard without re-authenticating.
    logout.mutate(undefined, {
      onSettled: () => {
        router.replace('/(auth)/login');
      },
    });
  };

  const saveError =
    updateProfile.isError && !updateProfile.isPending
      ? 'No se pudo guardar el nombre. Inténtalo de nuevo.'
      : undefined;

  return (
    <View>
      <TouchableOpacity
        onPress={() => setMenuOpen(true)}
        accessibilityLabel="Menú de perfil"
        accessibilityRole="button"
        accessibilityHint="Abre opciones de perfil y cierre de sesión"
        style={styles.avatar}
        testID="profile-menu-button"
      >
        <Text style={styles.avatarText}>
          {initialFor(user?.displayName, user?.email)}
        </Text>
      </TouchableOpacity>

      {/* Dropdown menu */}
      <Modal visible={menuOpen} onClose={() => setMenuOpen(false)}>
        <View accessibilityRole="menu">
          {user?.email ? (
            <Text style={styles.menuEmail} numberOfLines={1}>
              {user.email}
            </Text>
          ) : null}

          <TouchableOpacity
            onPress={openEdit}
            accessibilityLabel="Editar perfil"
            accessibilityRole="menuitem"
            style={styles.menuItem}
          >
            <Text style={styles.menuItemText}>Editar perfil</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            accessibilityLabel="Cerrar sesión"
            accessibilityRole="menuitem"
            style={styles.menuItem}
            testID="logout-button"
          >
            <Text style={[styles.menuItemText, styles.menuItemDanger]}>
              Cerrar sesión
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Edit profile modal */}
      <Modal visible={editOpen} onClose={() => setEditOpen(false)}>
        <EditProfileForm
          onSubmit={handleSaveName}
          submitting={updateProfile.isPending}
          initialName={user?.displayName ?? ''}
          submitError={saveError}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: TouchTarget.minWidth,
    height: TouchTarget.minHeight,
    borderRadius: TouchTarget.minWidth / 2,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  avatarText: {
    ...Typography.H2,
    color: Colors.background,
  } as TextStyle,
  menuEmail: {
    ...Typography.Caption,
    marginBottom: 8,
  } as TextStyle,
  menuItem: {
    minHeight: TouchTarget.minHeight,
    justifyContent: 'center',
  } as ViewStyle,
  menuItemText: {
    ...Typography.Body,
    fontWeight: '600',
  } as TextStyle,
  menuItemDanger: {
    color: Colors.accent,
  } as TextStyle,
});
