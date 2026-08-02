import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from './context/AuthContext';
import { colors } from './theme/theme';

import LoginScreen from './screens/LoginScreen';
import ClientListScreen from './screens/ClientListScreen';
import ClientDetailScreen from './screens/ClientDetailScreen';
import ProjectLedgerScreen from './screens/ProjectLedgerScreen';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: colors.ink },
  headerTintColor: colors.white,
  headerTitleStyle: { fontWeight: '700' },
  headerShadowVisible: false
};

export default function Navigation() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink }}>
        <ActivityIndicator color={colors.steel} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={screenOptions}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="ClientList" component={ClientListScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="ClientDetail"
              component={ClientDetailScreen}
              options={({ route }) => ({ title: route.params.client.name })}
            />
            <Stack.Screen
              name="ProjectLedger"
              component={ProjectLedgerScreen}
              options={({ route }) => ({ title: route.params.project.project_name })}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
