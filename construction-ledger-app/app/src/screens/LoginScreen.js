import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { colors, spacing, radii, type } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';

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
      const res = await api.login(username.trim(), password);
      await login(res.user);
    } catch (e) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.brand}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>CL</Text>
        </View>
        <Text style={type.display}>Site Ledger</Text>
        <Text style={styles.tagline}>Track every rupee, every project.</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.fieldLabel}>USERNAME</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="e.g. admin"
          placeholderTextColor={colors.ink40}
        />

        <Text style={styles.fieldLabel}>PASSWORD</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={colors.ink40}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.buttonText}>Log in</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.ink,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl
  },
  brand: { alignItems: 'center', marginBottom: spacing.xxl },
  brandMark: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    backgroundColor: colors.steel,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md
  },
  brandMarkText: { color: colors.white, fontWeight: '700', fontSize: 20 },
  tagline: { color: colors.ink40, marginTop: spacing.xs, fontSize: 13 },
  form: { backgroundColor: colors.inkLight, borderRadius: radii.lg, padding: spacing.lg },
  fieldLabel: { ...type.label, color: colors.ink40, marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    backgroundColor: colors.ink,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.white,
    fontSize: 15
  },
  error: { color: '#E8836A', marginTop: spacing.md, fontSize: 13 },
  button: {
    backgroundColor: colors.steel,
    borderRadius: radii.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.lg
  },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 15 }
});
