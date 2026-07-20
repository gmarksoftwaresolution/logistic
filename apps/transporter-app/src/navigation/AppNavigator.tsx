import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LanguageScreen from '../screens/LanguageScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ApprovalPendingScreen from '../screens/ApprovalPendingScreen';
import GetStartedScreen from '../screens/GetStartedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MainTabNavigator from './MainTabNavigator';
import { PickupScannerScreen } from '../screens/OrderManagement/PickupScannerScreen';
import { DropScannerScreen } from '../screens/OrderManagement/DropScannerScreen';

export type RootStackParamList = {
  GetStarted: undefined;
  Language: { fromProfile?: boolean } | undefined;
  Login: undefined;
  SignUp: undefined;
  ApprovalPending: { transporterUniqueId?: string; requestId?: string } | undefined;
  Main: undefined;
  Profile: undefined;
  PickupScanner: { sessionId?: string; orderIds?: string[] } | undefined;
  DropScanner: { sessionId?: string; orderIds?: string[] } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator initialRouteName="GetStarted" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="GetStarted" component={GetStartedScreen} />
        <Stack.Screen name="Language" component={LanguageScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="ApprovalPending" component={ApprovalPendingScreen} />
        <Stack.Screen name="Main" component={MainTabNavigator} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="PickupScanner" component={PickupScannerScreen} />
        <Stack.Screen name="DropScanner" component={DropScannerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
