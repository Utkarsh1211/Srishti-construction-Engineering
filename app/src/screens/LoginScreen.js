import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Image
} from 'react-native';

import { colors, spacing, radii, type } from '../theme/theme';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Enter both username and password');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(username.trim(), password);
    } catch (e) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Branding */}
        <View style={styles.brand}>
          <View style={styles.brandMark}>
            <Image
              source={require('../../assets/sce.png')}
              style={styles.logo}
              resizeMode="contain"
            />
</View>

          <Text style={styles.brandTitle}>
            Srishti Construction
          </Text>

          <Text style={styles.brandSubtitle}>
            & Engineering
          </Text>
        </View>

        {/* Login Form */}
        <View style={styles.form}>
          <View style={styles.formHeader}>
            <Text style={styles.welcomeText}>Welcome back</Text>

            <Text style={styles.formSubtitle}>
              Sign in to continue
            </Text>
          </View>

          <Text style={styles.fieldLabel}>USERNAME</Text>

          <TextInput
            style={styles.input}
            value={username}
            onChangeText={(value) => {
              setUsername(value);
              if (error) setError('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Enter your username"
            placeholderTextColor={colors.ink40}
            returnKeyType="next"
            editable={!loading}
          />

          <Text style={styles.fieldLabel}>PASSWORD</Text>

          <TextInput
            style={styles.input}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (error) setError('');
            }}
            secureTextEntry
            placeholder="Enter your password"
            placeholderTextColor={colors.ink40}
            returnKeyType="go"
            onSubmitEditing={handleLogin}
            editable={!loading}
          />

          {!!error && (
            <Text style={styles.error}>
              {error}
            </Text>
          )}

          <TouchableOpacity
            style={[
              styles.button,
              loading && styles.buttonDisabled
            ]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>
                Log in
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ink
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl
  },

  /* ================= BRAND ================= */

  brand: {
    alignItems: 'center',
    marginBottom: spacing.xl
  },

  brandMark: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg
  },
  logo: {
  width: 72,
  height: 72
},

  brandMarkText: {
    color: colors.ink,
    fontWeight: '700',
    fontSize: 22
  },

  brandTitle: {
    color: colors.gold,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center'
  },

  brandSubtitle: {
    color: colors.gold,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2
  },

  /* ================= FORM ================= */

  form: {
    backgroundColor: colors.inkLight,
    borderRadius: radii.lg,
    padding: spacing.lg
  },

  formHeader: {
    marginBottom: spacing.md
  },

  welcomeText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: '700'
  },

  formSubtitle: {
    color: colors.ink40,
    fontSize: 13,
    marginTop: 4
  },

  fieldLabel: {
    ...type.label,
    color: colors.ink40,
    marginBottom: spacing.xs,
    marginTop: spacing.md
  },

  input: {
    backgroundColor: colors.ink,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.white,
    fontSize: 16
  },

  error: {
    color: '#E8836A',
    marginTop: spacing.md,
    fontSize: 13
  },

  button: {
    backgroundColor: colors.steel,
    borderRadius: radii.sm,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: spacing.lg
  },

  buttonDisabled: {
    opacity: 0.65
  },

  buttonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16
  }
});