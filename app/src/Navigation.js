import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from './context/AuthContext';
import { colors } from './theme/theme';

import LoginScreen from './screens/LoginScreen';
import ProjectListScreen from './screens/ProjectListScreen';
import ProjectLedgerScreen from './screens/ProjectLedgerScreen';
import BudgetCalculatorScreen from './screens/BudgetCalculatorScreen';

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
            <Stack.Screen name="ProjectList" component={ProjectListScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="ProjectLedger"
              component={ProjectLedgerScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="BudgetCalculator"
              component={BudgetCalculatorScreen}
              options={{ title: 'Monthly Budget', headerShown: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
