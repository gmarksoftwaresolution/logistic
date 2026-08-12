import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LanguageScreen from '../screens/LanguageScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ApprovalPendingScreen from '../screens/ApprovalPendingScreen';
import GetStartedScreen from '../screens/GetStartedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MainTabNavigator from './MainTabNavigator';
import { PickupScannerScreen } from '../screens/OrderManagement/PickupScannerScreen';
import { Colors } from '../constants/Colors';

export type RootStackParamList = {
  GetStarted: undefined;
  Language: { fromProfile?: boolean } | undefined;
  Login: undefined;
  SignUp: undefined;
  ApprovalPending: { transporterUniqueId?: string; requestId?: string } | undefined;
  Main: undefined;
  Profile: undefined;
  PickupScanner: { sessionId?: string; orderIds?: string[] } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const AppNavigator = () => {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    async function checkAuthStatus() {
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (token) {
          setInitialRoute('Main');
        } else {
          setInitialRoute('GetStarted');
        }
      } catch (e) {
        setInitialRoute('GetStarted');
      }
    }
    checkAuthStatus();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#181D27' }}>
        <ActivityIndicator size="large" color={Colors.primary || '#10B981'} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="GetStarted" component={GetStartedScreen} />
        <Stack.Screen name="Language" component={LanguageScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="ApprovalPending" component={ApprovalPendingScreen} />
        <Stack.Screen name="Main" component={MainTabNavigator} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="PickupScanner" component={PickupScannerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
